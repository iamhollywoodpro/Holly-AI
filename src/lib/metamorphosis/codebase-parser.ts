/**
 * HOLLY'S METAMORPHOSIS - PHASE 2: CODEBASE PARSER
 * 
 * This system parses HOLLY's codebase to extract structure, functions,
 * classes, imports, exports, and documentation. Uses TypeScript Compiler API
 * for accurate AST (Abstract Syntax Tree) analysis.
 * 
 * Purpose: Enable HOLLY to understand her own code structure and organization
 */

import * as ts from 'typescript';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logging-system';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ParsedFile {
  filePath: string;
  fileName: string;
  fileType: 'typescript' | 'javascript' | 'tsx' | 'jsx';
  purpose?: string; // Extracted from comments
  size: number;
  linesOfCode: number;
  exports: ParsedExport[];
  imports: ParsedImport[];
  functions: ParsedFunction[];
  classes: ParsedClass[];
  interfaces: ParsedInterface[];
  types: ParsedType[];
  constants: ParsedConstant[];
  comments: ParsedComment[];
}

export interface ParsedExport {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'const' | 'default';
  isDefault: boolean;
  description?: string;
}

export interface ParsedImport {
  importPath: string;
  imports: string[];
  isTypeOnly: boolean;
  isDefault: boolean;
}

export interface ParsedFunction {
  name: string;
  parameters: ParsedParameter[];
  returnType?: string;
  isAsync: boolean;
  isExported: boolean;
  description?: string;
  lineNumber: number;
}

export interface ParsedParameter {
  name: string;
  type?: string;
  isOptional: boolean;
  defaultValue?: string;
}

export interface ParsedClass {
  name: string;
  isExported: boolean;
  methods: ParsedFunction[];
  properties: ParsedProperty[];
  description?: string;
  lineNumber: number;
}

export interface ParsedProperty {
  name: string;
  type?: string;
  isPrivate: boolean;
  isReadonly: boolean;
}

export interface ParsedInterface {
  name: string;
  properties: ParsedProperty[];
  isExported: boolean;
  description?: string;
  lineNumber: number;
}

export interface ParsedType {
  name: string;
  definition: string;
  isExported: boolean;
  description?: string;
  lineNumber: number;
}

export interface ParsedConstant {
  name: string;
  value?: string;
  type?: string;
  isExported: boolean;
  lineNumber: number;
}

export interface ParsedComment {
  type: 'line' | 'block' | 'jsdoc';
  content: string;
  lineNumber: number;
}

// ============================================================================
// CODEBASE PARSER CLASS
// ============================================================================

