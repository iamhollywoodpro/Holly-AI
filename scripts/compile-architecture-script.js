#!/usr/bin/env node
/**
 * COMPILATION SCRIPT FOR ARCHITECTURE GENERATOR
 * 
 * This compiles scripts/generate-architecture.ts to JavaScript
 * so we don't need ts-node at runtime.
 * 
 * Run: node scripts/compile-architecture-script.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'generate-architecture.ts');
const outputFile = path.join(__dirname, 'generate-architecture.js');

console.log('🔨 Compiling Architecture Generator...');
console.log(`   Source: ${sourceFile}`);
console.log(`   Output: ${outputFile}`);

try {
  // Compile TypeScript to JavaScript
  execSync(
    `npx tsc ${sourceFile} --outDir ${__dirname} --module commonjs --target ES2020 --esModuleInterop --skipLibCheck --resolveJsonModule`,
    { stdio: 'inherit' }
  );

  // Verify output exists
  if (fs.existsSync(outputFile)) {
    const stats = fs.statSync(outputFile);
    console.log(`✅ Compiled successfully! (${Math.round(stats.size / 1024)}KB)`);
    console.log(`   Output: ${outputFile}`);
  } else {
    throw new Error('Output file not created');
  }
} catch (error) {
  console.error('❌ Compilation failed:', error.message);
  process.exit(1);
}
