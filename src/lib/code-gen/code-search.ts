/**
 * Phase 3: Code Search Tool
 * Search across codebase for context-aware code understanding
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface SearchResult {
  file: string;
  line: number;
  column?: number;
  content: string;
  context?: string;
  matchType: 'exact' | 'pattern' | 'file';
}

export interface SearchOptions {
  query: string;
  directory?: string;
  filePattern?: string;
  maxResults?: number;
  contextLines?: number;
  caseSensitive?: boolean;
  includeHidden?: boolean;
}

export interface FileSearchResult {
  path: string;
  name: string;
  extension: string;
  size: number;
  modified: string;
  type: 'file' | 'directory';
}

export function searchCode(options: SearchOptions): SearchResult[] {
  const {
    query,
    directory = '.',
    filePattern,
    maxResults = 50,
    contextLines = 2,
    caseSensitive = false,
  } = options;

  const results: SearchResult[] = [];

  try {
    // Use ripgrep if available, fallback to grep
    let rgAvailable = false;
    try {
      execSync('which rg', { encoding: 'utf-8', stdio: 'pipe' });
      rgAvailable = true;
    } catch { /* rg not available */ }

    if (rgAvailable) {
      return searchWithRg(options);
    }

    // Fallback: manual recursive search
    const absDir = path.resolve(directory);
    searchDirectory(absDir, query, results, {
      filePattern,
      maxResults,
      contextLines,
      caseSensitive,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    results.push({
      file: 'search',
      line: 0,
      content: `Search error: ${errMsg}`,
      matchType: 'exact',
    });
  }

  return results.slice(0, maxResults);
}

function searchWithRg(options: SearchOptions): SearchResult[] {
  const {
    query,
    directory = '.',
    filePattern,
    maxResults = 50,
    contextLines = 2,
    caseSensitive = false,
  } = options;

  const args: string[] = [];

  if (!caseSensitive) args.push('-i');
  if (contextLines > 0) {
    args.push('-C', String(contextLines));
  }
  args.push('-n'); // line numbers
  args.push('--max-count', String(maxResults));
  if (filePattern) {
    args.push('-g', filePattern);
  }
  // Exclude common non-code directories
  args.push('-g', '!node_modules');
  args.push('-g', '!.next');
  args.push('-g', '!.git');
  args.push('-g', '!dist');

  try {
    const output = execSync(
      `rg ${args.map(a => `'${a}'`).join(' ')} -- '${query.replace(/'/g, "'\\''")}' '${directory}'`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, stdio: 'pipe' }
    );

    return parseGrepOutput(output);
  } catch (error: any) {
    // rg returns exit code 1 when no matches found
    if (error.status === 1) return [];
    throw error;
  }
}

function parseGrepOutput(output: string): SearchResult[] {
  const results: SearchResult[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;
    const match = line.match(/^([^:]+):(\d+)[-.]*(\d+)?:?(.*)$/);
    if (match) {
      results.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: match[3] ? parseInt(match[3], 10) : undefined,
        content: match[4] || line,
        matchType: 'pattern',
      });
    }
  }

  return results;
}

function searchDirectory(
  dir: string,
  query: string,
  results: SearchResult[],
  options: { filePattern?: string; maxResults: number; contextLines: number; caseSensitive: boolean },
): void {
  if (results.length >= options.maxResults) return;

  const skipDirs = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage']);

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch { return; }

  const queryLower = query.toLowerCase();

  for (const entry of entries) {
    if (results.length >= options.maxResults) break;

    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) {
        searchDirectory(path.join(dir, entry.name), query, results, options);
      }
    } else if (entry.isFile()) {
      const fullPath = path.join(dir, entry.name);

      // Check file pattern
      if (options.filePattern) {
        const pattern = options.filePattern.replace(/\*/g, '.*');
        if (!new RegExp(pattern).test(entry.name)) continue;
      }

      // Skip binary files
      if (/\.(png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|mp4|mp3|zip|tar|gz)$/i.test(entry.name)) continue;

      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length && results.length < options.maxResults; i++) {
          const line = lines[i];
          const matches = options.caseSensitive
            ? line.includes(query)
            : line.toLowerCase().includes(queryLower);

          if (matches) {
            const contextStart = Math.max(0, i - options.contextLines);
            const contextEnd = Math.min(lines.length - 1, i + options.contextLines);
            const contextLines = lines.slice(contextStart, contextEnd + 1).join('\n');

            results.push({
              file: fullPath,
              line: i + 1,
              content: line.trim(),
              context: contextLines,
              matchType: 'pattern',
            });
          }
        }
      } catch { /* skip unreadable files */ }
    }
  }
}

export function searchFiles(
  directory: string = '.',
  pattern?: string,
  maxResults: number = 100,
): FileSearchResult[] {
  const results: FileSearchResult[] = [];
  const skipDirs = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage']);

  function walk(dir: string) {
    if (results.length >= maxResults) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch { return; }

    for (const entry of entries) {
      if (results.length >= maxResults) break;

      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) {
          walk(fullPath);
        }
      } else {
        if (pattern) {
          const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
          if (!regex.test(entry.name)) continue;
        }

        const stat = fs.statSync(fullPath);
        results.push({
          path: fullPath,
          name: entry.name,
          extension: path.extname(entry.name),
          size: stat.size,
          modified: stat.mtime.toISOString(),
          type: 'file',
        });
      }
    }
  }

  walk(path.resolve(directory));
  return results;
}

export function getFileTree(directory: string = '.', maxDepth: number = 3): string {
  const skipDirs = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage']);
  const lines: string[] = [];

  function walk(dir: string, prefix: string, depth: number) {
    if (depth > maxDepth) return;

    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch { return; }

    // Sort: directories first, then files
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    const filtered = entries.filter(e => !skipDirs.has(e.name) && !e.name.startsWith('.'));
    const visible = filtered.slice(0, 30); // Limit per directory

    for (let i = 0; i < visible.length; i++) {
      const entry = visible[i];
      const isLast = i === visible.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';

      lines.push(`${prefix}${connector}${entry.name}`);

      if (entry.isDirectory()) {
        walk(path.join(dir, entry.name), `${prefix}${childPrefix}`, depth + 1);
      }
    }

    if (filtered.length > 30) {
      lines.push(`${prefix}└── ... and ${filtered.length - 30} more`);
    }
  }

  lines.push(path.basename(path.resolve(directory)));
  walk(path.resolve(directory), '', 0);
  return lines.join('\n');
}
