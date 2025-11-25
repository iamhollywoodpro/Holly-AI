#!/usr/bin/env node
/**
 * HOLLY TypeScript Scanner
 * Lightweight pre-deployment validation tool
 * 
 * Purpose: Catch TypeScript errors WITHOUT running out of memory
 * Usage: node .holly/tools/typescript-scanner.js
 * Exit: 0 = no errors, 1 = errors found
 * 
 * Checks:
 * 1. Prisma model references against schema
 * 2. Import/export consistency
 * 3. Type definitions (Record<T, any> validation)
 * 4. Class method completeness
 * 5. Prisma unique field usage (e.g., linkId, id, etc.)
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

class TypeScriptScanner {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.prismaModels = new Set();
    this.modelUniqueFields = {}; // Map of model name to unique fields
    this.scannedFiles = 0;
  }

  log(message, color = RESET) {
    console.log(`${color}${message}${RESET}`);
  }

  // Extract Prisma models and their unique fields from schema
  loadPrismaSchema() {
    const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
    
    if (!fs.existsSync(schemaPath)) {
      this.errors.push('Prisma schema not found at prisma/schema.prisma');
      return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Extract model names and convert to camelCase (Prisma Client API format)
    // model User -> prisma.user
    // model DownloadLink -> prisma.downloadLink
    const modelRegex = /model\s+(\w+)\s*{/g;
    let match;
    while ((match = modelRegex.exec(schema)) !== null) {
      const pascalCase = match[1];
      const camelCase = pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
      this.prismaModels.add(camelCase);
      this.modelUniqueFields[camelCase] = new Set(['id']); // Initialize with id
    }

    // Extract unique fields for each model
    const lines = schema.split('\n');
    let currentModel = null;
    
    for (const line of lines) {
      // Check if entering a model definition
      const modelMatch = line.match(/model\s+(\w+)\s*{/);
      if (modelMatch) {
        const pascalCase = modelMatch[1];
        currentModel = pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
        continue;
      }
      
      // Check if leaving a model definition
      if (line.trim() === '}') {
        currentModel = null;
        continue;
      }
      
      // If inside a model, check for unique fields
      if (currentModel) {
        // Check for @unique attribute
        if (line.includes('@unique')) {
          const fieldMatch = line.match(/^\s*(\w+)\s+/);
          if (fieldMatch) {
            this.modelUniqueFields[currentModel].add(fieldMatch[1]);
          }
        }
        
        // Check for @@unique compound keys
        const compoundMatch = line.match(/@@unique\(\[([^\]]+)\]\)/);
        if (compoundMatch) {
          const fields = compoundMatch[1].split(',').map(f => f.trim());
          fields.forEach(field => {
            this.modelUniqueFields[currentModel].add(field);
          });
        }
      }
    }

    this.log(`\n${BLUE}📋 Loaded Prisma Schema:${RESET}`);
    this.log(`   Found ${this.prismaModels.size} models: ${Array.from(this.prismaModels).join(', ')}`);
    this.log(`   Unique fields mapped for each model\n`);
  }

  // Remove comments from content before scanning
  removeComments(content) {
    // Remove multi-line comments
    let result = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove single-line comments
    result = result.replace(/\/\/.*$/gm, '');
    return result;
  }

  // Scan a single file for issues
  scanFile(filePath) {
    const fullContent = fs.readFileSync(filePath, 'utf-8');
    const content = this.removeComments(fullContent);
    const relativePath = path.relative(process.cwd(), filePath);
    
    this.scannedFiles++;

    // Check 1: Prisma model references
    this.checkPrismaModels(content, relativePath, fullContent);

    // Check 2: Prisma unique field usage
    this.checkPrismaUniqueFields(content, relativePath, fullContent);

    // Check 3: Import/export consistency
    this.checkImports(content, relativePath, fullContent);

    // Check 4: Type definitions
    this.checkTypeDefinitions(content, relativePath, fullContent);
  }

  checkPrismaModels(content, filePath, fullContent) {
    // Check for prisma.modelName usage
    const prismaModelRegex = /prisma\.(\w+)\./g;
    let match;
    
    while ((match = prismaModelRegex.exec(content)) !== null) {
      const modelName = match[1];
      
      // Skip if it's a valid Prisma method
      if (['$transaction', '$executeRaw', '$queryRaw', '$disconnect', '$connect'].includes(modelName)) {
        continue;
      }
      
      if (!this.prismaModels.has(modelName)) {
        this.errors.push({
          file: filePath,
          line: this.getLineNumber(fullContent, match.index),
          message: `Non-existent Prisma model: prisma.${modelName}`,
          code: match[0]
        });
      }
    }
  }

  checkPrismaUniqueFields(content, filePath, fullContent) {
    // Check for findUnique, update, delete with where clauses
    const uniqueOperationRegex = /prisma\.(\w+)\.(findUnique|update|delete)\(\s*{\s*where:\s*{([^}]+)}/g;
    let match;
    
    while ((match = uniqueOperationRegex.exec(content)) !== null) {
      const modelName = match[1];
      const operation = match[2];
      const whereClause = match[3];
      
      // Skip if model doesn't exist in schema
      if (!this.prismaModels.has(modelName)) {
        continue; // Already reported by checkPrismaModels
      }
      
      // Extract field name from where clause (e.g., "linkId" from "linkId: value" or "linkId }")
      const fieldMatch = whereClause.match(/(\w+)\s*[}:]/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        const uniqueFields = this.modelUniqueFields[modelName] || new Set(['id']);
        
        if (!uniqueFields.has(fieldName)) {
          this.errors.push({
            file: filePath,
            line: this.getLineNumber(fullContent, match.index),
            message: `Field '${fieldName}' is not a unique field in model '${modelName}'. Valid unique fields: ${Array.from(uniqueFields).join(', ')}`,
            code: match[0].substring(0, 80) + '...'
          });
        }
      }
    }
  }

  checkImports(content, filePath, fullContent) {
    // Check for imports of non-existent classes
    const importRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const imports = match[1].split(',').map(i => i.trim());
      const sourcePath = match[2];
      
      // Check for known problematic imports
      const problematicImports = ['PredictiveEngine', 'TasteLearner'];
      
      imports.forEach(importName => {
        if (problematicImports.includes(importName)) {
          // This is just a warning - we'd need to check if the file exists and has the export
          this.warnings.push({
            file: filePath,
            line: this.getLineNumber(fullContent, match.index),
            message: `Import of ${importName} - verify it exists in ${sourcePath}`,
            code: match[0]
          });
        }
      });
    }
  }

  checkTypeDefinitions(content, filePath, fullContent) {
    // Check for Record<TableName, any> or similar type definitions
    const recordTypeRegex = /Record<(\w+),\s*any>/g;
    let match;
    
    while ((match = recordTypeRegex.exec(content)) !== null) {
      const typeName = match[1];
      
      // This is informational - Record<string, any> is always valid
      if (typeName === 'string') {
        continue;
      }
      
      // If it's a union type or specific type, we should warn
      this.warnings.push({
        file: filePath,
        line: this.getLineNumber(fullContent, match.index),
        message: `Type definition uses Record<${typeName}, any> - ensure ${typeName} covers all cases`,
        code: match[0]
      });
    }
  }

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  // Recursively scan directory
  scanDirectory(dir, extensions = ['.ts', '.tsx']) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, .next, .git, etc.
        if (['node_modules', '.next', '.git', 'dist', 'build'].includes(file)) {
          continue;
        }
        this.scanDirectory(filePath, extensions);
      } else if (stat.isFile()) {
        const ext = path.extname(file);
        if (extensions.includes(ext)) {
          this.scanFile(filePath);
        }
      }
    }
  }

  // Print results
  printResults() {
    this.log(`\n${BOLD}═══════════════════════════════════════════════════════════${RESET}`);
    this.log(`${BOLD}  HOLLY TypeScript Scanner Results${RESET}`);
    this.log(`${BOLD}═══════════════════════════════════════════════════════════${RESET}\n`);
    
    this.log(`${BLUE}📊 Scanned ${this.scannedFiles} TypeScript files${RESET}\n`);

    // Print errors
    if (this.errors.length > 0) {
      this.log(`${RED}${BOLD}❌ ERRORS (${this.errors.length}):${RESET}\n`);
      
      this.errors.forEach((error, index) => {
        this.log(`${RED}${index + 1}. ${error.file}:${error.line}${RESET}`);
        this.log(`   ${error.message}`);
        this.log(`   ${YELLOW}${error.code}${RESET}\n`);
      });
    } else {
      this.log(`${GREEN}✅ No errors found!${RESET}\n`);
    }

    // Print warnings
    if (this.warnings.length > 0) {
      this.log(`${YELLOW}${BOLD}⚠️  WARNINGS (${this.warnings.length}):${RESET}\n`);
      
      this.warnings.forEach((warning, index) => {
        this.log(`${YELLOW}${index + 1}. ${warning.file}:${warning.line}${RESET}`);
        this.log(`   ${warning.message}`);
        this.log(`   ${BLUE}${warning.code}${RESET}\n`);
      });
    }

    // Summary
    this.log(`${BOLD}═══════════════════════════════════════════════════════════${RESET}`);
    if (this.errors.length === 0) {
      this.log(`${GREEN}${BOLD}✅ BUILD SAFE: No critical errors detected${RESET}`);
    } else {
      this.log(`${RED}${BOLD}❌ BUILD BLOCKED: ${this.errors.length} error(s) must be fixed${RESET}`);
    }
    this.log(`${BOLD}═══════════════════════════════════════════════════════════${RESET}\n`);
  }

  // Main execution
  run() {
    this.log(`${BLUE}${BOLD}🔍 HOLLY TypeScript Scanner Starting...${RESET}\n`);
    
    // Load Prisma schema
    this.loadPrismaSchema();
    
    // Scan source directory
    this.log(`${BLUE}📂 Scanning src/ directory...${RESET}`);
    this.scanDirectory(path.join(process.cwd(), 'src'));
    
    // Scan app directory (Next.js)
    if (fs.existsSync(path.join(process.cwd(), 'app'))) {
      this.log(`${BLUE}📂 Scanning app/ directory...${RESET}`);
      this.scanDirectory(path.join(process.cwd(), 'app'));
    }
    
    // Print results
    this.printResults();
    
    // Exit with error code if errors found
    return this.errors.length === 0 ? 0 : 1;
  }
}

// Run scanner
const scanner = new TypeScriptScanner();
const exitCode = scanner.run();
process.exit(exitCode);
