/**
 * Phase 3: Code Patcher
 * Apply targeted edits to files with fuzzy matching
 */

import * as fs from 'fs';
import * as path from 'path';

export interface PatchRequest {
  filePath: string;
  oldContent: string;
  newContent: string;
  replaceAll?: boolean;
}

export interface PatchResult {
  success: boolean;
  filePath: string;
  matches: number;
  replaced: number;
  diff?: string;
  error?: string;
}

export interface InsertRequest {
  filePath: string;
  content: string;
  position: 'start' | 'end' | 'after' | 'before';
  anchor?: string;
}

/**
 * Apply a patch to a file - find old content and replace with new content
 * Uses fuzzy matching to handle minor whitespace differences
 */
export function patchFile(request: PatchRequest): PatchResult {
  const { filePath, oldContent, newContent, replaceAll = false } = request;

  try {
    const fullPath = path.resolve(filePath);

    if (!fs.existsSync(fullPath)) {
      return {
        success: false,
        filePath,
        matches: 0,
        replaced: 0,
        error: `File not found: ${filePath}`,
      };
    }

    const fileContent = fs.readFileSync(fullPath, 'utf-8');

    // Try exact match first
    let matchCount = countOccurrences(fileContent, oldContent);

    // If no exact match, try fuzzy matching
    if (matchCount === 0) {
      const fuzzyResult = fuzzyFind(fileContent, oldContent);
      if (fuzzyResult) {
        const result = applyFuzzyPatch(fileContent, fuzzyResult, newContent);
        fs.writeFileSync(fullPath, result.content, 'utf-8');
        return {
          success: true,
          filePath,
          matches: 1,
          replaced: 1,
          diff: generateDiff(fileContent, result.content),
        };
      }

      return {
        success: false,
        filePath,
        matches: 0,
        replaced: 0,
        error: 'Could not find the specified content in the file (tried exact and fuzzy matching)',
      };
    }

    if (matchCount > 1 && !replaceAll) {
      return {
        success: false,
        filePath,
        matches: matchCount,
        replaced: 0,
        error: `Found ${matchCount} matches. Use replaceAll: true to replace all, or provide more context to make the match unique.`,
      };
    }

    // Apply the replacement
    const newFileContent = replaceAll
      ? fileContent.split(oldContent).join(newContent)
      : fileContent.replace(oldContent, newContent);

    fs.writeFileSync(fullPath, newFileContent, 'utf-8');

    const replacedCount = replaceAll ? matchCount : 1;

    return {
      success: true,
      filePath,
      matches: matchCount,
      replaced: replacedCount,
      diff: generateDiff(fileContent, newFileContent),
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      filePath,
      matches: 0,
      replaced: 0,
      error: errMsg,
    };
  }
}

/**
 * Insert content at a specific position in a file
 */
export function insertContent(request: InsertRequest): PatchResult {
  const { filePath, content, position, anchor } = request;

  try {
    const fullPath = path.resolve(filePath);

    if (!fs.existsSync(fullPath)) {
      return {
        success: false,
        filePath,
        matches: 0,
        replaced: 0,
        error: `File not found: ${filePath}`,
      };
    }

    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    let newContent: string;

    switch (position) {
      case 'start':
        newContent = content + '\n' + fileContent;
        break;
      case 'end':
        newContent = fileContent + '\n' + content;
        break;
      case 'after':
        if (!anchor) {
          return { success: false, filePath, matches: 0, replaced: 0, error: 'Anchor required for after/before insertion' };
        }
        const afterIdx = fileContent.indexOf(anchor);
        if (afterIdx === -1) {
          return { success: false, filePath, matches: 0, replaced: 0, error: `Anchor not found: "${anchor.substring(0, 50)}..."` };
        }
        const insertAfterIdx = afterIdx + anchor.length;
        newContent = fileContent.slice(0, insertAfterIdx) + '\n' + content + fileContent.slice(insertAfterIdx);
        break;
      case 'before':
        if (!anchor) {
          return { success: false, filePath, matches: 0, replaced: 0, error: 'Anchor required for after/before insertion' };
        }
        const beforeIdx = fileContent.indexOf(anchor);
        if (beforeIdx === -1) {
          return { success: false, filePath, matches: 0, replaced: 0, error: `Anchor not found: "${anchor.substring(0, 50)}..."` };
        }
        newContent = fileContent.slice(0, beforeIdx) + content + '\n' + fileContent.slice(beforeIdx);
        break;
      default:
        return { success: false, filePath, matches: 0, replaced: 0, error: `Invalid position: ${position}` };
    }

    fs.writeFileSync(fullPath, newContent, 'utf-8');

    return {
      success: true,
      filePath,
      matches: 1,
      replaced: 1,
      diff: generateDiff(fileContent, newContent),
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      filePath,
      matches: 0,
      replaced: 0,
      error: errMsg,
    };
  }
}

function countOccurrences(text: string, search: string): number {
  let count = 0;
  let pos = 0;
  while ((pos = text.indexOf(search, pos)) !== -1) {
    count++;
    pos += search.length;
  }
  return count;
}

interface FuzzyMatch {
  start: number;
  end: number;
  score: number;
}

function fuzzyFind(content: string, search: string): FuzzyMatch | null {
  // Normalize whitespace for fuzzy matching
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
  const normalizedSearch = normalize(search);
  const normalizedContent = normalize(content);

  const idx = normalizedContent.indexOf(normalizedSearch);
  if (idx === -1) return null;

  // Try to map back to original positions
  // Simple approach: find the start marker in original content
  const searchLines = search.split('\n').filter(l => l.trim());
  if (searchLines.length === 0) return null;

  const firstLine = searchLines[0].trim();
  const lastLine = searchLines[searchLines.length - 1].trim();

  const startIdx = content.indexOf(firstLine);
  if (startIdx === -1) return null;

  const afterStart = content.substring(startIdx);
  const endIdx = afterStart.lastIndexOf(lastLine);
  if (endIdx === -1) return null;

  const endPosition = startIdx + endIdx + lastLine.length;

  return {
    start: startIdx,
    end: endPosition,
    score: 0.8, // fuzzy match confidence
  };
}

function applyFuzzyPatch(content: string, match: FuzzyMatch, replacement: string): { content: string } {
  const newContent = content.slice(0, match.start) + replacement + content.slice(match.end);
  return { content: newContent };
}

function generateDiff(oldContent: string, newContent: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const maxLines = Math.max(oldLines.length, newLines.length);
  const diffLines: string[] = [];
  let changeCount = 0;

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine !== newLine) {
      changeCount++;
      if (changeCount <= 20) { // Limit diff size
        if (oldLine !== undefined) diffLines.push(`- ${oldLine}`);
        if (newLine !== undefined) diffLines.push(`+ ${newLine}`);
      }
    }
  }

  if (changeCount > 20) {
    diffLines.push(`... and ${changeCount - 20} more changes`);
  }

  return diffLines.join('\n');
}
