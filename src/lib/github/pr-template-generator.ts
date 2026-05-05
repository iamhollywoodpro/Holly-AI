/**
 * PR Template Generator
 * Generates smart PR titles and descriptions from commit history
 */

export interface PRCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
}

export interface PRFile {
  filename: string;
  status: 'added' | 'modified' | 'removed' | 'renamed';
  additions: number;
  deletions: number;
  changes: number;
}

export interface PRTemplate {
  title: string;
  body: string;
  type: 'feature' | 'bugfix' | 'chore' | 'docs' | 'refactor' | 'test' | 'other';
}

/**
 * Detect PR type from commit messages
 */
function detectPRType(commits: PRCommit[]): PRTemplate['type'] {
  const messages = commits.map(c => c.message.toLowerCase()).join(' ');
  
  if (messages.includes('feat:') || messages.includes('feature:')) return 'feature';
  if (messages.includes('fix:') || messages.includes('bug:')) return 'bugfix';
  if (messages.includes('docs:') || messages.includes('documentation')) return 'docs';
  if (messages.includes('refactor:')) return 'refactor';
  if (messages.includes('test:')) return 'test';
  if (messages.includes('chore:') || messages.includes('build:') || messages.includes('ci:')) return 'chore';
  
  // Heuristic detection
  if (messages.includes('add') || messages.includes('new') || messages.includes('implement')) return 'feature';
  if (messages.includes('fix') || messages.includes('resolve') || messages.includes('patch')) return 'bugfix';
  if (messages.includes('update') || messages.includes('improve') || messages.includes('enhance')) return 'refactor';
  
  return 'other';
}

/**
 * Generate PR emoji based on type
 */
function getPREmoji(type: PRTemplate['type']): string {
  const emojis: Record<PRTemplate['type'], string> = {
    feature: '✨',
    bugfix: '🐛',
    chore: '🔧',
    docs: '📝',
    refactor: '♻️',
    test: '✅',
    other: '🔀',
  };
  return emojis[type];
}

/**
 * Generate PR title from commits
 */
function generateTitle(commits: PRCommit[], type: PRTemplate['type']): string {
  if (commits.length === 0) return '';
  
  // If only one commit, use its message (cleaned up)
  if (commits.length === 1) {
    const message = commits[0].message.split('\n')[0]; // First line only
    return cleanCommitMessage(message);
  }
  
  // Multiple commits - try to summarize
  const emoji = getPREmoji(type);
  const firstCommit = cleanCommitMessage(commits[0].message.split('\n')[0]);
  
  // Check if all commits are related (similar prefix)
  const prefix = detectCommonPrefix(commits.map(c => c.message.split('\n')[0]));
  if (prefix) {
    return `${emoji} ${prefix}`;
  }
  
  // Use type-based title
  const typeLabels: Record<PRTemplate['type'], string> = {
    feature: 'Add new features',
    bugfix: 'Fix bugs and issues',
    chore: 'Update dependencies and tooling',
    docs: 'Update documentation',
    refactor: 'Refactor code',
    test: 'Add tests',
    other: 'Update codebase',
  };
  
  return `${emoji} ${typeLabels[type]}`;
}

/**
 * Clean up commit message (remove conventional commit prefix)
 */
