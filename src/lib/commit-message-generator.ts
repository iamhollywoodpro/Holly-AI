/**
 * AI-Powered Commit Message Generator
 * Analyzes code changes and generates semantic commit messages
 */

import type { GitHubFile } from './github-api';

export interface CommitMessageResult {
  title: string;
  body: string;
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';
}

/**
 * Analyze code changes and generate a semantic commit message
 */
export function generateCommitMessage(files: GitHubFile[]): CommitMessageResult {
  if (files.length === 0) {
    return {
      title: 'chore: Update files',
      body: '',
      type: 'chore',
    };
  }

  // Analyze files to determine commit type
  const analysis = analyzeChanges(files);
  
  // Generate title based on analysis
  const title = generateTitle(analysis, files);
  
  // Generate body with file details
  const body = generateBody(analysis, files);

  return {
    title,
    body,
    type: analysis.type,
  };
}

interface ChangeAnalysis {
  type: 'feat' | 'fix' | 'docs' | 'style' | 'refactor' | 'test' | 'chore';
  scope?: string;
  hasTests: boolean;
  hasComponents: boolean;
  hasAPI: boolean;
  hasStyles: boolean;
  hasDocs: boolean;
  keywords: string[];
}

function analyzeChanges(files: GitHubFile[]): ChangeAnalysis {
  const analysis: ChangeAnalysis = {
    type: 'chore',
    hasTests: false,
    hasComponents: false,
    hasAPI: false,
    hasStyles: false,
    hasDocs: false,
    keywords: [],
  };

  for (const file of files) {
    const path = file.path.toLowerCase();
    const content = file.content.toLowerCase();

    // Detect file types
    if (path.includes('test') || path.includes('spec')) {
      analysis.hasTests = true;
    }
    if (path.includes('component') || path.includes('.tsx') || path.includes('.jsx')) {
      analysis.hasComponents = true;
    }
    if (path.includes('api') || path.includes('route') || path.includes('endpoint')) {
      analysis.hasAPI = true;
    }
    if (path.includes('.css') || path.includes('style')) {
      analysis.hasStyles = true;
    }
    if (path.includes('.md') || path.includes('readme') || path.includes('doc')) {
      analysis.hasDocs = true;
    }

    // Detect keywords in content
    if (content.includes('fix') || content.includes('bug')) {
      analysis.keywords.push('fix');
    }
    if (content.includes('add') || content.includes('new') || content.includes('create')) {
      analysis.keywords.push('add');
    }
    if (content.includes('update') || content.includes('change') || content.includes('modify')) {
      analysis.keywords.push('update');
    }
    if (content.includes('remove') || content.includes('delete')) {
      analysis.keywords.push('remove');
    }
    if (content.includes('refactor') || content.includes('improve')) {
      analysis.keywords.push('refactor');
    }
  }

  // Determine commit type based on analysis
  if (analysis.hasDocs) {
    analysis.type = 'docs';
  } else if (analysis.keywords.includes('fix')) {
    analysis.type = 'fix';
  } else if (analysis.keywords.includes('add') || analysis.keywords.includes('create')) {
    analysis.type = 'feat';
  } else if (analysis.keywords.includes('refactor')) {
    analysis.type = 'refactor';
  } else if (analysis.hasTests) {
    analysis.type = 'test';
  } else if (analysis.hasStyles) {
    analysis.type = 'style';
  } else if (analysis.keywords.includes('update')) {
    analysis.type = 'chore';
  }

  // Determine scope
  if (analysis.hasAPI) {
    analysis.scope = 'api';
  } else if (analysis.hasComponents) {
    analysis.scope = 'components';
  } else if (analysis.hasTests) {
    analysis.scope = 'tests';
  }

  return analysis;
}

function generateTitle(analysis: ChangeAnalysis, files: GitHubFile[]): string {
  const { type, scope } = analysis;
  
  // Extract meaningful file names
  const fileNames = files.map(f => {
    const parts = f.path.split('/');
    return parts[parts.length - 1].replace(/\.(tsx?|jsx?|css|md)$/, '');
  });

  // Generate description based on type
  let description = '';
  
  if (type === 'feat') {
    if (analysis.hasComponents) {
      description = `Add ${fileNames[0]} component`;
    } else if (analysis.hasAPI) {
      description = `Add ${fileNames[0]} endpoint`;
    } else {
      description = `Add ${fileNames.join(', ')}`;
    }
  } else if (type === 'fix') {
    description = `Fix ${fileNames[0]}`;
    if (fileNames[0].toLowerCase().includes('bug')) {
      description = `Fix bug in ${fileNames[0]}`;
    }
  } else if (type === 'docs') {
    description = `Update documentation for ${fileNames[0]}`;
  } else if (type === 'refactor') {
    description = `Refactor ${fileNames[0]}`;
  } else if (type === 'style') {
    description = `Update styles for ${fileNames[0]}`;
  } else if (type === 'test') {
    description = `Add tests for ${fileNames[0]}`;
  } else {
    description = `Update ${fileNames.join(', ')}`;
  }

  // Construct conventional commit message
  const scopePart = scope ? `(${scope})` : '';
  return `${type}${scopePart}: ${description}`;
}

function generateBody(analysis: ChangeAnalysis, files: GitHubFile[]): string {
  const lines: string[] = [];

  // Add change summary
  if (files.length === 1) {
    lines.push(`Modified ${files[0].path}`);
  } else {
    lines.push('Changes:');
    files.forEach(file => {
      const lineCount = file.content.split('\n').length;
      lines.push(`- ${file.path} (${lineCount} lines)`);
    });
  }

  // Add metadata
  lines.push('');
  lines.push('Generated by HOLLY AI Assistant');

  return lines.join('\n');
}

/**
 * Format commit message for display
 */
export function formatCommitMessage(result: CommitMessageResult): string {
  if (result.body) {
    return `${result.title}\n\n${result.body}`;
  }
  return result.title;
}
