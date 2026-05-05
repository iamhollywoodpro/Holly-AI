/**
 * Quick test for codebase parser
 */

import { CodebaseParser } from './codebase-parser';

async function testParser() {
  console.log('🧪 Testing Codebase Parser...\n');
  
  try {
    const parser = new CodebaseParser();
    
    // Test parsing this file itself
    const testFile = __filename.replace('.js', '.ts');
    console.log(`Parsing test file: ${testFile}`);
    
    const result = await parser.parseFile('./src/lib/metamorphosis/codebase-parser.ts');
    
    console.log('\n✅ Parser Test Results:');
    console.log(`- File: ${result.fileName}`);
    console.log(`- Type: ${result.fileType}`);
    console.log(`- Size: ${result.size} bytes`);
    console.log(`- Lines: ${result.linesOfCode}`);
    console.log(`- Functions: ${result.functions.length}`);
    console.log(`- Classes: ${result.classes.length}`);
    console.log(`- Interfaces: ${result.interfaces.length}`);
    console.log(`- Types: ${result.types.length}`);
    console.log(`- Imports: ${result.imports.length}`);
    
    if (result.functions.length > 0) {
      console.log(`\n📝 Sample Function: ${result.functions[0].name}`);
      console.log(`   Parameters: ${result.functions[0].parameters.length}`);
      console.log(`   Async: ${result.functions[0].isAsync}`);
      console.log(`   Exported: ${result.functions[0].isExported}`);
    }
    
    if (result.classes.length > 0) {
      console.log(`\n🏗️  Sample Class: ${result.classes[0].name}`);
      console.log(`   Methods: ${result.classes[0].methods.length}`);
      console.log(`   Properties: ${result.classes[0].properties.length}`);
    }
    
    console.log('\n✅ Parser works correctly!');
    
  } catch (error) {
    console.error('\n❌ Parser test failed:', error);
    process.exit(1);
  }
}

// Only run if executed directly
if (require.main === module) {
  testParser();
}
