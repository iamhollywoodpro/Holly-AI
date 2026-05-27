#!/usr/bin/env ts-node
/**
 * ARCHITECTURE GENERATION SCRIPT (OPTIMIZED FOR VERCEL)
 * 
 * This script runs during the Vercel build process to pre-generate
 * HOLLY's architecture map and store it in the database.
 * 
 * OPTIMIZATIONS:
 * - Timeout protection (5 minute max)
 * - Error handling for individual file parsing
 * - Memory-efficient batch processing
 * - Progress tracking and graceful failures
 */

import { CodebaseParser } from '../src/lib/metamorphosis/codebase-parser';
import { ArchitectureMapper } from '../src/lib/metamorphosis/architecture-mapper';
import { DependencyGraphGenerator } from '../src/lib/metamorphosis/dependency-graph';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configuration
const MAX_EXECUTION_TIME = 5 * 60 * 1000; // 5 minutes
const MAX_FILES_TO_PARSE = 500; // Limit for safety
const startTime = Date.now();

// Timeout protection
let timeoutId: NodeJS.Timeout;

function checkTimeout(step: string) {
  const elapsed = Date.now() - startTime;
  if (elapsed > MAX_EXECUTION_TIME) {
    console.warn(`⚠️  Timeout reached during ${step} (${elapsed}ms)`);
    console.log('💡 Continuing with partial data...\n');
    return true;
  }
  return false;
}

