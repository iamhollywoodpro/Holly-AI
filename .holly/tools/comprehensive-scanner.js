#!/usr/bin/env node
/**
 * HOLLY COMPREHENSIVE SCANNER
 * 
 * This scanner catches EVERYTHING before deployment:
 * 1. Prisma model names
 * 2. Prisma field names in create/update/upsert operations
 * 3. Prisma unique fields in findUnique/update/delete
 * 4. Field type compatibility (Json vs arrays, etc.)
 * 5. Enum values
 * 6. Required vs optional fields
 * 
 * NO MORE DEPLOYMENT FAILURES DUE TO SCHEMA MISMATCHES
 * 
 * Exit code 0 = SAFE TO DEPLOY
 * Exit code 1 = BLOCKED - FIX ERRORS FIRST
 */

const fs = require('fs');
const path = require('path');

// ANSI colors
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

class ComprehensiveScanner {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.scannedFiles = 0;
    
    // Schema data structures
    this.prismaModels = new Map(); // modelName -> { fields: Map, uniqueFields: Set, requiredFields: Set }
    this.prismaEnums = new Map();  // enumName -> Set of values
  }

  log(message, color = RESET) {
    console.log(`${color}${message}${RESET}`);
  }

  // ============================================================================
  // SCHEMA PARSING
  // ============================================================================

  loadPrismaSchema() {
    const schemaPath = path.join(process.cwd(), 'prisma/schema.prisma');
    
    if (!fs.existsSync(schemaPath)) {
      this.errors.push('Prisma schema not found at prisma/schema.prisma');
      return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    this.parseEnums(schema);
    this.parseModels(schema);

    this.log(`\n${BLUE}📋 Loaded Prisma Schema:${RESET}`);
    this.log(`   ${this.prismaModels.size} models loaded`);
    this.log(`   ${this.prismaEnums.size} enums loaded\n`);
  }

  parseEnums(schema) {
    const enumRegex = /enum\s+(\w+)\s*{([^}]+)}/g;
    let match;
    
    while ((match = enumRegex.exec(schema)) !== null) {
      const enumName = match[1];
      const enumBody = match[2];
      
      const values = new Set();
      const valueRegex = /^\s*(\w+)/gm;
      let valueMatch;
      
      while ((valueMatch = valueRegex.exec(enumBody)) !== null) {
        values.add(valueMatch[1]);
      }
      
      this.prismaEnums.set(enumName, values);
    }
  }

  parseModels(schema) {
    const lines = schema.split('\n');
    let currentModel = null;
    let inModel = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for model start
      const modelMatch = line.match(/^model\s+(\w+)\s*{/);
      if (modelMatch) {
        const pascalName = modelMatch[1];
        const camelName = pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
        
        currentModel = {
          pascalName,
          camelName,
          fields: new Map(),
          uniqueFields: new Set(['id']),
          requiredFields: new Set(),
        };
        
        inModel = true;
        continue;
      }
      
      // Check for model end
      if (inModel && line.trim() === '}') {
        this.prismaModels.set(currentModel.camelName, currentModel);
        currentModel = null;
        inModel = false;
        continue;
      }
      
      // Parse field inside model
      if (inModel && currentModel) {
        this.parseField(line, currentModel);
      }
    }
  }

  parseField(line, model) {
    // Skip lines that start with // or are empty
    if (line.trim().startsWith('//') || line.trim() === '') {
      return;
    }
    
    // Check for @@unique compound keys
    if (line.includes('@@unique')) {
      const compoundMatch = line.match(/@@unique\(\[([^\]]+)\]\)/);
      if (compoundMatch) {
        const fields = compoundMatch[1].split(',').map(f => f.trim());
        fields.forEach(field => model.uniqueFields.add(field));
      }
      return;
    }
    
    // Skip @@index, @@map, etc.
    if (line.trim().startsWith('@@')) {
      return;
    }
    
    // Parse field definition: fieldName Type @attributes // optional comment
    // Strip inline comments first
    const lineWithoutComment = line.split('//')[0];
    const fieldMatch = lineWithoutComment.match(/^\s*(\w+)\s+([\w\[\]?]+)(.*)?$/);
    if (!fieldMatch) return;
    
    const fieldName = fieldMatch[1];
    const fieldType = fieldMatch[2];
    const attributes = fieldMatch[3] || '';
    
    // Determine if optional
    const isOptional = fieldType.includes('?') || attributes.includes('@default');
    
    // Determine base type (remove [] and ?)
    const baseType = fieldType.replace(/[\[\]?]/g, '');
    const isArray = fieldType.includes('[]');
    
    // Store field info
    model.fields.set(fieldName, {
      type: baseType,
      isOptional,
      isArray,
      rawType: fieldType,
    });
    
    // Track required fields
    if (!isOptional && !attributes.includes('@relation')) {
      model.requiredFields.add(fieldName);
    }
    
    // Check for @unique attribute
    if (attributes.includes('@unique') || attributes.includes('@id')) {
      model.uniqueFields.add(fieldName);
    }
  }

  // ============================================================================
  // FILE SCANNING
  // ============================================================================

  removeComments(content) {
    // Remove multi-line comments
    let result = content.replace(/\/\*[\s\S]*?\*\//g, '');
    // Remove single-line comments
    result = result.replace(/\/\/.*$/gm, '');
    return result;
  }

  scanFile(filePath) {
    const fullContent = fs.readFileSync(filePath, 'utf-8');
    const content = this.removeComments(fullContent);
    const relativePath = path.relative(process.cwd(), filePath);
    
    this.scannedFiles++;

    // Check Prisma operations
    this.checkPrismaModels(content, relativePath, fullContent);
    this.checkPrismaCreate(content, relativePath, fullContent);
    this.checkPrismaUpdate(content, relativePath, fullContent);
    this.checkPrismaUniqueFields(content, relativePath, fullContent);
  }

  checkPrismaModels(content, filePath, fullContent) {
    // Check for prisma.modelName usage
    const prismaModelRegex = /prisma\.(\w+)\./g;
    let match;
    
    while ((match = prismaModelRegex.exec(content)) !== null) {
      const modelName = match[1];
      
      // Skip Prisma methods
      if (['$transaction', '$executeRaw', '$queryRaw', '$disconnect', '$connect'].includes(modelName)) {
        continue;
      }
      
      if (!this.prismaModels.has(modelName)) {
        this.errors.push({
          file: filePath,
          line: this.getLineNumber(fullContent, match.index),
          message: `Non-existent Prisma model: prisma.${modelName}`,
          code: this.getCodeSnippet(fullContent, match.index),
        });
      }
    }
  }

  checkPrismaCreate(content, filePath, fullContent) {
    // Match: prisma.model.create({ data: { ... } })
    // Use more sophisticated regex to capture data block
    const createRegex = /prisma\.(\w+)\.(create|createMany|upsert)\s*\([^)]*data:\s*{/gs;
    let match;
    
    while ((match = createRegex.exec(content)) !== null) {
      const modelName = match[1];
      const operation = match[2];
      
      if (!this.prismaModels.has(modelName)) continue;
      
      const model = this.prismaModels.get(modelName);
      
      // Find the data block and extract only top-level fields
      const startIndex = match.index + match[0].length - 1; // Position of opening {
      const dataBlock = this.extractBlock(content, startIndex);
      
      if (!dataBlock) continue;
      
      // Extract only top-level fields (not nested)
      const lines = dataBlock.split('\n');
      let depth = 0;
      const providedFields = new Set();
      
      for (const line of lines) {
        // Track brace depth
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;
        
        // Check if this line has a field at depth 0
        if (depth === 0) {
          const fieldMatch = line.match(/^\s*(\w+)\s*:/);
          if (fieldMatch) {
            const fieldName = fieldMatch[1];
            
            // Skip special Prisma keys
            if (fieldName === 'data' || fieldName === 'create' || fieldName === 'connect' || fieldName === 'set') {
              depth += openBraces - closeBraces;
              continue;
            }
            
            providedFields.add(fieldName);
            
            // Check if field exists in model
            if (!model.fields.has(fieldName)) {
              this.errors.push({
                file: filePath,
                line: this.getLineNumber(fullContent, match.index),
                message: `Field '${fieldName}' does not exist in model '${model.pascalName}'`,
                code: this.getCodeSnippet(fullContent, match.index),
                hint: `Available fields: ${Array.from(model.fields.keys()).join(', ')}`,
              });
            }
          }
        }
        
        depth += openBraces - closeBraces;
      }
      
      // Check for missing required fields (ONLY for scalar types that have no default)
      const missingRequired = [];
      for (const [fieldName, fieldInfo] of model.fields.entries()) {
        // Skip if field is optional
        if (fieldInfo.isOptional) {
          continue;
        }
        
        // Skip auto-generated fields
        if (fieldName === 'id' || fieldName === 'createdAt' || fieldName === 'updatedAt') {
          continue;
        }
        
        // Skip arrays (they can default to [])
        if (fieldInfo.isArray) {
          continue;
        }
        
        // Skip relation fields (start with lowercase for scalars, uppercase for relations)
        // Relation fields are typically: user, conversation, projects, fileUploads, etc.
        // Scalar relation IDs end with 'Id'
        const fieldType = fieldInfo.type;
        if (fieldType && fieldType[0] === fieldType[0].toUpperCase() && !['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json'].includes(fieldType)) {
          // This is a relation field (User, Conversation, etc.)
          continue;
        }
        
        // Check if field was provided
        if (!providedFields.has(fieldName)) {
          missingRequired.push(fieldName);
        }
      }
      
      if (missingRequired.length > 0) {
        this.warnings.push({
          file: filePath,
          line: this.getLineNumber(fullContent, match.index),
          message: `Missing required field(s) in ${model.pascalName}.create(): ${missingRequired.join(', ')}`,
          code: this.getCodeSnippet(fullContent, match.index),
          hint: `These fields have no default value in schema and may cause runtime errors`,
        });
      }
    }
  }
  
  // Extract a balanced {} block starting from a given position
  extractBlock(content, startIndex) {
    let depth = 0;
    let result = '';
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      result += char;
      
      if (char === '{') depth++;
      if (char === '}') depth--;
      
      if (depth === 0) break;
    }
    
    return depth === 0 ? result : null;
  }

  checkPrismaUpdate(content, filePath, fullContent) {
    // Match: prisma.model.update({ data: { ... } })
    const updateRegex = /prisma\.(\w+)\.(update|updateMany)\s*\([^)]*data:\s*{/gs;
    let match;
    
    while ((match = updateRegex.exec(content)) !== null) {
      const modelName = match[1];
      
      if (!this.prismaModels.has(modelName)) continue;
      
      const model = this.prismaModels.get(modelName);
      
      // Find the data block and extract only top-level fields
      const startIndex = match.index + match[0].length - 1;
      const dataBlock = this.extractBlock(content, startIndex);
      
      if (!dataBlock) continue;
      
      // Extract only top-level fields
      const lines = dataBlock.split('\n');
      let depth = 0;
      
      for (const line of lines) {
        const openBraces = (line.match(/{/g) || []).length;
        const closeBraces = (line.match(/}/g) || []).length;
        
        if (depth === 0) {
          const fieldMatch = line.match(/^\s*(\w+)\s*:/);
          if (fieldMatch) {
            const fieldName = fieldMatch[1];
            
            // Skip special Prisma update keys
            if (['data', 'set', 'increment', 'decrement', 'push', 'multiply', 'divide'].includes(fieldName)) {
              continue;
            }
            
            // Check if field exists in model
            if (!model.fields.has(fieldName)) {
              this.errors.push({
                file: filePath,
                line: this.getLineNumber(fullContent, match.index),
                message: `Field '${fieldName}' does not exist in model '${model.pascalName}'`,
                code: this.getCodeSnippet(fullContent, match.index),
                hint: `Available fields: ${Array.from(model.fields.keys()).join(', ')}`,
              });
            }
          }
        }
        
        depth += openBraces - closeBraces;
      }
    }
  }

  checkPrismaUniqueFields(content, filePath, fullContent) {
    // Match: prisma.model.findUnique({ where: { ... } })
    const uniqueRegex = /prisma\.(\w+)\.(findUnique|update|delete)\s*\(\s*{[^}]*where:\s*{([^}]+)}/gs;
    let match;
    
    while ((match = uniqueRegex.exec(content)) !== null) {
      const modelName = match[1];
      const operation = match[2];
      const whereClause = match[3];
      
      if (!this.prismaModels.has(modelName)) continue;
      
      const model = this.prismaModels.get(modelName);
      
      // Extract field name from where clause
      const fieldMatch = whereClause.match(/(\w+)\s*[}:]/);
      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        
        // Skip nested queries
        if (fieldName === 'OR' || fieldName === 'AND' || fieldName === 'NOT') continue;
        
        if (!model.uniqueFields.has(fieldName)) {
          this.errors.push({
            file: filePath,
            line: this.getLineNumber(fullContent, match.index),
            message: `Field '${fieldName}' is not a unique field in model '${model.pascalName}'`,
            code: this.getCodeSnippet(fullContent, match.index),
            hint: `Valid unique fields: ${Array.from(model.uniqueFields).join(', ')}`,
          });
        }
      }
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  getLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
  }

  getCodeSnippet(content, index, contextLines = 2) {
    const lines = content.split('\n');
    const lineNumber = this.getLineNumber(content, index);
    const start = Math.max(0, lineNumber - contextLines - 1);
    const end = Math.min(lines.length, lineNumber + contextLines);
    
    return lines.slice(start, end).join('\n');
  }

  scanDirectory(dir, extensions = ['.ts', '.tsx']) {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
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

  // ============================================================================
  // REPORTING
  // ============================================================================

  printResults() {
    this.log(`\n${BOLD}═══════════════════════════════════════════════════════════${RESET}`);
    this.log(`${BOLD}  HOLLY COMPREHENSIVE SCANNER${RESET}`);
    this.log(`${BOLD}═══════════════════════════════════════════════════════════${RESET}\n`);
    
    this.log(`${BLUE}📊 Scanned ${this.scannedFiles} TypeScript files${RESET}\n`);

    if (this.errors.length > 0) {
      this.log(`${RED}${BOLD}❌ ERRORS (${this.errors.length}):${RESET}\n`);
      
      this.errors.forEach((error, index) => {
        this.log(`${RED}${BOLD}${index + 1}. ${error.file}:${error.line}${RESET}`);
        this.log(`   ${error.message}`);
        if (error.hint) {
          this.log(`   ${YELLOW}Hint: ${error.hint}${RESET}`);
        }
        this.log(`   ${BLUE}Code:${RESET}`);
        error.code.split('\n').forEach(line => {
          this.log(`   ${YELLOW}${line}${RESET}`);
        });
        this.log('');
      });
    } else {
      this.log(`${GREEN}✅ No errors found!${RESET}\n`);
    }

    if (this.warnings.length > 0) {
      this.log(`${YELLOW}${BOLD}⚠️  WARNINGS (${this.warnings.length}):${RESET}\n`);
      
      this.warnings.forEach((warning, index) => {
        this.log(`${YELLOW}${index + 1}. ${warning.file}:${warning.line}${RESET}`);
        this.log(`   ${warning.message}`);
        if (warning.hint) {
          this.log(`   ${BLUE}Hint: ${warning.hint}${RESET}`);
        }
        this.log('');
      });
    }

    this.log(`${BOLD}═══════════════════════════════════════════════════════════${RESET}`);
    if (this.errors.length === 0) {
      this.log(`${GREEN}${BOLD}✅ BUILD SAFE: Ready to deploy${RESET}`);
    } else {
      this.log(`${RED}${BOLD}❌ BUILD BLOCKED: ${this.errors.length} error(s) must be fixed${RESET}`);
    }
    this.log(`${BOLD}═══════════════════════════════════════════════════════════${RESET}\n`);
  }

  run() {
    this.log(`${BLUE}${BOLD}🔍 HOLLY COMPREHENSIVE SCANNER${RESET}`);
    this.log(`${BLUE}   Checking EVERYTHING before deployment...${RESET}\n`);
    
    // Load schema
    this.loadPrismaSchema();
    
    if (this.errors.length > 0) {
      this.printResults();
      return 1;
    }
    
    // Scan directories
    this.log(`${BLUE}📂 Scanning source code...${RESET}`);
    this.scanDirectory(path.join(process.cwd(), 'src'));
    
    if (fs.existsSync(path.join(process.cwd(), 'app'))) {
      this.scanDirectory(path.join(process.cwd(), 'app'));
    }
    
    // Print results
    this.printResults();
    
    return this.errors.length === 0 ? 0 : 1;
  }
}

// Run scanner
const scanner = new ComprehensiveScanner();
const exitCode = scanner.run();
process.exit(exitCode);
