/**
 * Smart Commit Message Generator
 * Generates conventional commit messages based on file changes
 */

interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
}

interface CommitSuggestion {
  type: string;
  scope?: string;
  subject: string;
  body?: string;
  fullMessage: string;
}

/**
 * Analyze file changes and generate a smart commit message
 */
export function generateCommitMessage(files: FileChange[]): CommitSuggestion {
  if (files.length === 0) {
    return {
      type: 'chore',
      subject: 'update files',
      fullMessage: 'chore: update files',
    };
  }

  // Determine commit type based on file patterns
  const commitType = determineCommitType(files);
  
  // Determine scope based on file paths
  const scope = determineScope(files);
  
  // Generate subject line
  const subject = generateSubject(files, commitType);
  
  // Generate body with file stats
  const body = generateBody(files);
  
  // Build full message
  const fullMessage = buildFullMessage(commitType, scope, subject, body);
  
  return {
    type: commitType,
    scope,
    subject,
    body,
    fullMessage,
  };
}

/**
 * Determine commit type based on file patterns
 */
function determineCommitType(files: FileChange[]): string {
  const hasNewFiles = files.some(f => f.status === 'added');
  const hasDeletedFiles = files.some(f => f.status === 'removed');
  const hasTests = files.some(f => f.filename.includes('test') || f.filename.includes('spec'));
  const hasDocs = files.some(f => 
    f.filename.endsWith('.md') || 
    f.filename.includes('README') ||
    f.filename.includes('doc')
  );
  const hasStyles = files.some(f => 
    f.filename.endsWith('.css') || 
    f.filename.endsWith('.scss') ||
    f.filename.endsWith('.sass')
  );
  const hasConfig = files.some(f => 
    f.filename.includes('config') ||
    f.filename.includes('.json') ||
    f.filename.includes('.yml') ||
    f.filename.includes('.yaml') ||
    f.filename.includes('.env')
  );
  
  // Check for specific patterns
  const hasBugKeywords = files.some(f => 
    f.filename.toLowerCase().includes('fix') ||
    f.filename.toLowerCase().includes('bug')
  );

  // Determine type based on priority
  if (hasBugKeywords) return 'fix';
  if (hasNewFiles && !hasDeletedFiles) return 'feat';
  if (hasDeletedFiles) return 'refactor';
  if (hasTests) return 'test';
  if (hasDocs) return 'docs';
  if (hasStyles) return 'style';
  if (hasConfig) return 'chore';
  
  // Default based on modifications
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);
  
  if (totalAdditions > totalDeletions * 2) return 'feat';
  if (totalDeletions > totalAdditions) return 'refactor';
  
  return 'chore';
}

/**
 * Determine scope based on file paths
 */
function determineScope(files: FileChange[]): string | undefined {
  // Get common directory
  const paths = files.map(f => f.filename.split('/'));
  
  if (paths.length === 0) return undefined;
  
  // Find common prefix
  const commonPath = paths.reduce((common, path) => {
    const result: string[] = [];
    for (let i = 0; i < Math.min(common.length, path.length); i++) {
      if (common[i] === path[i]) {
        result.push(common[i]);
      } else {
        break;
      }
    }
    return result;
  }, paths[0]);
  
  // Use the last common directory as scope
  if (commonPath.length > 0) {
    const scope = commonPath[commonPath.length - 1];
    
    // Clean up scope
    if (scope === 'src' || scope === 'app' || scope === 'lib') {
      // Try to get more specific
      if (commonPath.length > 1) {
        return commonPath[commonPath.length - 1];
      }
    }
    
    return scope;
  }
  
  return undefined;
}

/**
 * Generate subject line
 */
function generateSubject(files: FileChange[], type: string): string {
  const fileCount = files.length;
  
  if (fileCount === 1) {
    const file = files[0];
    const filename = file.filename.split('/').pop() || file.filename;
    const baseName = filename.split('.')[0];
    
    if (file.status === 'added') {
      return `add ${baseName}`;
    } else if (file.status === 'removed') {
      return `remove ${baseName}`;
    } else if (file.status === 'renamed') {
      return `rename ${baseName}`;
    } else {
      return `update ${baseName}`;
    }
  }
  
  // Multiple files
  const addedCount = files.filter(f => f.status === 'added').length;
  const modifiedCount = files.filter(f => f.status === 'modified').length;
  const removedCount = files.filter(f => f.status === 'removed').length;
  
  const parts: string[] = [];
  
  if (addedCount > 0) parts.push(`add ${addedCount} file${addedCount > 1 ? 's' : ''}`);
  if (modifiedCount > 0) parts.push(`update ${modifiedCount} file${modifiedCount > 1 ? 's' : ''}`);
  if (removedCount > 0) parts.push(`remove ${removedCount} file${removedCount > 1 ? 's' : ''}`);
  
  if (parts.length === 0) {
    return `update ${fileCount} files`;
  }
  
  return parts.join(', ');
}

/**
 * Generate commit body with file statistics
 */
function generateBody(files: FileChange[]): string | undefined {
  if (files.length <= 3) {
    // For small changes, list all files
    return files.map(f => {
      const status = f.status === 'added' ? '+' : f.status === 'removed' ? '-' : '~';
      return `${status} ${f.filename} (+${f.additions}/-${f.deletions})`;
    }).join('\n');
  }
  
  // For larger changes, show summary
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);
  
  return `${files.length} files changed, ${totalAdditions} insertions(+), ${totalDeletions} deletions(-)`;
}

/**
 * Build full conventional commit message
 */
function buildFullMessage(
  type: string,
  scope: string | undefined,
  subject: string,
  body: string | undefined
): string {
  const scopePart = scope ? `(${scope})` : '';
  const header = `${type}${scopePart}: ${subject}`;
  
  if (body) {
    return `${header}\n\n${body}`;
  }
  
  return header;
}

/**
 * Get commit type emoji
 */
export function getCommitTypeEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    feat: '✨',
    fix: '🐛',
    docs: '📝',
    style: '💄',
    refactor: '♻️',
    perf: '⚡',
    test: '✅',
    build: '🔨',
    ci: '👷',
    chore: '🔧',
    revert: '⏪',
  };
  
  return emojiMap[type] || '📦';
}

/**
 * Get commit type description
 */
export function getCommitTypeDescription(type: string): string {
  const descriptions: Record<string, string> = {
    feat: 'A new feature',
    fix: 'A bug fix',
    docs: 'Documentation only changes',
    style: 'Changes that do not affect the meaning of the code',
    refactor: 'A code change that neither fixes a bug nor adds a feature',
    perf: 'A code change that improves performance',
    test: 'Adding missing tests or correcting existing tests',
    build: 'Changes that affect the build system or external dependencies',
    ci: 'Changes to CI configuration files and scripts',
    chore: 'Other changes that don\'t modify src or test files',
    revert: 'Reverts a previous commit',
  };
  
  return descriptions[type] || 'Changes to the codebase';
}

/**
 * Validate commit message format
 */
export function validateCommitMessage(message: string): { valid: boolean; error?: string } {
  if (!message || message.trim().length === 0) {
    return { valid: false, error: 'Commit message cannot be empty' };
  }
  
  if (message.length < 10) {
    return { valid: false, error: 'Commit message too short (minimum 10 characters)' };
  }
  
  if (message.length > 500) {
    return { valid: false, error: 'Commit message too long (maximum 500 characters)' };
  }
  
  return { valid: true };
}