async function generateArchitecture() {
  console.log('🧠 HOLLY: Generating architecture map...');
  console.log('================================================\n');

  const projectRoot = process.cwd();
  
  try {
    // Set overall timeout
    timeoutId = setTimeout(() => {
      console.error('⏰ Script timeout - forcing graceful exit');
      process.exit(0); // Exit successfully to not block deployment
    }, MAX_EXECUTION_TIME + 10000); // 10s buffer

    // Step 1: Generate Architecture Map
    if (checkTimeout('architecture analysis')) return;
    
    console.log('📊 Step 1: Analyzing architecture...');
    let architecture;
    try {
      const mapper = new ArchitectureMapper(projectRoot);
      architecture = await mapper.generateArchitectureMap();
      
      console.log(`✅ Architecture analyzed:`);
      console.log(`   - Total files: ${architecture.summary.totalFiles}`);
      console.log(`   - Functions: ${architecture.summary.totalFunctions}`);
      console.log(`   - Classes: ${architecture.summary.totalClasses}`);
      console.log(`   - API endpoints: ${architecture.summary.apiEndpoints}`);
      console.log(`   - Feature modules: ${architecture.features.length}\n`);
    } catch (error: any) {
      console.error('⚠️  Architecture analysis failed:', error.message);
      console.log('💡 Skipping architecture snapshot...\n');
      architecture = null;
    }

    // Step 2: Store Architecture Snapshot
    if (architecture && !checkTimeout('snapshot save')) {
      console.log('💾 Step 2: Saving architecture snapshot to database...');
      try {
        const snapshot = await prisma.architectureSnapshot.create({
          data: {
            totalFiles: architecture.summary.totalFiles,
            totalFunctions: architecture.summary.totalFunctions,
            totalClasses: architecture.summary.totalClasses,
            totalInterfaces: architecture.summary.totalInterfaces,
            apiEndpoints: architecture.summary.apiEndpoints,
            featureModules: JSON.parse(JSON.stringify(architecture.features)),
            layers: JSON.parse(JSON.stringify(architecture.layers)),
            techStack: JSON.parse(JSON.stringify(architecture.techStack)),
            integrationPoints: JSON.parse(JSON.stringify(architecture.integrationPoints)),
          },
        });
        console.log(`✅ Architecture snapshot saved (ID: ${snapshot.id})\n`);
      } catch (error: any) {
        console.error('⚠️  Failed to save snapshot:', error.message);
        console.log('💡 Continuing without snapshot...\n');
      }
    }

    // Step 3: Generate Dependency Graph
    if (checkTimeout('dependency graph')) return;
    
    console.log('🔗 Step 3: Building dependency graph...');
    let graph;
    try {
      const graphGenerator = new DependencyGraphGenerator(projectRoot);
      graph = await graphGenerator.generateDependencyGraph();
      
      console.log(`✅ Dependency graph built:`);
      console.log(`   - Total nodes: ${graph.nodes.length}`);
      console.log(`   - Total edges: ${graph.edges.length}`);
      console.log(`   - Critical files: ${graph.nodes.filter(n => n.critical).length}`);
      console.log(`   - Circular dependencies: ${graph.circularDependencies.length}\n`);
    } catch (error: any) {
      console.error('⚠️  Dependency graph generation failed:', error.message);
      console.log('💡 Skipping dependency graph...\n');
      graph = null;
    }

    // Step 4: Store Dependency Graph Nodes
    if (graph && !checkTimeout('dependency graph save')) {
      console.log('💾 Step 4: Saving dependency graph to database...');
      
      try {
        // Delete old dependency graph entries
        await prisma.dependencyGraph.deleteMany({});
        
        // Insert new dependency graph nodes (with timeout checks)
        let savedCount = 0;
        for (const node of graph.nodes) {
          if (checkTimeout('dependency graph save')) break;
          
          try {
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
            
            if (savedCount % 50 === 0) {
              console.log(`   - Saved ${savedCount}/${graph.nodes.length} nodes...`);
            }
          } catch (nodeError: any) {
            console.warn(`   ⚠️  Failed to save node ${node.file}: ${nodeError.message}`);
            // Continue with next node
          }
        }
        console.log(`✅ Saved ${savedCount} dependency graph nodes\n`);
      } catch (error: any) {
        console.error('⚠️  Failed to save dependency graph:', error.message);
        console.log('💡 Continuing without dependency graph...\n');
      }
    }

    // Step 5: Store Individual File Knowledge
    if (checkTimeout('codebase knowledge')) return;
    
    console.log('💾 Step 5: Saving codebase knowledge...');
    
    try {
      // Delete old codebase knowledge entries
      await prisma.codebaseKnowledge.deleteMany({});
      
      // Parse and store file-level details
      const parser = new CodebaseParser(projectRoot);
      const srcPath = `${projectRoot}/src`;
      const appPath = `${projectRoot}/app`;
      
      let filesSaved = 0;
      let filesParsed = 0;
      
      // Parse src directory
      if (require('fs').existsSync(srcPath)) {
        console.log('   📂 Parsing /src directory...');
        try {
          const srcFiles = await parser.parseDirectory(srcPath, true);
          
          for (const file of srcFiles) {
            if (checkTimeout('codebase knowledge save')) break;
            if (filesParsed >= MAX_FILES_TO_PARSE) {
              console.log(`   ⚠️  Reached max file limit (${MAX_FILES_TO_PARSE}), stopping...`);
              break;
            }
            
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
              
              if (filesSaved % 25 === 0) {
                console.log(`   - Saved ${filesSaved} files...`);
              }
            } catch (fileError: any) {
              console.warn(`   ⚠️  Failed to save ${file.fileName}: ${fileError.message}`);
              // Continue with next file
            }
          }
        } catch (dirError: any) {
          console.error(`   ⚠️  Failed to parse /src: ${dirError.message}`);
        }
      }
      
      // Parse app directory
      if (require('fs').existsSync(appPath) && !checkTimeout('codebase knowledge save')) {
        console.log('   📂 Parsing /app directory...');
        try {
          const appFiles = await parser.parseDirectory(appPath, true);
          
          for (const file of appFiles) {
            if (checkTimeout('codebase knowledge save')) break;
            if (filesParsed >= MAX_FILES_TO_PARSE) {
              console.log(`   ⚠️  Reached max file limit (${MAX_FILES_TO_PARSE}), stopping...`);
              break;
            }
            
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
              
              if (filesSaved % 25 === 0) {
                console.log(`   - Saved ${filesSaved} files...`);
              }
            } catch (fileError: any) {
              console.warn(`   ⚠️  Failed to save ${file.fileName}: ${fileError.message}`);
              // Continue with next file
            }
          }
        } catch (dirError: any) {
          console.error(`   ⚠️  Failed to parse /app: ${dirError.message}`);
        }
      }
      
      console.log(`✅ Saved ${filesSaved} files to codebase knowledge\n`);
    } catch (error: any) {
      console.error('⚠️  Failed to save codebase knowledge:', error.message);
      console.log('💡 Continuing without codebase knowledge...\n');
    }

    // Final Summary
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('================================================');
    console.log('🎉 HOLLY: Architecture generation complete!');
    console.log('================================================');
    console.log(`📊 Summary:`);
    console.log(`   - Execution time: ${totalTime}s`);
    console.log(`   - Architecture snapshot: ${architecture ? '✅' : '❌'}`);
    console.log(`   - Dependency graph: ${graph ? '✅' : '❌'}`);
    console.log(`   - Codebase knowledge: Partial`);
    console.log('');
    console.log('✅ HOLLY is now self-aware in production! 🧠');
    console.log('================================================\n');

    clearTimeout(timeoutId);

  } catch (error: any) {
    console.error('❌ Error generating architecture:', error.message);
    console.error(error.stack);
    
    // Don't fail the build - HOLLY can still function without architecture map
    console.log('\n💡 Architecture generation failed, but build will continue...');
    console.log('   HOLLY will have limited self-awareness but remain functional.\n');
    
    clearTimeout(timeoutId);
    process.exit(0); // Exit successfully to not block deployment
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
    console.log('💡 Exiting gracefully to continue build...');
    process.exit(0); // Don't block deployment
  });