function cleanCommitMessage(message: string): string {
  // Remove conventional commit prefix (feat:, fix:, etc.)
  const cleaned = message.replace(/^(feat|fix|docs|style|refactor|test|chore|build|ci|perf|revert)(\(.+?\))?:\s*/i, '');
  
  // Capitalize first letter
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Detect common prefix in commit messages
 */
function detectCommonPrefix(messages: string[]): string | null {
  if (messages.length < 2) return null;
  
  const cleaned = messages.map(m => cleanCommitMessage(m));
  const words = cleaned[0].split(' ');
  
  // Check if first 2-3 words are common
  for (let len = Math.min(3, words.length); len >= 2; len--) {
    const prefix = words.slice(0, len).join(' ');
    if (cleaned.every(m => m.startsWith(prefix))) {
      return prefix;
    }
  }
  
  return null;
}

/**
 * Generate PR body/description
 */
function generateBody(
  commits: PRCommit[],
  files: PRFile[],
  type: PRTemplate['type'],
  headBranch: string,
  baseBranch: string
): string {
  const sections: string[] = [];
  
  // Description section
  sections.push('## Description\n');
  sections.push(generateDescription(commits, type));
  sections.push('');
  
  // Changes section (if multiple commits or significant changes)
  if (commits.length > 1 || files.length > 3) {
    sections.push('## Changes\n');
    sections.push(generateChangesSummary(commits, files));
    sections.push('');
  }
  
  // Commits section
  if (commits.length > 1) {
    sections.push('## Commits\n');
    commits.forEach(commit => {
      const shortSha = commit.sha.substring(0, 7);
      const message = commit.message.split('\n')[0];
      sections.push(`- \`${shortSha}\` ${message}`);
    });
    sections.push('');
  }
  
  // Files changed section (if not too many)
  if (files.length > 0 && files.length <= 20) {
    sections.push('## Files Changed\n');
    const filesByStatus = groupFilesByStatus(files);
    
    if (filesByStatus.added.length > 0) {
      sections.push('**Added:**');
      filesByStatus.added.forEach(f => sections.push(`- \`${f.filename}\` (+${f.additions})`));
      sections.push('');
    }
    
    if (filesByStatus.modified.length > 0) {
      sections.push('**Modified:**');
      filesByStatus.modified.forEach(f => sections.push(`- \`${f.filename}\` (+${f.additions}/-${f.deletions})`));
      sections.push('');
    }
    
    if (filesByStatus.removed.length > 0) {
      sections.push('**Removed:**');
      filesByStatus.removed.forEach(f => sections.push(`- \`${f.filename}\``));
      sections.push('');
    }
  } else if (files.length > 20) {
    sections.push(`## Files Changed\n`);
    sections.push(`${files.length} files changed with ${getTotalStats(files)}`);
    sections.push('');
  }
  
  // Checklist section
  sections.push('## Checklist\n');
  sections.push('- [ ] Code follows project style guidelines');
  sections.push('- [ ] Self-review completed');
  sections.push('- [ ] Changes are tested');
  if (type === 'feature' || type === 'bugfix') {
    sections.push('- [ ] Documentation updated (if needed)');
  }
  sections.push('');
  
  // Branch info
  sections.push('---');
  sections.push(`**Branch:** \`${headBranch}\` → \`${baseBranch}\``);
  
  return sections.join('\n');
}

/**
 * Generate description based on commits and type
 */
function generateDescription(commits: PRCommit[], type: PRTemplate['type']): string {
  if (commits.length === 0) {
    return 'This PR introduces changes to the codebase.';
  }
  
  // If single commit with detailed message, use it
  if (commits.length === 1) {
    const lines = commits[0].message.split('\n').filter(l => l.trim());
    if (lines.length > 1) {
      // Has description beyond title
      return lines.slice(1).join('\n').trim();
    }
  }
  
  // Generate based on type
  const descriptions: Record<PRTemplate['type'], string> = {
    feature: 'This PR introduces new features and functionality to enhance the application.',
    bugfix: 'This PR fixes bugs and resolves issues to improve stability.',
    chore: 'This PR updates dependencies, configuration, and tooling.',
    docs: 'This PR improves documentation for better clarity.',
    refactor: 'This PR refactors code to improve maintainability and performance.',
    test: 'This PR adds or improves tests to increase code coverage.',
    other: 'This PR includes various updates and improvements.',
  };
  
  return descriptions[type];
}

/**
 * Generate changes summary
 */
function generateChangesSummary(commits: PRCommit[], files: PRFile[]): string {
  const stats = getTotalStats(files);
  const summary: string[] = [];
  
  summary.push(`**${commits.length} commits** with ${stats}`);
  summary.push('');
  
  // Highlight key changes
  const keyFiles = files.filter(f => 
    f.filename.includes('src/') || 
    f.filename.includes('lib/') ||
    f.filename.includes('components/')
  ).slice(0, 5);
  
  if (keyFiles.length > 0) {
    summary.push('**Key changes:**');
    keyFiles.forEach(f => {
      summary.push(`- ${f.status === 'added' ? 'Added' : f.status === 'removed' ? 'Removed' : 'Modified'} \`${f.filename}\``);
    });
  }
  
  return summary.join('\n');
}

/**
 * Group files by status
 */
function groupFilesByStatus(files: PRFile[]) {
  return {
    added: files.filter(f => f.status === 'added'),
    modified: files.filter(f => f.status === 'modified'),
    removed: files.filter(f => f.status === 'removed'),
    renamed: files.filter(f => f.status === 'renamed'),
  };
}

/**
 * Get total statistics
 */
function getTotalStats(files: PRFile[]): string {
  const additions = files.reduce((sum, f) => sum + f.additions, 0);
  const deletions = files.reduce((sum, f) => sum + f.deletions, 0);
  return `**+${additions}** / **-${deletions}**`;
}

/**
 * Main function: Generate PR template from commits and files
 */
export function generatePRTemplate(
  commits: PRCommit[],
  files: PRFile[],
  headBranch: string,
  baseBranch: string = 'main'
): PRTemplate {
  const type = detectPRType(commits);
  const title = generateTitle(commits, type);
  const body = generateBody(commits, files, type, headBranch, baseBranch);
  
  return {
    title,
    body,
    type,
  };
}

/**
 * Generate quick PR template (just title and basic body)
 */
export function generateQuickTemplate(commits: PRCommit[]): Pick<PRTemplate, 'title' | 'type'> {
  const type = detectPRType(commits);
  const title = generateTitle(commits, type);
  
  return { title, type };
}
