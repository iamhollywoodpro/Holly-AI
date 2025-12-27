/**
 * GitHub Service for HOLLY's Self-Coding Capabilities
 * Allows HOLLY to read and modify her own code
 */

import { Octokit } from '@octokit/rest';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'iamhollywoodpro';
const REPO_NAME = 'Holly-AI';
const MAIN_BRANCH = 'main';

// Initialize Octokit
const octokit = new Octokit({
  auth: GITHUB_TOKEN,
});

/**
 * Read a file from the repository
 */
export async function readFile(filePath: string): Promise<string | null> {
  try {
    const response = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
      ref: MAIN_BRANCH,
    });

    if ('content' in response.data) {
      // Decode base64 content
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      return content;
    }

    return null;
  } catch (error) {
    console.error(`[GitHub] Error reading file ${filePath}:`, error);
    return null;
  }
}

/**
 * List files in a directory
 */
export async function listFiles(dirPath: string = ''): Promise<Array<{ name: string; path: string; type: string }>> {
  try {
    const response = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: dirPath,
      ref: MAIN_BRANCH,
    });

    if (Array.isArray(response.data)) {
      return response.data.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type,
      }));
    }

    return [];
  } catch (error) {
    console.error(`[GitHub] Error listing files in ${dirPath}:`, error);
    return [];
  }
}

/**
 * Create or update a file in the repository
 */
export async function writeFile(
  filePath: string,
  content: string,
  commitMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // First, try to get the file to see if it exists
    let sha: string | undefined;
    try {
      const existingFile = await octokit.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: filePath,
        ref: MAIN_BRANCH,
      });

      if ('sha' in existingFile.data) {
        sha = existingFile.data.sha;
      }
    } catch (error) {
      // File doesn't exist, that's okay
      sha = undefined;
    }

    // Create or update the file
    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
      message: commitMessage,
      content: Buffer.from(content).toString('base64'),
      sha, // Include SHA if file exists (for update)
      branch: MAIN_BRANCH,
    });

    return { success: true };
  } catch (error: any) {
    console.error(`[GitHub] Error writing file ${filePath}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete a file from the repository
 */
export async function deleteFile(
  filePath: string,
  commitMessage: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the file SHA (required for deletion)
    const existingFile = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
      ref: MAIN_BRANCH,
    });

    if (!('sha' in existingFile.data)) {
      return { success: false, error: 'File not found' };
    }

    // Delete the file
    await octokit.repos.deleteFile({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: filePath,
      message: commitMessage,
      sha: existingFile.data.sha,
      branch: MAIN_BRANCH,
    });

    return { success: true };
  } catch (error: any) {
    console.error(`[GitHub] Error deleting file ${filePath}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Search for files matching a pattern
 */
export async function searchFiles(query: string): Promise<Array<{ path: string; name: string }>> {
  try {
    const response = await octokit.search.code({
      q: `${query} repo:${REPO_OWNER}/${REPO_NAME}`,
    });

    return response.data.items.map((item) => ({
      path: item.path,
      name: item.name,
    }));
  } catch (error) {
    console.error(`[GitHub] Error searching files:`, error);
    return [];
  }
}

/**
 * Get repository structure (tree)
 */
export async function getRepoStructure(): Promise<Array<{ path: string; type: string }>> {
  try {
    const response = await octokit.git.getTree({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      tree_sha: MAIN_BRANCH,
      recursive: 'true',
    });

    return response.data.tree.map((item) => ({
      path: item.path || '',
      type: item.type || '',
    }));
  } catch (error) {
    console.error(`[GitHub] Error getting repo structure:`, error);
    return [];
  }
}

/**
 * Get recent commits
 */
export async function getRecentCommits(count: number = 10): Promise<Array<{ message: string; author: string; date: string }>> {
  try {
    const response = await octokit.repos.listCommits({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      per_page: count,
    });

    return response.data.map((commit) => ({
      message: commit.commit.message,
      author: commit.commit.author?.name || 'Unknown',
      date: commit.commit.author?.date || '',
    }));
  } catch (error) {
    console.error(`[GitHub] Error getting recent commits:`, error);
    return [];
  }
}

/**
 * Check if GitHub token is configured
 */
export function isGitHubConfigured(): boolean {
  return !!GITHUB_TOKEN;
}
