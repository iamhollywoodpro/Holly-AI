/**
 * HOLLY'S METAMORPHOSIS - PHASE 2: KNOWLEDGE API
 * 
 * This API endpoint allows HOLLY to answer natural language questions
 * about her own codebase, architecture, and dependencies.
 * 
 * Example queries:
 * - "What handles file uploads?"
 * - "Which files depend on the database?"
 * - "What would break if I change the Chat API?"
 */

import { NextResponse } from 'next/server';
import { CodebaseParser } from '@/lib/metamorphosis/codebase-parser';
import { ArchitectureMapper } from '@/lib/metamorphosis/architecture-mapper';
import { DependencyGraphGenerator } from '@/lib/metamorphosis/dependency-graph';
import { logger } from '@/lib/metamorphosis/logging-system';
import { getAuth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';

export const runtime = 'nodejs';


// ============================================================================
// KNOWLEDGE API ENDPOINT
// ============================================================================

const PROJECT_ROOT = process.cwd();

export async function GET(req: NextRequest) {
  const traceId = `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    // Authentication (optional - you can remove this for testing)
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameter
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query');
    const action = searchParams.get('action');

    logger.info('self_improvement', `Knowledge API request: ${query || action}`, {
      traceId,
      userId,
      query,
      action,
    });

    // Handle different actions
    switch (action) {
      case 'architecture':
        return await handleArchitectureQuery(traceId);
      
      case 'dependencies':
        const file = searchParams.get('file');
        return await handleDependencyQuery(file, traceId);
      
      case 'impact':
        const targetFile = searchParams.get('file');
        return await handleImpactQuery(targetFile, traceId);
      
      case 'search':
        return await handleCodeSearch(query, traceId);
      
      default:
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: ['architecture', 'dependencies', 'impact', 'search'],
        }, { status: 400 });
    }
  } catch (error: any) {
    logger.error('self_improvement', 'Knowledge API error', {
      traceId,
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json({
      error: 'Failed to process knowledge request',
      details: error.message,
    }, { status: 500 });
  }
}

// ============================================================================
// QUERY HANDLERS
// ============================================================================

/**
 * Get architecture overview
 */
async function handleArchitectureQuery(traceId: string) {
  // Try to get from database first (production)
  const snapshot = await prisma.architectureSnapshot.findFirst({
    orderBy: { timestamp: 'desc' },
  });

  if (snapshot) {
    // Use pre-generated architecture from database
    logger.info('self_improvement', 'Architecture query completed (from database)', {
      traceId,
      totalFiles: snapshot.totalFiles,
      timestamp: snapshot.timestamp,
    });

    const architecture = {
      summary: {
        totalFiles: snapshot.totalFiles,
        totalFunctions: snapshot.totalFunctions,
        totalClasses: snapshot.totalClasses,
        totalInterfaces: snapshot.totalInterfaces,
        apiEndpoints: snapshot.apiEndpoints,
        featureModules: (snapshot.featureModules as any[]).length,
      },
      features: snapshot.featureModules as any[],
      layers: snapshot.layers,
      techStack: snapshot.techStack,
      integrationPoints: snapshot.integrationPoints,
    };

    return NextResponse.json({
      success: true,
      data: {
        layers: architecture.layers,
        features: architecture.features.map((f: any) => ({
          name: f.name,
          files: f.files?.length || 0,
          description: f.description,
        })),
        techStack: architecture.techStack,
        integrations: architecture.integrationPoints,
        summary: architecture.summary,
        generatedAt: snapshot.timestamp,
      },
      explanation: generateArchitectureExplanation(architecture),
    });
  }

  // Fallback: Generate live (development only)
  const mapper = new ArchitectureMapper(PROJECT_ROOT);
  const architecture = await mapper.generateArchitectureMap();

  logger.info('self_improvement', 'Architecture query completed (live generation)', {
    traceId,
    totalFiles: architecture.summary.totalFiles,
    features: architecture.features.length,
  });

  return NextResponse.json({
    success: true,
    data: {
      layers: architecture.layers,
      features: architecture.features.map(f => ({
        name: f.name,
        files: f.files.length,
        description: f.description,
      })),
      techStack: architecture.techStack,
      integrations: architecture.integrationPoints,
      summary: architecture.summary,
    },
    explanation: generateArchitectureExplanation(architecture),
  });
}

/**
 * Get dependencies for a specific file
 */
async function handleDependencyQuery(file: string | null, traceId: string) {
  if (!file) {
    return NextResponse.json({
      error: 'Missing "file" parameter',
    }, { status: 400 });
  }

  // Try to get from database first
  const depNode = await prisma.dependencyGraph.findFirst({
    where: {
      OR: [
        { filePath: file },
        { filePath: { endsWith: file } },
      ],
    },
  });

  if (depNode) {
    logger.info('self_improvement', 'Dependency query completed (from database)', {
      traceId,
      file: depNode.filePath,
      imports: depNode.directDependencies.length,
      usedBy: depNode.directDependents.length,
    });

    // Get layer from codebase knowledge
    const knowledge = await prisma.codebaseKnowledge.findFirst({
      where: { filePath: depNode.filePath },
    });

    const node = {
      file: depNode.filePath,
      layer: knowledge?.layer || 'unknown',
      critical: depNode.isCritical,
      imports: depNode.directDependencies,
      usedBy: depNode.directDependents,
      exports: knowledge?.exports || [],
    };

    return NextResponse.json({
      success: true,
      data: {
        file: node.file,
        layer: node.layer,
        critical: node.critical,
        imports: node.imports,
        usedBy: node.usedBy,
        exportsCount: node.exports.length,
      },
      explanation: generateDependencyExplanation(node, { nodes: [] }),
    });
  }

  // Fallback: Generate live (development only)
  const generator = new DependencyGraphGenerator(PROJECT_ROOT);
  const graph = await generator.generateDependencyGraph();

  // Find the file in the graph
  const node = graph.nodes.find(n => n.file === file || n.file.endsWith(file));

  if (!node) {
    return NextResponse.json({
      error: 'File not found',
      file,
    }, { status: 404 });
  }

  logger.info('self_improvement', 'Dependency query completed (live generation)', {
    traceId,
    file: node.file,
    imports: node.imports.length,
    usedBy: node.usedBy.length,
  });

  return NextResponse.json({
    success: true,
    data: {
      file: node.file,
      layer: node.layer,
      critical: node.critical,
      imports: node.imports,
      usedBy: node.usedBy,
      exportsCount: node.exports.length,
    },
    explanation: generateDependencyExplanation(node, graph),
  });
}

/**
 * Analyze impact of changing a file
 */
async function handleImpactQuery(file: string | null, traceId: string) {
  if (!file) {
    return NextResponse.json({
      error: 'Missing "file" parameter',
    }, { status: 400 });
  }

  // Try to get from database first
  const depNode = await prisma.dependencyGraph.findFirst({
    where: {
      OR: [
        { filePath: file },
        { filePath: { endsWith: file } },
      ],
    },
  });

  if (depNode) {
    logger.info('self_improvement', 'Impact query completed (from database)', {
      traceId,
      file: depNode.filePath,
      directImpact: depNode.directDependents.length,
      totalImpact: depNode.totalImpact,
    });

    const impact = {
      file: depNode.filePath,
      directImpact: depNode.directDependents,
      totalImpact: [], // We'd need to recursively calculate this, for now use totalImpact count
    };

    return NextResponse.json({
      success: true,
      data: {
        file: impact.file,
        directImpact: impact.directImpact,
        totalImpactCount: depNode.totalImpact,
        riskLevel: calculateRiskLevel(depNode.totalImpact),
      },
      explanation: `Changing ${impact.file} will DIRECTLY impact ${impact.directImpact.length} files, with a TOTAL impact of ${depNode.totalImpact} files. Risk Level: ${calculateRiskLevel(depNode.totalImpact).toUpperCase()}`,
    });
  }

  // Fallback: Generate live (development only)
  const generator = new DependencyGraphGenerator(PROJECT_ROOT);
  const graph = await generator.generateDependencyGraph();

  // Find impact analysis
  const impact = graph.impactAnalysis.find(i => i.file === file || i.file.endsWith(file));

  if (!impact) {
    return NextResponse.json({
      error: 'File not found',
      file,
    }, { status: 404 });
  }

  logger.info('self_improvement', 'Impact query completed (live generation)', {
    traceId,
    file: impact.file,
    directImpact: impact.directImpact.length,
    totalImpact: impact.totalImpact.length,
  });

  return NextResponse.json({
    success: true,
    data: {
      file: impact.file,
      directImpact: impact.directImpact,
      totalImpact: impact.totalImpact,
      riskLevel: calculateRiskLevel(impact.totalImpact.length),
    },
    explanation: generateImpactExplanation(impact),
  });
}

/**
 * Search codebase for specific functionality
 */
async function handleCodeSearch(query: string | null, traceId: string) {
  if (!query) {
    return NextResponse.json({
      error: 'Missing "query" parameter',
    }, { status: 400 });
  }

  const parser = new CodebaseParser(PROJECT_ROOT);
  
  // Search for files/functions matching the query
  // This is a simple implementation - could be enhanced with semantic search
  const allFiles = await parser.parseDirectory(PROJECT_ROOT, true);
  
  const results = allFiles.filter(file => {
    const queryLower = query.toLowerCase();
    return (
      file.fileName.toLowerCase().includes(queryLower) ||
      file.functions.some(f => f.name.toLowerCase().includes(queryLower)) ||
      file.classes.some(c => c.name.toLowerCase().includes(queryLower))
    );
  });

  logger.info('self_improvement', 'Code search completed', {
    traceId,
    query,
    results: results.length,
  });

  return NextResponse.json({
    success: true,
    data: {
      query,
      results: results.map(r => ({
        file: r.filePath,
        fileName: r.fileName,
        functions: r.functions.map(f => f.name),
        classes: r.classes.map(c => c.name),
      })),
    },
    explanation: `Found ${results.length} files matching "${query}"`,
  });
}

// ============================================================================
// EXPLANATION GENERATORS
// ============================================================================

function generateArchitectureExplanation(architecture: any): string {
  const { summary, features } = architecture;
  
  return `I understand my codebase! I'm built with ${summary.totalFiles} files containing ${summary.totalFunctions} functions and ${summary.totalClasses} classes. I have ${summary.apiEndpoints} API endpoints organized into ${features.length} major features: ${features.map((f: any) => f.name).join(', ')}. My architecture follows a layered approach with API, Services, Database, UI, and Library layers.`;
}

function generateDependencyExplanation(node: any, graph: any): string {
  const { file, imports, usedBy, critical, layer } = node;
  
  let explanation = `This file is in the ${layer} layer`;
  
  if (critical) {
    explanation += ' and is CRITICAL to system operation';
  }
  
  explanation += `. It imports ${imports.length} other files`;
  
  if (usedBy.length > 0) {
    explanation += ` and is used by ${usedBy.length} files`;
  } else {
    explanation += ' but is not used by any other files (might be an entry point or unused code)';
  }
  
  return explanation + '.';
}

function generateImpactExplanation(impact: any): string {
  const { file, directImpact, totalImpact } = impact;
  
  if (totalImpact.length === 0) {
    return `Changing ${file} will have no impact on other files. It's either unused or a leaf node in the dependency tree.`;
  }
  
  if (directImpact.length === totalImpact.length) {
    return `Changing ${file} will directly affect ${totalImpact.length} files. There are no transitive dependencies.`;
  }
  
  return `Changing ${file} will DIRECTLY impact ${directImpact.length} files, but the TOTAL impact includes ${totalImpact.length} files when you consider transitive dependencies. Be careful! ${totalImpact.length >= 10 ? 'This is a high-risk change.' : ''}`;
}

function calculateRiskLevel(impactCount: number): 'low' | 'medium' | 'high' | 'critical' {
  if (impactCount === 0) return 'low';
  if (impactCount < 5) return 'medium';
  if (impactCount < 15) return 'high';
  return 'critical';
}
