/**
 * HOLLY ARCHITECTURE GENERATION API - FIXED
 * 
 * Admin-only endpoint to trigger architecture generation post-deployment
 * This runs AFTER site is live, won't block builds
 * 
 * FIX #3: Removed hardcoded Clerk IDs, uses flexible admin detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { CodebaseParser } from '@/lib/metamorphosis/codebase-parser';
import { ArchitectureMapper } from '@/lib/metamorphosis/architecture-mapper';
import { DependencyGraphGenerator } from '@/lib/metamorphosis/dependency-graph';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max

interface GenerationStatus {
  status: 'running' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  startTime: Date;
  endTime?: Date;
  error?: string;
  results?: {
    architectureSnapshot: boolean;
    dependencyGraph: {
      nodes: number;
      edges: number;
    };
    codebaseKnowledge: {
      filesParsed: number;
      filesSaved: number;
    };
  };
}

// Global status tracker (in-memory, per instance)
let currentGeneration: GenerationStatus | null = null;

/**
 * Check if user is admin using multiple methods
 */
async function isUserAdmin(clerkUserId: string): Promise<boolean> {
  try {
    // Method 1: Check Clerk user metadata
    const user = await currentUser();
    
    // Check email domain
    const hasAdminEmail = user?.emailAddresses?.some(e => 
      e.emailAddress.endsWith('@nexamusicgroup.com')
    ) || false;
    
    // Check Clerk public metadata for admin role
    const hasAdminRole = (user?.publicMetadata as any)?.role === 'admin' || 
                        (user?.privateMetadata as any)?.role === 'admin' ||
                        (user?.unsafeMetadata as any)?.role === 'admin';
    
    if (hasAdminEmail || hasAdminRole) {
      return true;
    }
    
    // Method 2: Check database User model (if you have an isAdmin field)
    const dbUser = await prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true, email: true }
    });
    
    // Check if email ends with admin domain
    if (dbUser?.email?.endsWith('@nexamusicgroup.com')) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Admin check error:', error);
    return false;
  }
}

/**
 * GET - Get current generation status
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ STEP 1: Authenticate user
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // ✅ STEP 2: Check if user is admin
    const isAdmin = await isUserAdmin(clerkUserId);

    if (!isAdmin) {
      return NextResponse.json(
        { 
          error: 'Forbidden - Admin access required',
          hint: 'This feature requires an @nexamusicgroup.com email or admin role'
        },
        { status: 403 }
      );
    }

    // ✅ STEP 3: Return current status
    if (!currentGeneration) {
      return NextResponse.json({
        status: 'idle',
        message: 'No generation in progress',
        lastRun: null,
      });
    }

    return NextResponse.json({
      status: currentGeneration.status,
      progress: currentGeneration.progress,
      currentStep: currentGeneration.currentStep,
      startTime: currentGeneration.startTime,
      endTime: currentGeneration.endTime,
      error: currentGeneration.error,
      results: currentGeneration.results,
    });

  } catch (error) {
    console.error('❌ Architecture status API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch generation status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Trigger architecture generation
 */
export async function POST(request: NextRequest) {
  try {
    // ✅ STEP 1: Authenticate user
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in' },
        { status: 401 }
      );
    }

    // ✅ STEP 2: Check if user is admin
    const isAdmin = await isUserAdmin(clerkUserId);

    if (!isAdmin) {
      return NextResponse.json(
        { 
          error: 'Forbidden - Admin access required',
          hint: 'This feature requires an @nexamusicgroup.com email or admin role'
        },
        { status: 403 }
      );
    }

    // ✅ STEP 3: Check if generation is already running
    if (currentGeneration && currentGeneration.status === 'running') {
      return NextResponse.json({
        error: 'Architecture generation already in progress',
        status: currentGeneration,
      }, { status: 409 });
    }

    // ✅ STEP 4: Start generation (async, don't block response)
    const generationPromise = runArchitectureGeneration();

    // Return immediately with status
    return NextResponse.json({
      success: true,
      message: 'Architecture generation started',
      status: currentGeneration,
      checkStatusAt: '/api/admin/architecture/generate',
    }, { status: 202 });

  } catch (error) {
    console.error('❌ Architecture generation API error:', error);
    return NextResponse.json(
      { error: 'Failed to start architecture generation' },
      { status: 500 }
    );
  }
}

