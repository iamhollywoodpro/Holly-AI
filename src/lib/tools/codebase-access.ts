/**
 * Codebase Access Tool
 * Allows HOLLY to read and understand her own codebase
 */

import fs from 'fs';
import path from 'path';

const CODEBASE_ROOT = process.env.CODEBASE_ROOT || '/home/ubuntu/Holly-AI';

export interface FileInfo {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: Date;
}

export interface CodebaseStructure {
  directories: string[];
  files: FileInfo[];
  totalFiles: number;
  totalSize: number;
}

/**
 * Get the structure of HOLLY's codebase
 */
export async function getCodebaseStructure(relativePath: string = ''): Promise<CodebaseStructure> {
  const fullPath = path.join(CODEBASE_ROOT, relativePath);
  
  const structure: CodebaseStructure = {
    directories: [],
    files: [],
    totalFiles: 0,
    totalSize: 0
  };

  try {
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip node_modules, .git, and other irrelevant directories
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') {
        continue;
      }

      const entryPath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        structure.directories.push(entryPath);
      } else {
        const stats = fs.statSync(path.join(fullPath, entry.name));
        structure.files.push({
          path: entryPath,
          type: 'file',
          size: stats.size,
          lastModified: stats.mtime
        });
        structure.totalFiles++;
        structure.totalSize += stats.size;
      }
    }
  } catch (error) {
    console.error('[Codebase Access] Error reading directory:', error);
    throw error;
  }

  return structure;
}

/**
 * Read a specific file from HOLLY's codebase
 */
export async function readCodebaseFile(relativePath: string): Promise<string> {
  const fullPath = path.join(CODEBASE_ROOT, relativePath);
  
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    return content;
  } catch (error) {
    console.error('[Codebase Access] Error reading file:', error);
    throw error;
  }
}

/**
 * Search for files matching a pattern
 */
export async function searchCodebase(pattern: string, searchPath: string = ''): Promise<string[]> {
  const results: string[] = [];
  const fullPath = path.join(CODEBASE_ROOT, searchPath);

  function searchRecursive(dir: string) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        // Skip irrelevant directories
        if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.next') {
          continue;
        }

        const entryPath = path.join(dir, entry.name);
        const relativePath = path.relative(CODEBASE_ROOT, entryPath);

        if (entry.isDirectory()) {
          searchRecursive(entryPath);
        } else if (entry.name.includes(pattern)) {
          results.push(relativePath);
        }
      }
    } catch (error) {
      console.error('[Codebase Access] Error searching:', error);
    }
  }

  searchRecursive(fullPath);
  return results;
}

/**
 * Get HOLLY's capability summary by analyzing her codebase
 */
export async function getCapabilitySummary(): Promise<{
  tools: string[];
  apis: string[];
  features: string[];
  libraries: string[];
}> {
  const summary = {
    tools: [] as string[],
    apis: [] as string[],
    features: [] as string[],
    libraries: [] as string[]
  };

  try {
    // Scan for tools
    const toolsPath = path.join(CODEBASE_ROOT, 'src/lib/tools');
    if (fs.existsSync(toolsPath)) {
      const toolFiles = fs.readdirSync(toolsPath);
      summary.tools = toolFiles
        .filter(f => f.endsWith('.ts') && f !== 'index.ts')
        .map(f => f.replace('.ts', ''));
    }

    // Scan for API endpoints
    const apiPath = path.join(CODEBASE_ROOT, 'app/api');
    if (fs.existsSync(apiPath)) {
      function scanApis(dir: string, prefix: string = '') {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            scanApis(path.join(dir, entry.name), `${prefix}/${entry.name}`);
          } else if (entry.name === 'route.ts') {
            summary.apis.push(prefix);
          }
        }
      }
      scanApis(apiPath);
    }

    // Scan for feature modules
    const libPath = path.join(CODEBASE_ROOT, 'src/lib');
    if (fs.existsSync(libPath)) {
      const libDirs = fs.readdirSync(libPath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      summary.features = libDirs;
    }

    // Read package.json for libraries
    const packageJsonPath = path.join(CODEBASE_ROOT, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      summary.libraries = Object.keys(packageJson.dependencies || {});
    }
  } catch (error) {
    console.error('[Codebase Access] Error getting capability summary:', error);
  }

  return summary;
}

/**
 * Get HOLLY's current version and deployment info
 */
export async function getDeploymentInfo(): Promise<{
  version: string;
  lastDeployed?: Date;
  environment: string;
  gitCommit?: string;
}> {
  const info = {
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    gitCommit: undefined as string | undefined,
    lastDeployed: undefined as Date | undefined
  };

  try {
    // Try to read git commit
    const gitHeadPath = path.join(CODEBASE_ROOT, '.git/HEAD');
    if (fs.existsSync(gitHeadPath)) {
      const head = fs.readFileSync(gitHeadPath, 'utf-8').trim();
      if (head.startsWith('ref:')) {
        const refPath = path.join(CODEBASE_ROOT, '.git', head.substring(5));
        if (fs.existsSync(refPath)) {
          info.gitCommit = fs.readFileSync(refPath, 'utf-8').trim().substring(0, 7);
        }
      } else {
        info.gitCommit = head.substring(0, 7);
      }
    }

    // Try to read package.json version
    const packageJsonPath = path.join(CODEBASE_ROOT, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      info.version = packageJson.version || '1.0.0';
    }
  } catch (error) {
    console.error('[Codebase Access] Error getting deployment info:', error);
  }

  return info;
}
