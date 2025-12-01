/**
 * HOLLY'S METAMORPHOSIS - ARCHITECTURE API
 * 
 * This API endpoint exposes HOLLY's complete architecture map, dependency graph,
 * and codebase knowledge. Enables querying the system's self-awareness data.
 * 
 * GET /api/metamorphosis/architecture
 * 
 * Query Parameters:
 * - includeGraph: boolean - Include full dependency graph (default: true)
 * - includeFiles: boolean - Include detailed file knowledge (default: true)
 * - layer: string - Filter by architecture layer (api, lib, components, etc.)
 * - filePattern: string - Filter files by name pattern
 * - complexityMin: number - Filter files by minimum complexity
 * - complexityMax: number - Filter files by maximum complexity
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

// ============================================================================
// RESPONSE STRUCTURE
// ============================================================================

interface ArchitectureResponse {
  success: boolean;
  timestamp: Date;
  
  // Architecture snapshot metadata
  snapshot: {
    id: string;
    generatedAt: Date;
    totalFiles: number;
    totalFunctions: number;
    totalClasses: number;
    totalInterfaces: number;
    layers: Record<string, number>; // layer -> file count
  };
  
  // Dependency graph summary
  dependencyGraph?: {
    nodes: number;
    edges: number;
    circularDependencies: number;
    criticalFiles: string[];
  };
  
  // Detailed file knowledge
  files?: FileKnowledge[];
  
  // Statistics
  statistics: {
    averageComplexity: number;
    complexityDistribution: {
      simple: number;    // 1-5
      moderate: number;  // 6-10
      complex: number;   // 11-20
      veryComplex: number; // 21-50
      critical: number;    // 50+
    };
    topComplexFiles: Array<{ file: string; complexity: number }>;
    layerDistribution: Record<string, { files: number; functions: number }>;
  };
}

interface FileKnowledge {
  filePath: string;
  fileName: string;
  layer: string;
  functionCount: number;
  classCount: number;
  interfaceCount: number;
  lineCount: number;
  complexity: number;
  imports: string[];
  exports: string[];
}

// ============================================================================
// GET HANDLER - Return Architecture Map
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authentication check (optional - you might want public access for monitoring)
    const { userId } = await auth();
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const includeGraph = searchParams.get('includeGraph') !== 'false';
    const includeFiles = searchParams.get('includeFiles') !== 'false';
    const layer = searchParams.get('layer') || undefined;
    const filePattern = searchParams.get('filePattern') || undefined;
    const complexityMin = searchParams.get('complexityMin') 
      ? parseInt(searchParams.get('complexityMin')!, 10) 
      : undefined;
    const complexityMax = searchParams.get('complexityMax')
      ? parseInt(searchParams.get('complexityMax')!, 10)
      : undefined;

    // Get latest architecture snapshot
    const snapshot = await prisma.architectureSnapshot.findFirst({
      orderBy: { generatedAt: 'desc' },
    });

    if (!snapshot) {
      return NextResponse.json(
        {
          success: false,
          error: 'No architecture snapshot available',
          message: 'Architecture has not been generated yet. Run the build process to generate initial snapshot.',
        },
        { status: 404 }
      );
    }

    // Build filters for codebase knowledge query
    const whereClause: any = {};
    if (layer) {
      whereClause.layer = layer;
    }
    if (filePattern) {
      whereClause.fileName = {
        contains: filePattern,
      };
    }
    if (complexityMin !== undefined || complexityMax !== undefined) {
      whereClause.complexity = {};
      if (complexityMin !== undefined) {
        whereClause.complexity.gte = complexityMin;
      }
      if (complexityMax !== undefined) {
        whereClause.complexity.lte = complexityMax;
      }
    }

    // Get file knowledge
    let files: FileKnowledge[] = [];
    if (includeFiles) {
      const codebaseKnowledge = await prisma.codebaseKnowledge.findMany({
        where: whereClause,
        orderBy: { complexity: 'desc' },
        take: 1000, // Limit to prevent overwhelming response
      });

      files = codebaseKnowledge.map((file) => ({
        filePath: file.filePath,
        fileName: file.fileName,
        layer: file.layer,
        functionCount: file.functionCount,
        classCount: file.classCount,
        interfaceCount: file.interfaceCount,
        lineCount: file.lineCount,
        complexity: file.complexity,
        imports: file.imports as string[],
        exports: file.exports as string[],
      }));
    }

    // Get dependency graph
    let dependencyGraphData = undefined;
    if (includeGraph) {
      const dependencyGraph = await prisma.dependencyGraph.findFirst({
        orderBy: { generatedAt: 'desc' },
      });

      if (dependencyGraph) {
        const graphData = dependencyGraph.graph as any;
        dependencyGraphData = {
          nodes: graphData.nodes?.length || 0,
          edges: graphData.edges?.length || 0,
          circularDependencies: graphData.circularDependencies?.length || 0,
          criticalFiles: (graphData.criticalFiles || []).slice(0, 10), // Top 10
        };
      }
    }

    // Calculate statistics
    const allFiles = await prisma.codebaseKnowledge.findMany({
      select: {
        complexity: true,
        layer: true,
        functionCount: true,
        fileName: true,
      },
    });

    const statistics = calculateStatistics(allFiles);

    // Build response
    const response: ArchitectureResponse = {
      success: true,
      timestamp: new Date(),
      snapshot: {
        id: snapshot.id,
        generatedAt: snapshot.generatedAt,
        totalFiles: snapshot.totalFiles,
        totalFunctions: snapshot.totalFunctions,
        totalClasses: snapshot.totalClasses,
        totalInterfaces: snapshot.totalInterfaces,
        layers: snapshot.featureModules as Record<string, number>,
      },
      dependencyGraph: dependencyGraphData,
      files: includeFiles ? files : undefined,
      statistics,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('❌ Architecture API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date(),
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// STATISTICS CALCULATION
// ============================================================================

function calculateStatistics(files: Array<{ 
  complexity: number; 
  layer: string; 
  functionCount: number;
  fileName: string;
}>) {
  // Average complexity
  const totalComplexity = files.reduce((sum, f) => sum + f.complexity, 0);
  const averageComplexity = files.length > 0 
    ? Math.round(totalComplexity / files.length) 
    : 0;

  // Complexity distribution
  const distribution = {
    simple: 0,
    moderate: 0,
    complex: 0,
    veryComplex: 0,
    critical: 0,
  };

  files.forEach(f => {
    if (f.complexity <= 5) distribution.simple++;
    else if (f.complexity <= 10) distribution.moderate++;
    else if (f.complexity <= 20) distribution.complex++;
    else if (f.complexity <= 50) distribution.veryComplex++;
    else distribution.critical++;
  });

  // Top complex files
  const topComplexFiles = files
    .sort((a, b) => b.complexity - a.complexity)
    .slice(0, 10)
    .map(f => ({
      file: f.fileName,
      complexity: f.complexity,
    }));

  // Layer distribution
  const layerDistribution: Record<string, { files: number; functions: number }> = {};
  files.forEach(f => {
    if (!layerDistribution[f.layer]) {
      layerDistribution[f.layer] = { files: 0, functions: 0 };
    }
    layerDistribution[f.layer].files++;
    layerDistribution[f.layer].functions += f.functionCount;
  });

  return {
    averageComplexity,
    complexityDistribution: distribution,
    topComplexFiles,
    layerDistribution,
  };
}
