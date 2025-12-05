/**
 * HOLLY's File System Access Layer
 * 
 * Provides safe access to source code files with security restrictions
 * Part of Phase 7: Foundation Layer
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { prisma } from '@/lib/db';

// ===========================
// Type Definitions (from architecture doc)
// ===========================

export interface FileReadResult {
  success: boolean;
  content?: string;
  error?: string;
  metadata?: FileMetadata;
}

export interface FileWriteResult {
  success: boolean;
  path?: string;
  error?: string;
  backup?: string;
}

export interface FileMetadata {
  path: string;
  size: number;
  modified: Date;
  type: string;
  lines: number;
}

export interface SearchResult {
  path: string;
  matches: SearchMatch[];
}

export interface SearchMatch {
  line: number;
  content: string;
  context: string;
}

// ===========================
// Security Configuration
// ===========================

const PROJECT_ROOT = '/home/user/Holly-AI';
const PROTECTED_PATHS = ['.env', '.env.local', 'prisma/schema.prisma'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const BACKUP_DIR = path.join(PROJECT_ROOT, '.backups');

// ===========================
// Security Helpers
// ===========================

/**
 * Validate and normalize file path
 * Prevents directory traversal attacks
 */
function validatePath(filepath: string): { valid: boolean; normalized?: string; error?: string } {
  try {
    // Normalize path
    const normalized = path.normalize(filepath);
    
    // Check for directory traversal
    if (normalized.includes('..')) {
      return { valid: false, error: 'Directory traversal not allowed' };
    }
    
    // Ensure path is within project root
    const absolutePath = path.isAbsolute(normalized) 
      ? normalized 
      : path.join(PROJECT_ROOT, normalized);
      
    if (!absolutePath.startsWith(PROJECT_ROOT)) {
      return { valid: false, error: 'Access outside project directory not allowed' };
    }
    
    return { valid: true, normalized: absolutePath };
  } catch (error) {
    return { valid: false, error: `Path validation failed: ${error}` };
  }
}

/**
 * Check if path is protected
 */
function isProtectedPath(filepath: string): boolean {
  const relativePath = path.relative(PROJECT_ROOT, filepath);
  return PROTECTED_PATHS.some(protectedPath => relativePath === protectedPath);
}

/**
 * Create backup of file before modification
 */
async function createBackup(filepath: string): Promise<string> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.basename(filepath);
  const backupPath = path.join(BACKUP_DIR, `${filename}.${timestamp}.backup`);
  
  // Ensure backup directory exists
  await fs.mkdir(BACKUP_DIR, { recursive: true });
  
  // Copy file to backup
  await fs.copyFile(filepath, backupPath);
  
  return backupPath;
}

/**
 * Log file operation to database
 */
async function logFileOperation(
  operation: string,
  filepath: string,
  success: boolean,
  error?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: null, // HOLLY's operations (system)
        action: `file_${operation}`,
        details: {
          filepath,
          success,
          error,
          source: 'HOLLY-FileSystem'
        },
        ipAddress: 'internal'
      }
    });
  } catch (logError) {
    console.error('[FileSystem] Failed to log operation:', logError);
    // Don't fail the operation if logging fails
  }
}

// ===========================
// Public API Functions
// ===========================

/**
 * Read source file contents
 */
