/**
 * GitHub API Service
 * Handles all GitHub API interactions for file browsing, viewing, and management
 */

import { Octokit } from '@octokit/rest';

export interface GitHubFile {
  name: string;
  path: string;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  size: number;
  sha: string;
  url: string;
  download_url: string | null;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  content: string; // base64 encoded
  encoding: string;
  size: number;
  sha: string;
  type: 'file';
}

export interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

export class GitHubAPIService {
  private octokit: Octokit;

  constructor(accessToken: string) {
    this.octokit = new Octokit({
      auth: accessToken,
    });
  }

  /**
   * Get repository contents (files and folders)
   */
  async getRepoContents(
    owner: string,
    repo: string,
    path: string = ''
  ): Promise<GitHubFile[]> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      if (Array.isArray(response.data)) {
        return response.data as GitHubFile[];
      }

      // Single file
      return [response.data as GitHubFile];
    } catch (error: any) {
      console.error('Failed to get repo contents:', error);
      throw new Error(`Failed to fetch contents: ${error.message}`);
    }
  }

  /**
   * Get file content
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string
  ): Promise<string> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });

      const data = response.data as GitHubFileContent;

      if (data.encoding === 'base64' && data.content) {
        return Buffer.from(data.content, 'base64').toString('utf-8');
      }

      return data.content;
    } catch (error: any) {
      console.error('Failed to get file content:', error);
      throw new Error(`Failed to fetch file: ${error.message}`);
    }
  }

  /**
   * Get repository tree (all files recursively)
   */
  async getRepoTree(
    owner: string,
    repo: string,
    branch: string = 'main'
  ): Promise<GitHubTreeItem[]> {
    try {
      const response = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: 'true',
      });

      return response.data.tree as GitHubTreeItem[];
    } catch (error: any) {
      console.error('Failed to get repo tree:', error);
      throw new Error(`Failed to fetch tree: ${error.message}`);
    }
  }

  /**
   * Get repository information
   */
  async getRepoInfo(owner: string, repo: string) {
    try {
      const response = await this.octokit.rest.repos.get({
        owner,
        repo,
      });

      return {
        name: response.data.name,
        fullName: response.data.full_name,
        description: response.data.description,
        private: response.data.private,
        defaultBranch: response.data.default_branch,
        language: response.data.language,
        stars: response.data.stargazers_count,
        forks: response.data.forks_count,
        openIssues: response.data.open_issues_count,
        size: response.data.size,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at,
        pushedAt: response.data.pushed_at,
      };
    } catch (error: any) {
      console.error('Failed to get repo info:', error);
      throw new Error(`Failed to fetch repo info: ${error.message}`);
    }
  }

  /**
   * List repository branches
   */
  async getRepoBranches(owner: string, repo: string) {
    try {
      const response = await this.octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      return response.data.map((branch) => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected,
      }));
    } catch (error: any) {
      console.error('Failed to get branches:', error);
      throw new Error(`Failed to fetch branches: ${error.message}`);
    }
  }

  /**
   * Search repository files
   */
  async searchRepoFiles(
    owner: string,
    repo: string,
    query: string
  ): Promise<any[]> {
    try {
      const response = await this.octokit.rest.search.code({
        q: `${query} repo:${owner}/${repo}`,
        per_page: 50,
      });

      return response.data.items;
    } catch (error: any) {
      console.error('Failed to search files:', error);
      throw new Error(`Failed to search: ${error.message}`);
    }
  }

  /**
   * Compare commits to get diff/changes
   * This compares the current HEAD with the working tree
   */
  async getRepoComparison(
    owner: string,
    repo: string,
    base: string,
    head: string
  ) {
    try {
      const response = await this.octokit.rest.repos.compareCommits({
        owner,
        repo,
        base,
        head,
      });

      return {
        ahead_by: response.data.ahead_by,
        behind_by: response.data.behind_by,
        status: response.data.status,
        total_commits: response.data.total_commits,
        files: response.data.files?.map(file => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch,
        })) || [],
      };
    } catch (error: any) {
      console.error('Failed to get repo comparison:', error);
      throw new Error(`Failed to get diff: ${error.message}`);
    }
  }

  /**
   * Create a commit on a branch
   */
  async createCommit(
    owner: string,
    repo: string,
    branch: string,
    message: string,
    tree: string,
    parents: string[]
  ) {
    try {
      const response = await this.octokit.rest.git.createCommit({
        owner,
        repo,
        message,
        tree,
        parents,
      });

      return {
        sha: response.data.sha,
        message: response.data.message,
        author: response.data.author,
        committer: response.data.committer,
        url: response.data.html_url,
      };
    } catch (error: any) {
      console.error('Failed to create commit:', error);
      throw new Error(`Failed to create commit: ${error.message}`);
    }
  }

  /**
   * Get commit history for a repository
   */
  async getCommitHistory(
    owner: string,
    repo: string,
    branch?: string,
    limit: number = 10
  ) {
    try {
      const response = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        sha: branch,
        per_page: limit,
      });

      return response.data.map(commit => ({
        sha: commit.sha,
        shortSha: commit.sha.substring(0, 7),
        message: commit.commit.message,
        author: {
          name: commit.commit.author?.name || 'Unknown',
          email: commit.commit.author?.email || '',
          date: commit.commit.author?.date || new Date().toISOString(),
        },
        committer: {
          name: commit.commit.committer?.name || 'Unknown',
          email: commit.commit.committer?.email || '',
          date: commit.commit.committer?.date || new Date().toISOString(),
        },
        url: commit.html_url,
        stats: {
          additions: commit.stats?.additions || 0,
          deletions: commit.stats?.deletions || 0,
          total: commit.stats?.total || 0,
        },
      }));
    } catch (error: any) {
      console.error('Failed to get commit history:', error);
      throw new Error(`Failed to fetch commits: ${error.message}`);
    }
  }

  /**
   * Get a single commit details
   */
  async getCommit(owner: string, repo: string, sha: string) {
    try {
      const response = await this.octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: sha,
      });

      return {
        sha: response.data.sha,
        shortSha: response.data.sha.substring(0, 7),
        message: response.data.commit.message,
        author: response.data.commit.author,
        committer: response.data.commit.committer,
        files: response.data.files?.map(file => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch,
        })) || [],
        stats: response.data.stats,
        url: response.data.html_url,
      };
    } catch (error: any) {
      console.error('Failed to get commit:', error);
      throw new Error(`Failed to fetch commit: ${error.message}`);
    }
  }
}

