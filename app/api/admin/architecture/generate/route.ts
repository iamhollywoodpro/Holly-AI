/**
 * HOLLY ARCHITECTURE GENERATION API
 * 
 * Admin-only endpoint to trigger architecture generation post-deployment
 * This runs AFTER site is live, won't block builds
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

// Admin user IDs (Hollywood's Clerk ID)
const ADMIN_USER_IDS = [
  'user_2nvr8pL9Z3kUbYhTpHzQ1z8u0Qq', // Add Hollywood's actual Clerk ID here
];

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
    const user = await currentUser();
    
    // Check if user email is admin (Hollywood's email)
    const isAdmin = 
      user?.emailAddresses?.some(e => 
        e.emailAddress === 'steve@nexamusicgroup.com' || 
        e.emailAddress.endsWith('@nexamusicgroup.com')
      ) || 
      ADMIN_USER_IDS.includes(clerkUserId);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
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
      checkStatusAt: '/api/admin/architecture/status',
    }, { status: 202 });

  } catch (error) {
    console.error('❌ Architecture generation API error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * GET - Check generation status
 */
export async function GET(request: NextRequest) {
  try {
    // ✅ Authenticate user
    const { userId: clerkUserId } = await auth();
    
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ✅ Check if user is admin
    const user = await currentUser();
    const isAdmin = 
      user?.emailAddresses?.some(e => 
        e.emailAddress === 'steve@nexamusicgroup.com' || 
        e.emailAddress.endsWith('@nexamusicgroup.com')
      ) || 
      ADMIN_USER_IDS.includes(clerkUserId);

    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Return current status
    return NextResponse.json({
      status: currentGeneration || {
        status: 'idle',
        message: 'No generation in progress',
      },
    });

  } catch (error) {
    console.error('❌ Status check error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Run architecture generation (async background task)
 */
async function runArchitectureGeneration(): Promise<void> {
  const startTime = new Date();
  
  // Initialize status
  currentGeneration = {
    status: 'running',
    progress: 0,
    currentStep: 'Initializing...',
    startTime,
  };

  try {
    const projectRoot = process.cwd();
    const results: GenerationStatus['results'] = {
      architectureSnapshot: false,
      dependencyGraph: { nodes: 0, edges: 0 },
      codebaseKnowledge: { filesParsed: 0, filesSaved: 0 },
    };

    // STEP 1: Generate Architecture Map
    currentGeneration.currentStep = 'Analyzing architecture...';
    currentGeneration.progress = 10;
    
    let architecture = null;
    try {
      const mapper = new ArchitectureMapper(projectRoot);
      architecture = await mapper.generateArchitectureMap();
      
      console.log('✅ Architecture analyzed:', {
        totalFiles: architecture.summary.totalFiles,
        totalFunctions: architecture.summary.totalFunctions,
        apiEndpoints: architecture.summary.apiEndpoints,
      });
    } catch (error) {
      console.error('⚠️ Architecture analysis failed:', error);
    }

    currentGeneration.progress = 30;

    // STEP 2: Save Architecture Snapshot
    if (architecture) {
      currentGeneration.currentStep = 'Saving architecture snapshot...';
      
      try {
        await prisma.architectureSnapshot.create({
          data: {
            totalFiles: architecture.summary.totalFiles,
            totalFunctions: architecture.summary.totalFunctions,
            totalClasses: architecture.summary.totalClasses,
            totalInterfaces: architecture.summary.totalInterfaces,
            apiEndpoints: architecture.summary.apiEndpoints,
            featureModules: JSON.parse(JSON.stringify(architecture.features)),
            layers: architecture.layers,
            techStack: architecture.techStack,
            integrationPoints: architecture.integrationPoints,
          },
        });
        
        results.architectureSnapshot = true;
        console.log('✅ Architecture snapshot saved');
      } catch (error) {
        console.error('⚠️ Failed to save snapshot:', error);
      }
    }

    currentGeneration.progress = 50;

    // STEP 3: Generate Dependency Graph
    currentGeneration.currentStep = 'Building dependency graph...';
    
    let graph = null;
    try {
      const graphGenerator = new DependencyGraphGenerator(projectRoot);
      graph = await graphGenerator.generateDependencyGraph();
      
      console.log('✅ Dependency graph built:', {
        nodes: graph.nodes.length,
        edges: graph.edges.length,
      });
      
      results.dependencyGraph.nodes = graph.nodes.length;
      results.dependencyGraph.edges = graph.edges.length;
    } catch (error) {
      console.error('⚠️ Dependency graph generation failed:', error);
    }

    currentGeneration.progress = 70;

    // STEP 4: Save Dependency Graph
    if (graph) {
      currentGeneration.currentStep = 'Saving dependency graph...';
      
      try {
        // Delete old entries
        await prisma.dependencyGraph.deleteMany({});
        
        // Insert new nodes
        let savedCount = 0;
        for (const node of graph.nodes) {
          const impactAnalysis = graph.impactAnalysis.find(i => i.file === node.file);
          
          await prisma.dependencyGraph.create({
            data: {
              filePath: node.file,
              directDependencies: node.imports,
              directDependents: node.usedBy,
              totalImpact: impactAnalysis?.totalImpact.length || 0,
              isCritical: node.critical,
              circularDependencies: graph.circularDependencies
                .filter(cycle => cycle.includes(node.file))
                .flat()
                .filter((v, i, a) => a.indexOf(v) === i),
            },
          });
          savedCount++;
        }
        
        console.log(`✅ Saved ${savedCount} dependency graph nodes`);
      } catch (error) {
        console.error('⚠️ Failed to save dependency graph:', error);
      }
    }

    currentGeneration.progress = 90;

    // STEP 5: Save Codebase Knowledge
    currentGeneration.currentStep = 'Saving codebase knowledge...';
    
    try {
      // Delete old entries
      await prisma.codebaseKnowledge.deleteMany({});
      
      const parser = new CodebaseParser(projectRoot);
      const srcPath = `${projectRoot}/src`;
      const appPath = `${projectRoot}/app`;
      
      let filesParsed = 0;
      let filesSaved = 0;
      const MAX_FILES = 500;
      
      // Parse src directory
      if (require('fs').existsSync(srcPath)) {
        const srcFiles = await parser.parseDirectory(srcPath, true);
        
        for (const file of srcFiles.slice(0, MAX_FILES)) {
          filesParsed++;
          
          try {
            const node = graph?.nodes.find(n => n.file === file.filePath);
            
            await prisma.codebaseKnowledge.create({
              data: {
                filePath: file.filePath,
                fileName: file.fileName,
                layer: node?.layer || 'lib',
                functionCount: file.functions.length,
                classCount: file.classes.length,
                interfaceCount: file.interfaces.length,
                lineCount: file.linesOfCode,
                complexity: file.complexity,
                imports: node?.imports || [],
                exports: node?.exports || [],
              },
            });
            filesSaved++;
          } catch (error) {
            console.error(`⚠️ Failed to save ${file.fileName}:`, error);
          }
        }
      }
      
      // Parse app directory
      if (require('fs').existsSync(appPath)) {
        const appFiles = await parser.parseDirectory(appPath, true);
        
        for (const file of appFiles.slice(0, MAX_FILES - filesParsed)) {
          filesParsed++;
          
          try {
            const node = graph?.nodes.find(n => n.file === file.filePath);
            
            await prisma.codebaseKnowledge.create({
              data: {
                filePath: file.filePath,
                fileName: file.fileName,
                layer: node?.layer || 'api',
                functionCount: file.functions.length,
                classCount: file.classes.length,
                interfaceCount: file.interfaces.length,
                lineCount: file.linesOfCode,
                complexity: file.complexity,
                imports: node?.imports || [],
                exports: node?.exports || [],
              },
            });
            filesSaved++;
          } catch (error) {
            console.error(`⚠️ Failed to save ${file.fileName}:`, error);
          }
        }
      }
      
      results.codebaseKnowledge.filesParsed = filesParsed;
      results.codebaseKnowledge.filesSaved = filesSaved;
      
      console.log(`✅ Saved ${filesSaved}/${filesParsed} files to codebase knowledge`);
    } catch (error) {
      console.error('⚠️ Failed to save codebase knowledge:', error);
    }

    // ✅ SUCCESS
    currentGeneration = {
      status: 'completed',
      progress: 100,
      currentStep: 'Complete!',
      startTime,
      endTime: new Date(),
      results,
    };

    console.log('🎉 Architecture generation complete!');
    console.log('Results:', results);

  } catch (error) {
    // ❌ FAILURE
    currentGeneration = {
      status: 'failed',
      progress: currentGeneration?.progress || 0,
      currentStep: 'Failed',
      startTime,
      endTime: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    console.error('❌ Architecture generation failed:', error);
  }
}