export async function readSourceFile(
  filepath: string,
  options?: { includeMetadata?: boolean }
): Promise<FileReadResult> {
  try {
    // Validate path
    const validation = validatePath(filepath);
    if (!validation.valid) {
      await logFileOperation('read', filepath, false, validation.error);
      return { success: false, error: validation.error };
    }
    
    const normalizedPath = validation.normalized!;
    
    // Check if file exists
    try {
      await fs.access(normalizedPath);
    } catch {
      await logFileOperation('read', normalizedPath, false, 'File not found');
      return { success: false, error: 'File not found' };
    }
    
    // Read file
    const content = await fs.readFile(normalizedPath, 'utf-8');
    
    // Get metadata if requested
    let metadata: FileMetadata | undefined;
    if (options?.includeMetadata) {
      const stats = await fs.stat(normalizedPath);
      metadata = {
        path: normalizedPath,
        size: stats.size,
        modified: stats.mtime,
        type: path.extname(normalizedPath),
        lines: content.split('\n').length
      };
    }
    
    await logFileOperation('read', normalizedPath, true);
    
    return {
      success: true,
      content,
      metadata
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await logFileOperation('read', filepath, false, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * Write to source file with backup
 */
export async function writeSourceFile(
  filepath: string,
  content: string,
  options?: { backup?: boolean; validate?: boolean }
): Promise<FileWriteResult> {
  try {
    // Validate path
    const validation = validatePath(filepath);
    if (!validation.valid) {
      await logFileOperation('write', filepath, false, validation.error);
      return { success: false, error: validation.error };
    }
    
    const normalizedPath = validation.normalized!;
    
    // Check if protected
    if (isProtectedPath(normalizedPath)) {
      const error = 'Cannot modify protected file without admin approval';
      await logFileOperation('write', normalizedPath, false, error);
      return { success: false, error };
    }
    
    // Check file size
    if (content.length > MAX_FILE_SIZE) {
      const error = `File size exceeds maximum (${MAX_FILE_SIZE} bytes)`;
      await logFileOperation('write', normalizedPath, false, error);
      return { success: false, error };
    }
    
    // Create backup if file exists and backup is enabled (default true)
    let backupPath: string | undefined;
    const shouldBackup = options?.backup !== false;
    
    try {
      await fs.access(normalizedPath);
      if (shouldBackup) {
        backupPath = await createBackup(normalizedPath);
      }
    } catch {
      // File doesn't exist, no backup needed
    }
    
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(normalizedPath), { recursive: true });
    
    // Write file
    await fs.writeFile(normalizedPath, content, 'utf-8');
    
    await logFileOperation('write', normalizedPath, true);
    
    return {
      success: true,
      path: normalizedPath,
      backup: backupPath
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    await logFileOperation('write', filepath, false, errorMsg);
    return { success: false, error: errorMsg };
  }
}

/**
 * List directory contents
 */
export async function listDirectory(
  directoryPath: string,
  options?: { recursive?: boolean; pattern?: string }
): Promise<string[]> {
  try {
    // Validate path
    const validation = validatePath(directoryPath);
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    const normalizedPath = validation.normalized!;
    
    const files: string[] = [];
    
    const scanDirectory = async (dir: string): Promise<void> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip node_modules, .git, and hidden files
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }
        
        if (entry.isDirectory()) {
          if (options?.recursive) {
            await scanDirectory(fullPath);
          }
        } else {
          // Apply pattern filter if provided
          if (options?.pattern) {
            const regex = new RegExp(options.pattern);
            if (regex.test(entry.name)) {
              files.push(fullPath);
            }
          } else {
            files.push(fullPath);
          }
        }
      }
    }
    
    await scanDirectory(normalizedPath);
    
    return files;
  } catch (error) {
    console.error('[FileSystem] listDirectory error:', error);
    return [];
  }
}

/**
 * Search codebase for patterns
 */
export async function searchCodebase(
  query: string,
  options?: {
    path?: string;
    fileType?: string;
    caseSensitive?: boolean;
  }
): Promise<SearchResult[]> {
  try {
    const searchPath = options?.path || PROJECT_ROOT;
    const validation = validatePath(searchPath);
    
    if (!validation.valid) {
      throw new Error(validation.error);
    }
    
    const normalizedPath = validation.normalized!;
    const results: SearchResult[] = [];
    
    // Create regex for search
    const flags = options?.caseSensitive ? 'g' : 'gi';
    const searchRegex = new RegExp(query, flags);
    
    // Get files to search
    const files = await listDirectory(normalizedPath, {
      recursive: true,
      pattern: options?.fileType ? `\\.${options.fileType}$` : undefined
    });
    
    // Search each file
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        const matches: SearchMatch[] = [];
        
        lines.forEach((line, index) => {
          if (searchRegex.test(line)) {
            // Get context (previous and next line)
            const prevLine = index > 0 ? lines[index - 1] : '';
            const nextLine = index < lines.length - 1 ? lines[index + 1] : '';
            const context = `${prevLine}\n${line}\n${nextLine}`;
            
            matches.push({
              line: index + 1,
              content: line,
              context
            });
          }
        });
        
        if (matches.length > 0) {
          results.push({
            path: file,
            matches
          });
        }
      } catch {
        // Skip files that can't be read
        continue;
      }
    }
    
    return results;
  } catch (error) {
    console.error('[FileSystem] searchCodebase error:', error);
    return [];
  }
}

/**
 * Get file metadata
 */
export async function getFileMetadata(filepath: string): Promise<FileMetadata | null> {
  try {
    const validation = validatePath(filepath);
    if (!validation.valid) {
      return null;
    }
    
    const normalizedPath = validation.normalized!;
    const stats = await fs.stat(normalizedPath);
    const content = await fs.readFile(normalizedPath, 'utf-8');
    
    return {
      path: normalizedPath,
      size: stats.size,
      modified: stats.mtime,
      type: path.extname(normalizedPath),
      lines: content.split('\n').length
    };
  } catch (error) {
    console.error('[FileSystem] getFileMetadata error:', error);
    return null;
  }
}
