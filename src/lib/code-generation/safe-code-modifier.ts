/**
 * HOLLY's Safe Code Modification System
 * 
 * Provides TypeScript-aware code editing with safety checks and automatic rollback
 * 
 * Phase 5: Code Generation & Modification
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { prisma } from '@/lib/database/prisma';
import { automatedTesting } from './automated-testing';
import * as ts from 'typescript';

// ===========================
// Types & Interfaces
// ===========================

export interface CodeModification {
  id: string;
  filePath: string;
  changes: CodeChange[];
  reason: string;
  author: 'holly' | 'user';
  timestamp: Date;
}

export interface CodeChange {
  type: 'add' | 'modify' | 'delete' | 'refactor';
  target: string; // Line number, function name, or code block
  oldCode?: string;
  newCode?: string;
  description: string;
}

export interface ModificationResult {
  success: boolean;
  modification: CodeModification;
  backupPath?: string;
  testsRun: boolean;
  testsPassed: boolean;
  rolledBack: boolean;
  error?: string;
  warnings: string[];
}

export interface FileBackup {
  originalPath: string;
  backupPath: string;
  content: string;
  timestamp: Date;
}

// ===========================
// Safe Code Modifier Class
// ===========================

export class SafeCodeModifier {
  private readonly BACKUP_DIR = '.holly-backups';
  private readonly MAX_BACKUPS_PER_FILE = 10;
  private backups: Map<string, FileBackup[]> = new Map();

  /**
   * Safely modify a code file with automatic testing and rollback
   */
  async modifyCode(modification: CodeModification, testBeforeApply: boolean = true): Promise<ModificationResult> {
    const result: ModificationResult = {
      success: false,
      modification,
      testsRun: false,
      testsPassed: false,
      rolledBack: false,
      warnings: []
    };

    try {
      console.log(`[CODE-MOD] Modifying ${modification.filePath}`);
      console.log(`[CODE-MOD] Reason: ${modification.reason}`);

      // Step 1: Validate file exists
      const fileExists = await this.fileExists(modification.filePath);
      if (!fileExists) {
        throw new Error(`File not found: ${modification.filePath}`);
      }

      // Step 2: Create backup
      const backup = await this.createBackup(modification.filePath);
      result.backupPath = backup.backupPath;
      console.log(`[CODE-MOD] Backup created: ${backup.backupPath}`);

      // Step 3: Read original file
      const originalContent = await fs.readFile(modification.filePath, 'utf-8');

      // Step 4: Apply changes
      const newContent = await this.applyChanges(originalContent, modification.changes);

      // Step 5: Validate TypeScript syntax
      const syntaxValid = this.validateTypeScriptSyntax(newContent, modification.filePath);
      if (!syntaxValid) {
        throw new Error('Modified code has TypeScript syntax errors');
      }

      // Step 6: Write modified content
      await fs.writeFile(modification.filePath, newContent, 'utf-8');
      console.log(`[CODE-MOD] Changes written to ${modification.filePath}`);

      // Step 7: Run tests if requested
      if (testBeforeApply) {
        console.log('[CODE-MOD] Running pre-deployment tests...');
        result.testsRun = true;

        const testResult = await automatedTesting.runPreDeploymentTests();
        result.testsPassed = testResult.overallPassed;

        if (!testResult.overallPassed) {
          console.error('[CODE-MOD] Tests failed! Rolling back...');
          await this.rollback(backup);
          result.rolledBack = true;
          throw new Error('Tests failed after code modification');
        }

        console.log('[CODE-MOD] ✅ All tests passed!');
      }

      // Success!
      result.success = true;
      
      // Record successful modification
      await this.recordModification(modification, result);

      return result;

    } catch (error) {
      console.error('[CODE-MOD] Error during modification:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';

      // Ensure rollback if we have a backup
      if (result.backupPath && !result.rolledBack) {
        try {
          const backup = this.backups.get(modification.filePath)?.[0];
          if (backup) {
            await this.rollback(backup);
            result.rolledBack = true;
          }
        } catch (rollbackError) {
          console.error('[CODE-MOD] Rollback failed:', rollbackError);
          result.warnings.push('Failed to rollback changes - manual intervention required');
        }
      }

      // Record failed modification
      await this.recordModification(modification, result);

      return result;
    }
  }

  /**
   * Apply a list of changes to code content
   */
  private async applyChanges(content: string, changes: CodeChange[]): Promise<string> {
    let modifiedContent = content;
    const lines = content.split('\n');

    for (const change of changes) {
      console.log(`[CODE-MOD] Applying ${change.type}: ${change.description}`);

      switch (change.type) {
        case 'add':
          modifiedContent = this.addCode(modifiedContent, change);
          break;
        
        case 'modify':
          modifiedContent = this.modifyCode(modifiedContent, change);
          break;
        
        case 'delete':
          modifiedContent = this.deleteCode(modifiedContent, change);
          break;
        
        case 'refactor':
          modifiedContent = this.refactorCode(modifiedContent, change);
          break;
      }
    }

    return modifiedContent;
  }

  /**
   * Add code to file
   */
  private addCode(content: string, change: CodeChange): string {
    if (!change.newCode) {
      throw new Error('newCode required for add operation');
    }

    // If target is a line number
    if (/^\d+$/.test(change.target)) {
      const lineNumber = parseInt(change.target, 10);
      const lines = content.split('\n');
      lines.splice(lineNumber, 0, change.newCode);
      return lines.join('\n');
    }

    // If target is "end", append to end
    if (change.target === 'end') {
      return content + '\n' + change.newCode;
    }

    // If target is a function/class name, add after it
    const functionRegex = new RegExp(`(function\\s+${change.target}|const\\s+${change.target}\\s*=).*?\\{[^}]*\\}`, 's');
    const match = content.match(functionRegex);
    
    if (match && match.index !== undefined) {
      const insertPosition = match.index + match[0].length;
      return content.slice(0, insertPosition) + '\n\n' + change.newCode + content.slice(insertPosition);
    }

    throw new Error(`Could not find insertion point: ${change.target}`);
  }

  /**
   * Modify existing code
   */
  private modifyCode(content: string, change: CodeChange): string {
    if (!change.oldCode || !change.newCode) {
      throw new Error('Both oldCode and newCode required for modify operation');
    }

    // Direct string replacement
    if (content.includes(change.oldCode)) {
      return content.replace(change.oldCode, change.newCode);
    }

    throw new Error(`Could not find code to modify: ${change.oldCode.substring(0, 50)}...`);
  }

  /**
   * Delete code from file
   */
  private deleteCode(content: string, change: CodeChange): string {
    if (!change.oldCode) {
      throw new Error('oldCode required for delete operation');
    }

    if (content.includes(change.oldCode)) {
      return content.replace(change.oldCode, '');
    }

    throw new Error(`Could not find code to delete: ${change.oldCode.substring(0, 50)}...`);
  }

  /**
   * Refactor code (more complex modifications)
   */
  private refactorCode(content: string, change: CodeChange): string {
    // For now, treat refactoring as modify
    return this.modifyCode(content, change);
  }

  /**
   * Validate TypeScript syntax
   */
  private validateTypeScriptSyntax(code: string, fileName: string): boolean {
    try {
      const sourceFile = ts.createSourceFile(
        fileName,
        code,
        ts.ScriptTarget.Latest,
        true
      );

      // Check for syntax errors
      const diagnostics = (sourceFile as any).parseDiagnostics || [];
      
      if (diagnostics.length > 0) {
        console.error('[CODE-MOD] TypeScript syntax errors:');
        diagnostics.forEach((diag: any) => {
          console.error(`  - ${diag.messageText}`);
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('[CODE-MOD] Error validating syntax:', error);
      return false;
    }
  }

  /**
   * Create a backup of a file
   */
  private async createBackup(filePath: string): Promise<FileBackup> {
    const content = await fs.readFile(filePath, 'utf-8');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(filePath);
    const backupPath = path.join(this.BACKUP_DIR, `${fileName}.${timestamp}.backup`);

    // Ensure backup directory exists
    await fs.mkdir(this.BACKUP_DIR, { recursive: true });

    // Write backup
    await fs.writeFile(backupPath, content, 'utf-8');

    const backup: FileBackup = {
      originalPath: filePath,
      backupPath,
      content,
      timestamp: new Date()
    };

    // Store backup reference
    const fileBackups = this.backups.get(filePath) || [];
    fileBackups.unshift(backup);
    
    // Keep only max backups per file
    if (fileBackups.length > this.MAX_BACKUPS_PER_FILE) {
      const oldBackup = fileBackups.pop();
      if (oldBackup) {
        await fs.unlink(oldBackup.backupPath).catch(() => {});
      }
    }
    
    this.backups.set(filePath, fileBackups);

    return backup;
  }

  /**
   * Rollback to a backup
   */
  private async rollback(backup: FileBackup): Promise<void> {
    console.log(`[CODE-MOD] Rolling back ${backup.originalPath} to ${backup.backupPath}`);
    await fs.writeFile(backup.originalPath, backup.content, 'utf-8');
  }

  /**
   * Check if file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Record modification in database
   */
  private async recordModification(
    modification: CodeModification,
    result: ModificationResult
  ): Promise<void> {
    try {
      await prisma.experience.create({
        data: {
          action: 'code_modification',
          context: {
            filePath: modification.filePath,
            reason: modification.reason,
            changesCount: modification.changes.length,
            author: modification.author
          },
          outcome: result.success ? 'success' : 'failure',
          results: {
            testsRun: result.testsRun,
            testsPassed: result.testsPassed,
            rolledBack: result.rolledBack,
            warnings: result.warnings
          },
          learnings: result.success
            ? [`Successfully modified ${modification.filePath}: ${modification.reason}`]
            : [`Failed to modify ${modification.filePath}: ${result.error}`]
        }
      });
    } catch (error) {
      console.error('[CODE-MOD] Failed to record modification:', error);
    }
  }

  /**
   * Get modification statistics
   */
  async getModificationStatistics(): Promise<any> {
    try {
      const experiences = await prisma.experience.findMany({
        where: { action: 'code_modification' },
        orderBy: { timestamp: 'desc' },
        take: 100
      });

      const total = experiences.length;
      const successful = experiences.filter(e => e.outcome === 'success').length;
      const successRate = total > 0 ? successful / total : 0;

      return {
        totalModifications: total,
        successfulModifications: successful,
        failedModifications: total - successful,
        successRate,
        recentModifications: experiences.slice(0, 10).map(e => ({
          file: (e.context as any).filePath || 'Unknown',
          reason: (e.context as any).reason || 'Unknown',
          outcome: e.outcome,
          timestamp: e.timestamp
        }))
      };
    } catch (error) {
      console.error('[CODE-MOD] Failed to get statistics:', error);
      return {
        totalModifications: 0,
        successfulModifications: 0,
        failedModifications: 0,
        successRate: 0,
        recentModifications: []
      };
    }
  }

  /**
   * Get available backups for a file
   */
  getBackups(filePath: string): FileBackup[] {
    return this.backups.get(filePath) || [];
  }
}

// ===========================
// Export Singleton Instance
// ===========================

export const safeCodeModifier = new SafeCodeModifier();