export class CodebaseParser {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Parse a single TypeScript/JavaScript file
   */
  async parseFile(filePath: string): Promise<ParsedFile> {
    try {
      await logger.info('self_improvement', `Parsing file: ${filePath}`);

      // Read file content
      const content = fs.readFileSync(filePath, 'utf-8');
      const fileName = path.basename(filePath);
      const fileSize = Buffer.byteLength(content, 'utf-8');
      const linesOfCode = content.split('\n').length;

      // Determine file type
      const ext = path.extname(filePath);
      let fileType: ParsedFile['fileType'];
      if (ext === '.ts') fileType = 'typescript';
      else if (ext === '.tsx') fileType = 'tsx';
      else if (ext === '.js') fileType = 'javascript';
      else if (ext === '.jsx') fileType = 'jsx';
      else fileType = 'typescript'; // Default

      // Create TypeScript source file
      const sourceFile = ts.createSourceFile(
        fileName,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      // Extract all components
      const parsedFile: ParsedFile = {
        filePath,
        fileName,
        fileType,
        size: fileSize,
        linesOfCode,
        exports: [],
        imports: [],
        functions: [],
        classes: [],
        interfaces: [],
        types: [],
        constants: [],
        comments: [],
      };

      // Visit each node in the AST
      this.visitNode(sourceFile, parsedFile, sourceFile);

      // Extract purpose from top comments
      parsedFile.purpose = this.extractFilePurpose(parsedFile.comments);

      await logger.info('self_improvement', `Parsed file: ${fileName}`, {
        functions: parsedFile.functions.length,
        classes: parsedFile.classes.length,
        interfaces: parsedFile.interfaces.length,
      });

      return parsedFile;

    } catch (error) {
      await logger.error('self_improvement', `Failed to parse file: ${filePath}`, {}, {
        errorCode: (error as any).code,
        stackTrace: (error as any).stack,
      });
      throw error;
    }
  }

  /**
   * Visit AST node recursively
   */
  private visitNode(
    node: ts.Node,
    parsedFile: ParsedFile,
    sourceFile: ts.SourceFile
  ): void {
    // Import declarations
    if (ts.isImportDeclaration(node)) {
      this.extractImport(node, parsedFile);
    }

    // Export declarations
    if (ts.isExportDeclaration(node)) {
      this.extractExport(node, parsedFile);
    }

    // Function declarations
    if (ts.isFunctionDeclaration(node)) {
      this.extractFunction(node, parsedFile, sourceFile);
    }

    // Class declarations
    if (ts.isClassDeclaration(node)) {
      this.extractClass(node, parsedFile, sourceFile);
    }

    // Interface declarations
    if (ts.isInterfaceDeclaration(node)) {
      this.extractInterface(node, parsedFile, sourceFile);
    }

    // Type alias declarations
    if (ts.isTypeAliasDeclaration(node)) {
      this.extractType(node, parsedFile, sourceFile);
    }

    // Variable declarations (for constants)
    if (ts.isVariableStatement(node)) {
      this.extractConstants(node, parsedFile, sourceFile);
    }

    // Recurse into children
    ts.forEachChild(node, (child) => this.visitNode(child, parsedFile, sourceFile));
  }

  /**
   * Extract import statement
   */
  private extractImport(node: ts.ImportDeclaration, parsedFile: ParsedFile): void {
    const moduleSpecifier = node.moduleSpecifier;
    if (!ts.isStringLiteral(moduleSpecifier)) return;

    const importPath = moduleSpecifier.text;
    const importClause = node.importClause;
    if (!importClause) return;

    const imports: string[] = [];
    let isDefault = false;
    let isTypeOnly = node.importClause.isTypeOnly || false;

    // Default import
    if (importClause.name) {
      imports.push(importClause.name.text);
      isDefault = true;
    }

    // Named imports
    if (importClause.namedBindings) {
      if (ts.isNamedImports(importClause.namedBindings)) {
        importClause.namedBindings.elements.forEach((element) => {
          imports.push(element.name.text);
        });
      }
    }

    parsedFile.imports.push({
      importPath,
      imports,
      isTypeOnly,
      isDefault,
    });
  }

  /**
   * Extract export statement
   */
  private extractExport(node: ts.ExportDeclaration, parsedFile: ParsedFile): void {
    // Handle named exports
    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      node.exportClause.elements.forEach((element) => {
        parsedFile.exports.push({
          name: element.name.text,
          type: 'const', // Default type, will be refined
          isDefault: false,
        });
      });
    }
  }

  /**
   * Extract function declaration
   */
  private extractFunction(
    node: ts.FunctionDeclaration,
    parsedFile: ParsedFile,
    sourceFile: ts.SourceFile
  ): void {
    if (!node.name) return;

    const name = node.name.text;
    const parameters: ParsedParameter[] = [];
    const isAsync = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;
    const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;

    // Extract parameters
    node.parameters.forEach((param) => {
      if (ts.isIdentifier(param.name)) {
        parameters.push({
          name: param.name.text,
          type: param.type ? param.type.getText(sourceFile) : undefined,
          isOptional: param.questionToken !== undefined,
          defaultValue: param.initializer ? param.initializer.getText(sourceFile) : undefined,
        });
      }
    });

    // Extract return type
    const returnType = node.type ? node.type.getText(sourceFile) : undefined;

    // Get line number
    const lineNumber = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

    parsedFile.functions.push({
      name,
      parameters,
      returnType,
      isAsync,
      isExported,
      lineNumber,
    });
  }

