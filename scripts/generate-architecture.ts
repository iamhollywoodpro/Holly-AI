#!/usr/bin/env ts-node
/**
 * ARCHITECTURE GENERATION SCRIPT
 * 
 * This script runs during the Vercel build process to pre-generate
 * HOLLY's architecture map and store it in the database.
 * 
 * Why: Production environments don't have access to source files,
 * so we generate the architecture at build time instead.
 */

import { CodebaseParser } from '../src/lib/metamorphosis/codebase-parser';
import { ArchitectureMapper } from '../src/lib/metamorphosis/architecture-mapper';
import { DependencyGraphGenerator } from '../src/lib/metamorphosis/dependency-graph';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateArchitecture() {
  console.log('🧠 HOLLY: Generating architecture map...');
  console.log('================================================\n');

  const projectRoot = process.cwd();
  
  try {
    // Step 1: Generate Architecture Map
    console.log('📊 Step 1: Analyzing architecture...');
    const mapper = new ArchitectureMapper(projectRoot);
    const architecture = await mapper.generateArchitectureMap();
    
    console.log(`✅ Architecture analyzed:`);
    console.log(`   - Total files: ${architecture.summary.totalFiles}`);
    console.log(`   - Functions: ${architecture.summary.totalFunctions}`);
    console.log(`   - Classes: ${architecture.summary.totalClasses}`);
    console.log(`   - API endpoints: ${architecture.summary.apiEndpoints}`);
    console.log(`   - Feature modules: ${architecture.features.length}\n`);

    // Step 2: Store Architecture Snapshot
    console.log('💾 Step 2: Saving architecture snapshot to database...');
    const snapshot = await prisma.architectureSnapshot.create({
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
    console.log(`✅ Architecture snapshot saved (ID: ${snapshot.id})\n`);

    // Step 3: Generate Dependency Graph
    console.log('🔗 Step 3: Building dependency graph...');
    const graphGenerator = new DependencyGraphGenerator(projectRoot);
    const graph = await graphGenerator.generateDependencyGraph();
    
    console.log(`✅ Dependency graph built:`);
    console.log(`   - Total nodes: ${graph.nodes.length}`);
    console.log(`   - Total edges: ${graph.edges.length}`);
    console.log(`   - Critical files: ${graph.nodes.filter(n => n.critical).length}`);
    console.log(`   - Circular dependencies: ${graph.circularDependencies.length}\n`);

    // Step 4: Store Dependency Graph Nodes
    console.log('💾 Step 4: Saving dependency graph to database...');
    
    // Delete old dependency graph entries
    await prisma.dependencyGraph.deleteMany({});
    
    // Insert new dependency graph nodes
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
            .filter((v, i, a) => a.indexOf(v) === i), // unique values
        },
      });
      savedCount++;
      
      // Progress indicator
      if (savedCount % 50 === 0) {
        console.log(`   - Saved ${savedCount}/${graph.nodes.length} nodes...`);
      }
    }
    console.log(`✅ Saved ${savedCount} dependency graph nodes\n`);

    // Step 5: Store Individual File Knowledge
    console.log('💾 Step 5: Saving codebase knowledge...');
    
    // Delete old codebase knowledge entries
    await prisma.codebaseKnowledge.deleteMany({});
    
    // Parse and store file-level details
    const parser = new CodebaseParser(projectRoot);
    const srcPath = `${projectRoot}/src`;
    const appPath = `${projectRoot}/app`;
    
    let filesSaved = 0;
    
    // Parse src directory
    if (require('fs').existsSync(srcPath)) {
      const srcFiles = await parser.parseDirectory(srcPath, true);
      for (const file of srcFiles) {
        const node = graph.nodes.find(n => n.file === file.filePath);
        
        await prisma.codebaseKnowledge.create({
          data: {
            filePath: file.filePath,
            fileName: file.fileName,
            layer: node?.layer || 'lib',
            functionCount: file.functions.length,
            classCount: file.classes.length,
            interfaceCount: file.interfaces.length,
            lineCount: file.lineCount,
            complexity: file.complexity,
            imports: node?.imports || [],
            exports: node?.exports || [],
          },
        });
        filesSaved++;
        
        if (filesSaved % 25 === 0) {
          console.log(`   - Saved ${filesSaved} files...`);
        }
      }
    }
    
    // Parse app directory
    if (require('fs').existsSync(appPath)) {
      const appFiles = await parser.parseDirectory(appPath, true);
      for (const file of appFiles) {
        const node = graph.nodes.find(n => n.file === file.filePath);
        
        await prisma.codebaseKnowledge.create({
          data: {
            filePath: file.filePath,
            fileName: file.fileName,
            layer: node?.layer || 'api',
            functionCount: file.functions.length,
            classCount: file.classes.length,
            interfaceCount: file.interfaces.length,
            lineCount: file.lineCount,
            complexity: file.complexity,
            imports: node?.imports || [],
            exports: node?.exports || [],
          },
        });
        filesSaved++;
        
        if (filesSaved % 25 === 0) {
          console.log(`   - Saved ${filesSaved} files...`);
        }
      }
    }
    
    console.log(`✅ Saved ${filesSaved} files to codebase knowledge\n`);

    // Final Summary
    console.log('================================================');
    console.log('🎉 HOLLY: Architecture generation complete!');
    console.log('================================================');
    console.log(`📊 Summary:`);
    console.log(`   - Architecture snapshot: 1`);
    console.log(`   - Dependency nodes: ${savedCount}`);
    console.log(`   - File knowledge entries: ${filesSaved}`);
    console.log(`   - Critical files: ${graph.nodes.filter(n => n.critical).length}`);
    console.log(`   - Circular dependencies detected: ${graph.circularDependencies.length}`);
    console.log('');
    console.log('✅ HOLLY is now self-aware in production! 🧠');
    console.log('================================================\n');

  } catch (error: any) {
    console.error('❌ Error generating architecture:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateArchitecture()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