/**
 * Helper: Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Helper: Get file extension
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Helper: Get file icon based on extension
 */
export function getFileIcon(filename: string): string {
  const ext = getFileExtension(filename);
  
  const iconMap: Record<string, string> = {
    // Code files
    ts: '📘', tsx: '📘', js: '📙', jsx: '📙',
    py: '🐍', java: '☕', cpp: '⚙️', c: '⚙️',
    go: '🔵', rs: '🦀', rb: '💎', php: '🐘',
    
    // Web files
    html: '🌐', css: '🎨', scss: '🎨', sass: '🎨',
    json: '📋', xml: '📋', yaml: '📋', yml: '📋',
    
    // Documentation
    md: '📝', txt: '📄', pdf: '📕',
    
    // Config
    env: '⚙️', config: '⚙️', conf: '⚙️',
    
    // Images
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', svg: '🎨',
    
    // Data
    csv: '📊', xlsx: '📊', sql: '🗄️', db: '🗄️',
    
    // Other
    zip: '📦', tar: '📦', gz: '📦',
    sh: '🔧', bash: '🔧',
  };
  
  return iconMap[ext] || '📄';
}

/**
 * Helper: Detect if file is binary
 */
export function isBinaryFile(filename: string): boolean {
  const binaryExtensions = [
    'png', 'jpg', 'jpeg', 'gif', 'ico', 'svg', 'webp',
    'mp3', 'mp4', 'avi', 'mov', 'wav',
    'zip', 'tar', 'gz', 'rar', '7z',
    'exe', 'dll', 'so', 'dylib',
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  ];
  
  const ext = getFileExtension(filename);
  return binaryExtensions.includes(ext);
}
