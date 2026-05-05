#!/usr/bin/env node
/**
 * BUNDLE ARCHITECTURE GENERATOR FOR PRODUCTION
 * 
 * Uses esbuild to create a standalone JavaScript bundle
 * that doesn't need ts-node at runtime.
 */

const esbuild = require('esbuild');
const path = require('path');

const sourceFile = path.join(__dirname, 'generate-architecture.ts');
const outputFile = path.join(__dirname, 'generate-architecture.bundle.js');

console.log('📦 Bundling Architecture Generator...');
console.log(`   Source: ${sourceFile}`);
console.log(`   Output: ${outputFile}`);

esbuild
  .build({
    entryPoints: [sourceFile],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'cjs',
    outfile: outputFile,
    external: [
      '@prisma/client',
      'prisma',
      // External Node.js built-ins
      'fs',
      'path',
      'crypto',
    ],
    sourcemap: false,
    minify: false,
  })
  .then(() => {
    const fs = require('fs');
    const stats = fs.statSync(outputFile);
    console.log(`✅ Bundled successfully! (${Math.round(stats.size / 1024)}KB)`);
  })
  .catch((error) => {
    console.error('❌ Bundling failed:', error);
    process.exit(1);
  });