/**
 * Run architecture generation (async background task)
 */
async function runArchitectureGeneration(): Promise<void> {
  currentGeneration = {
    status: 'running',
    progress: 0,
    currentStep: 'Initializing...',
    startTime: new Date(),
  };

  try {
    // Step 1: Parse codebase
    currentGeneration.currentStep = 'Parsing codebase...';
    currentGeneration.progress = 10;
    
    const parser = new CodebaseParser();
    const codebaseData = await parser.parseProject(process.cwd());
    
    // Step 2: Generate dependency graph
    currentGeneration.currentStep = 'Generating dependency graph...';
    currentGeneration.progress = 40;
    
    const graphGen = new DependencyGraphGenerator();
    const dependencyGraph = await graphGen.generateGraph(codebaseData);
    
    // Step 3: Map architecture
    currentGeneration.currentStep = 'Mapping architecture...';
    currentGeneration.progress = 70;
    
    const mapper = new ArchitectureMapper();
    const architectureSnapshot = await mapper.generateSnapshot(codebaseData, dependencyGraph);
    
    // Step 4: Save to database
    currentGeneration.currentStep = 'Saving to database...';
    currentGeneration.progress = 90;
    
    await saveArchitectureData(codebaseData, dependencyGraph, architectureSnapshot);
    
    // Complete
    currentGeneration.status = 'completed';
    currentGeneration.progress = 100;
    currentGeneration.currentStep = 'Complete';
    currentGeneration.endTime = new Date();
    currentGeneration.results = {
      architectureSnapshot: true,
      dependencyGraph: {
        nodes: dependencyGraph.nodes?.length || 0,
        edges: dependencyGraph.edges?.length || 0,
      },
      codebaseKnowledge: {
        filesParsed: codebaseData.files?.length || 0,
        filesSaved: codebaseData.files?.length || 0,
      },
    };

    console.log('✅ Architecture generation completed successfully');

  } catch (error) {
    console.error('❌ Architecture generation failed:', error);
    currentGeneration.status = 'failed';
    currentGeneration.endTime = new Date();
    currentGeneration.error = error instanceof Error ? error.message : 'Unknown error';
  }
}

/**
 * Save architecture data to database
 */
async function saveArchitectureData(
  codebaseData: any,
  dependencyGraph: any,
  architectureSnapshot: any
): Promise<void> {
  try {
    // Save codebase knowledge
    if (codebaseData.files) {
      for (const file of codebaseData.files) {
        await prisma.codebaseKnowledge.upsert({
          where: { filePath: file.path },
          update: {
            content: file.content,
            language: file.language,
            functionCount: file.functions?.length || 0,
            classCount: file.classes?.length || 0,
            importCount: file.imports?.length || 0,
            complexity: file.complexity || 0,
            lastAnalyzed: new Date(),
          },
          create: {
            filePath: file.path,
            content: file.content,
            language: file.language,
            functionCount: file.functions?.length || 0,
            classCount: file.classes?.length || 0,
            importCount: file.imports?.length || 0,
            complexity: file.complexity || 0,
          },
        });
      }
    }

    // Save dependency graph
    await prisma.dependencyGraph.create({
      data: {
        graphData: dependencyGraph,
        nodeCount: dependencyGraph.nodes?.length || 0,
        edgeCount: dependencyGraph.edges?.length || 0,
        cycles: dependencyGraph.cycles || [],
        criticalPaths: dependencyGraph.criticalPaths || [],
      },
    });

    // Save architecture snapshot
    await prisma.architectureSnapshot.create({
      data: {
        snapshot: architectureSnapshot,
        timestamp: new Date(),
      },
    });

    console.log('✅ Architecture data saved to database');
  } catch (error) {
    console.error('❌ Failed to save architecture data:', error);
    throw error;
  }
}
