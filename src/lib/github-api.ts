/**
 * GitHub API Helper Library
 * Handles all GitHub API interactions for HOLLY
 */

import { Octokit } from '@octokit/rest';

export interface GitHubFile {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

export interface CommitOptions {
  owner: string;
  repo: string;
  branch: string;
  message: string;
  files: GitHubFile[];
  token: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

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

export interface BranchComparison {
  commits: PRCommit[];
  files: PRFile[];
  totalCommits: number;
  aheadBy: number;
  behindBy: number;
}

/**
 * Create a new commit with multiple file changes
 */
export async function createCommit(options: CommitOptions) {
  const { owner, repo, branch, message, files, token } = options;
  
  const octokit = new Octokit({ auth: token });

  try {
    // 1. Get the current commit SHA
    const { data: refData } = await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    const currentCommitSha = refData.object.sha;

    // 2. Get the current commit to find the tree
    const { data: currentCommit } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: currentCommitSha,
    });
    const currentTreeSha = currentCommit.tree.sha;

    // 3. Create blobs for each file
    const blobs = await Promise.all(
      files.map(async (file) => {
        const { data: blob } = await octokit.git.createBlob({
          owner,
          repo,
          content: file.encoding === 'base64' ? file.content : Buffer.from(file.content).toString('base64'),
          encoding: 'base64',
        });
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        };
      })
    );

    // 4. Create a new tree
    const { data: newTree } = await octokit.git.createTree({
      owner,
      repo,
      base_tree: currentTreeSha,
      tree: blobs,
    });

    // 5. Create the commit
    const { data: newCommit } = await octokit.git.createCommit({
      owner,
      repo,
      message,
      tree: newTree.sha,
      parents: [currentCommitSha],
    });

    // 6. Update the reference
    await octokit.git.updateRef({
      owner,
      repo,
      ref: `heads/${branch}`,
      sha: newCommit.sha,
    });

    return {
      success: true,
      commitSha: newCommit.sha,
      commitUrl: newCommit.html_url,
      message: newCommit.message,
    };
  } catch (error: any) {
    console.error('GitHub commit error:', error);
    return {
      success: false,
      error: error.message || 'Failed to create commit',
    };
  }
}

/**
 * List all branches for a repository
 */
export async function listBranches(owner: string, repo: string, token: string): Promise<GitHubBranch[]> {
  const octokit = new Octokit({ auth: token });

  try {
    const { data: branches } = await octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });

    return branches.map(branch => ({
      name: branch.name,
      commit: {
        sha: branch.commit.sha,
        url: branch.commit.url,
      },
      protected: branch.protected,
    }));
  } catch (error: any) {
    console.error('GitHub branches error:', error);
    throw new Error(error.message || 'Failed to fetch branches');
  }
}

/**
 * Get file content from a repository
 */
export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string,
  token: string
): Promise<string> {
  const octokit = new Octokit({ auth: token });

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if ('content' in data && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }

    throw new Error('File not found or is a directory');
  } catch (error: any) {
    console.error('GitHub file content error:', error);
    throw new Error(error.message || 'Failed to fetch file content');
  }
}

/**
 * Get repository details
 */
export async function getRepository(owner: string, repo: string, token: string) {
  const octokit = new Octokit({ auth: token });

  try {
    const { data } = await octokit.repos.get({
      owner,
      repo,
    });

    return {
      name: data.name,
      fullName: data.full_name,
      description: data.description,
      private: data.private,
      defaultBranch: data.default_branch,
      url: data.html_url,
      cloneUrl: data.clone_url,
      language: data.language,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      updatedAt: data.updated_at,
    };
  } catch (error: any) {
    console.error('GitHub repository error:', error);
    throw new Error(error.message || 'Failed to fetch repository');
  }
}

/**
 * Compare two branches to get commits and file changes
 */
export async function compareBranches(
  owner: string,
  repo: string,
  base: string,
  head: string,
  token: string
): Promise<BranchComparison> {
  const octokit = new Octokit({ auth: token });

  try {
    const { data } = await octokit.repos.compareCommitsWithBasehead({
      owner,
      repo,
      basehead: `${base}...${head}`,
    });

    // Transform commits
    const commits: PRCommit[] = data.commits.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || commit.author?.login || 'Unknown',
      date: commit.commit.author?.date || new Date().toISOString(),
    }));

    // Transform files
    const files: PRFile[] = (data.files || []).map(file => ({
      filename: file.filename,
      status: file.status as PRFile['status'],
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
    }));

    return {
      commits,
      files,
      totalCommits: data.total_commits || commits.length,
      aheadBy: data.ahead_by || 0,
      behindBy: data.behind_by || 0,
    };
  } catch (error: any) {
    console.error('GitHub branch comparison error:', error);
    throw new Error(error.message || 'Failed to compare branches');
  }
}

/**
 * Get commits for a specific branch
 */
export async function getCommits(
  owner: string,
  repo: string,
  branch: string,
  token: string,
  limit: number = 10
): Promise<PRCommit[]> {
  const octokit = new Octokit({ auth: token });

  try {
    const { data } = await octokit.repos.listCommits({
      owner,
      repo,
      sha: branch,
      per_page: limit,
    });

    return data.map(commit => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author?.name || commit.author?.login || 'Unknown',
      date: commit.commit.author?.date || new Date().toISOString(),
    }));
  } catch (error: any) {
    console.error('GitHub commits error:', error);
    throw new Error(error.message || 'Failed to fetch commits');
  }
}

/**
 * Parse GitHub repository URL to extract owner and repo
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+)/,
    /^([^\/]+)\/([^\/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        owner: match[1],
        repo: match[2].replace(/\.git$/, ''),
      };
    }
  }

  return null;
}