  /**
   * Extract class declaration
   */
  private extractClass(
    node: ts.ClassDeclaration,
    parsedFile: ParsedFile,
    sourceFile: ts.SourceFile
  ): void {
    if (!node.name) return;

    const name = node.name.text;
    const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
    const lineNumber = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

    const methods: ParsedFunction[] = [];
    const properties: ParsedProperty[] = [];

    // Extract methods and properties
    node.members.forEach((member) => {
      if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
        const methodName = member.name.text;
        const parameters: ParsedParameter[] = [];
        const isAsync = member.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword) || false;

        member.parameters.forEach((param) => {
          if (ts.isIdentifier(param.name)) {
            parameters.push({
              name: param.name.text,
              type: param.type ? param.type.getText(sourceFile) : undefined,
              isOptional: param.questionToken !== undefined,
            });
          }
        });

        const returnType = member.type ? member.type.getText(sourceFile) : undefined;
        const methodLine = sourceFile.getLineAndCharacterOfPosition(member.getStart()).line + 1;

        methods.push({
          name: methodName,
          parameters,
          returnType,
          isAsync,
          isExported: false,
          lineNumber: methodLine,
        });
      }

      if (ts.isPropertyDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
        const propName = member.name.text;
        const isPrivate = member.modifiers?.some(m => m.kind === ts.SyntaxKind.PrivateKeyword) || false;
        const isReadonly = member.modifiers?.some(m => m.kind === ts.SyntaxKind.ReadonlyKeyword) || false;
        const type = member.type ? member.type.getText(sourceFile) : undefined;

        properties.push({
          name: propName,
          type,
          isPrivate,
          isReadonly,
        });
      }
    });

    parsedFile.classes.push({
      name,
      isExported,
      methods,
      properties,
      lineNumber,
    });
  }

  /**
   * Extract interface declaration
   */
  private extractInterface(
    node: ts.InterfaceDeclaration,
    parsedFile: ParsedFile,
    sourceFile: ts.SourceFile
  ): void {
    const name = node.name.text;
    const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
    const lineNumber = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

    const properties: ParsedProperty[] = [];

    node.members.forEach((member) => {
      if (ts.isPropertySignature(member) && member.name && ts.isIdentifier(member.name)) {
        const propName = member.name.text;
        const type = member.type ? member.type.getText(sourceFile) : undefined;

        properties.push({
          name: propName,
          type,
          isPrivate: false,
          isReadonly: member.modifiers?.some(m => m.kind === ts.SyntaxKind.ReadonlyKeyword) || false,
        });
      }
    });

    parsedFile.interfaces.push({
      name,
      properties,
      isExported,
      lineNumber,
    });
  }

  /**
   * Extract type alias
   */
  private extractType(
    node: ts.TypeAliasDeclaration,
    parsedFile: ParsedFile,
    sourceFile: ts.SourceFile
  ): void {
    const name = node.name.text;
    const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;
    const definition = node.type.getText(sourceFile);
    const lineNumber = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;

    parsedFile.types.push({
      name,
      definition,
      isExported,
      lineNumber,
    });
  }

  /**
   * Extract constants from variable statements
   */
  private extractConstants(
    node: ts.VariableStatement,
    parsedFile: ParsedFile,
    sourceFile: ts.SourceFile
  ): void {
    const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) || false;

    node.declarationList.declarations.forEach((declaration) => {
      if (ts.isIdentifier(declaration.name)) {
        const name = declaration.name.text;
        const value = declaration.initializer ? declaration.initializer.getText(sourceFile) : undefined;
        const type = declaration.type ? declaration.type.getText(sourceFile) : undefined;
        const lineNumber = sourceFile.getLineAndCharacterOfPosition(declaration.getStart()).line + 1;

        parsedFile.constants.push({
          name,
          value,
          type,
          isExported,
          lineNumber,
        });
      }
    });
  }

  /**
   * Extract file purpose from top comments
   */
  private extractFilePurpose(comments: ParsedComment[]): string | undefined {
    // Look for the first block comment or JSDoc at the top of the file
    const topComments = comments.filter(c => c.lineNumber <= 10);
    const purposeComment = topComments.find(c => 
      c.type === 'block' || c.type === 'jsdoc'
    );

    if (purposeComment) {
      // Extract first meaningful line
      const lines = purposeComment.content.split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('*') && !l.startsWith('/'));
      
      return lines[0] || undefined;
    }

    return undefined;
  }

  /**
   * Parse multiple files in a directory
   */
  async parseDirectory(directoryPath: string, recursive: boolean = true): Promise<ParsedFile[]> {
    const parsedFiles: ParsedFile[] = [];

    try {
      await this.scanDirectory(directoryPath, parsedFiles, recursive);
      await logger.info('self_improvement', `Parsed ${parsedFiles.length} files from ${directoryPath}`);
      return parsedFiles;
    } catch (error) {
      await logger.error('self_improvement', `Failed to parse directory: ${directoryPath}`, {}, {
        errorCode: (error as any).code,
        stackTrace: (error as any).stack,
      });
      throw error;
    }
  }

  /**
   * Recursively scan directory for TypeScript/JavaScript files
   */
  private async scanDirectory(
    dir: string,
    parsedFiles: ParsedFile[],
    recursive: boolean
  ): Promise<void> {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, .next, etc.
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git') {
        continue;
      }

      if (entry.isDirectory() && recursive) {
        await this.scanDirectory(fullPath, parsedFiles, recursive);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx'].includes(ext)) {
          try {
            const parsed = await this.parseFile(fullPath);
            parsedFiles.push(parsed);
          } catch (error) {
            // Log but don't fail entire directory scan
            await logger.warn('self_improvement', `Skipped file ${entry.name}: ${error}`);
          }
        }
      }
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CodebaseParser;
