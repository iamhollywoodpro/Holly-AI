/**
 * HOLLY - GitHub Integration Client
 * 
 * Complete GitHub automation for repository management, code deployment,
 * and collaboration workflows. Enables HOLLY to manage code like a real developer.
 * 
 * Capabilities:
 * - Repository management (create, clone, delete)
 * - Code operations (commit, push, pull)
 * - Branch management (create, switch, merge)
 * - Pull requests (create, review, merge)
 * - Issues (create, update, close)
 * - GitHub Actions (trigger workflows)
 * - Collaboration (add collaborators, manage permissions)
 */

import { Octokit } from '@octokit/rest';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '@/lib/logging';

const execAsync = promisify(exec);

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface GitHubConfig {
  token: string;
  username?: string;
  email?: string;
  baseDir?: string; // Where to clone repos locally
}

export interface Repository {
  name: string;
  description?: string;
  private?: boolean;
  owner?: string;
  full_name?: string;
  html_url?: string;
  clone_url?: string;
  ssh_url?: string;
  default_branch?: string;
}

export interface CommitInfo {
  repo: string;
  owner: string;
  branch: string;
  message: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  author?: {
    name: string;
    email: string;
  };
}

export interface PullRequestInfo {
  repo: string;
  owner: string;
  title: string;
  body?: string;
  head: string; // Source branch
  base: string; // Target branch (usually 'main' or 'master')
  draft?: boolean;
}

export interface IssueInfo {
  repo: string;
  owner: string;
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}

export interface BranchInfo {
  name: string;
  sha?: string;
  protected?: boolean;
}

// ============================================================================
// GITHUB CLIENT CLASS
// ============================================================================

export class GitHubClient {
  private octokit: Octokit;
  private config: GitHubConfig;
  private gitClients: Map<string, SimpleGit> = new Map();

  constructor(config: GitHubConfig) {
    this.config = {
      ...config,
      baseDir: config.baseDir || '/tmp/holly-repos',
    };

    this.octokit = new Octokit({
      auth: config.token,
    });

    logger.info('github_client_initialized', {
      baseDir: this.config.baseDir,
    });
  }

  // ==========================================================================
  // AUTHENTICATION & VALIDATION
  // ==========================================================================

  /**
   * Verify GitHub authentication and get authenticated user info
   */
  async verifyAuth(): Promise<{ username: string; email: string | null }> {
    try {
      const { data: user } = await this.octokit.users.getAuthenticated();
      
      logger.info('github_auth_verified', {
        username: user.login,
        name: user.name,
      });

      return {
        username: user.login,
        email: user.email,
      };
    } catch (error: any) {
      logger.error('github_auth_failed', error);
      throw new Error(`GitHub authentication failed: ${error.message}`);
    }
  }

  /**
   * Test GitHub connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.verifyAuth();
      return true;
    } catch (error) {
      return false;
    }
  }

  // ==========================================================================
  // REPOSITORY MANAGEMENT
  // ==========================================================================

  /**
   * Create a new GitHub repository
   */
  async createRepository(
    name: string,
    options: {
      description?: string;
      private?: boolean;
      autoInit?: boolean;
      gitignoreTemplate?: string;
      licenseTemplate?: string;
    } = {}
  ): Promise<Repository> {
    try {
      logger.info('github_create_repo_start', { name, options });

      const { data: repo } = await this.octokit.repos.createForAuthenticatedUser({
        name,
        description: options.description,
        private: options.private ?? false,
        auto_init: options.autoInit ?? true,
        gitignore_template: options.gitignoreTemplate,
        license_template: options.licenseTemplate,
      });

      const repository: Repository = {
        name: repo.name,
        description: repo.description || undefined,
        private: repo.private,
        owner: repo.owner?.login,
        full_name: repo.full_name,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        ssh_url: repo.ssh_url,
        default_branch: repo.default_branch,
      };

      logger.info('github_create_repo_success', {
        name: repository.name,
        url: repository.html_url,
      });

      return repository;
    } catch (error: any) {
      logger.error('github_create_repo_failed', error, { name });
      throw new Error(`Failed to create repository: ${error.message}`);
    }
  }

  /**
   * Get repository information
   */
  async getRepository(owner: string, repo: string): Promise<Repository> {
    try {
      const { data } = await this.octokit.repos.get({
        owner,
        repo,
      });

      return {
        name: data.name,
        description: data.description || undefined,
        private: data.private,
        owner: data.owner?.login,
        full_name: data.full_name,
        html_url: data.html_url,
        clone_url: data.clone_url,
        ssh_url: data.ssh_url,
        default_branch: data.default_branch,
      };
    } catch (error: any) {
      logger.error('github_get_repo_failed', error, { owner, repo });
      throw new Error(`Failed to get repository: ${error.message}`);
    }
  }

  /**
   * List repositories for authenticated user
   */
  async listRepositories(options: {
    type?: 'all' | 'owner' | 'public' | 'private';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    perPage?: number;
  } = {}): Promise<Repository[]> {
    try {
      const { data: repos } = await this.octokit.repos.listForAuthenticatedUser({
        type: options.type || 'all',
        sort: options.sort || 'updated',
        direction: options.direction || 'desc',
        per_page: options.perPage || 30,
      });

      return repos.map(repo => ({
        name: repo.name,
        description: repo.description || undefined,
        private: repo.private,
        owner: repo.owner?.login,
        full_name: repo.full_name,
        html_url: repo.html_url,
        clone_url: repo.clone_url,
        ssh_url: repo.ssh_url,
        default_branch: repo.default_branch,
      }));
    } catch (error: any) {
      logger.error('github_list_repos_failed', error);
      throw new Error(`Failed to list repositories: ${error.message}`);
    }
  }

  /**
   * Delete a repository
   */
  async deleteRepository(owner: string, repo: string): Promise<void> {
    try {
      logger.warn('github_delete_repo_start', { owner, repo });

      await this.octokit.repos.delete({
        owner,
        repo,
      });

      logger.info('github_delete_repo_success', { owner, repo });
    } catch (error: any) {
      logger.error('github_delete_repo_failed', error, { owner, repo });
      throw new Error(`Failed to delete repository: ${error.message}`);
    }
  }

  // ==========================================================================
  // LOCAL GIT OPERATIONS
  // ==========================================================================

  /**
   * Clone a repository to local workspace
   */
  async cloneRepository(
    owner: string,
    repo: string,
    localPath?: string
  ): Promise<string> {
    try {
      const targetPath = localPath || path.join(this.config.baseDir!, `${owner}-${repo}`);
      
      logger.info('github_clone_start', { owner, repo, targetPath });

      // Ensure base directory exists
      await fs.mkdir(this.config.baseDir!, { recursive: true });

      // Get repository info for clone URL
      const repoInfo = await this.getRepository(owner, repo);
      
      // Clone using HTTPS with token authentication
      const cloneUrl = repoInfo.clone_url!.replace(
        'https://',
        `https://${this.config.token}@`
      );

      const gitOptions: Partial<SimpleGitOptions> = {
        baseDir: this.config.baseDir!,
        binary: 'git',
        maxConcurrentProcesses: 6,
      };

      const git: SimpleGit = simpleGit(gitOptions);
      
      await git.clone(cloneUrl, targetPath);

      // Configure git for this repo
      const repoGit = simpleGit(targetPath);
      
      if (this.config.username) {
        await repoGit.addConfig('user.name', this.config.username);
      }
      if (this.config.email) {
        await repoGit.addConfig('user.email', this.config.email);
      }

      // Cache the git client for this repo
      this.gitClients.set(`${owner}/${repo}`, repoGit);

      logger.info('github_clone_success', { owner, repo, targetPath });

      return targetPath;
    } catch (error: any) {
      logger.error('github_clone_failed', error, { owner, repo });
      throw new Error(`Failed to clone repository: ${error.message}`);
    }
  }

  /**
   * Get or create git client for a repository
   */
  private async getGitClient(owner: string, repo: string): Promise<SimpleGit> {
    const key = `${owner}/${repo}`;
    
    if (this.gitClients.has(key)) {
      return this.gitClients.get(key)!;
    }

    // Clone the repository if not already cloned
    const repoPath = await this.cloneRepository(owner, repo);
    return simpleGit(repoPath);
  }

  /**
   * Pull latest changes from remote
   */
  async pullChanges(owner: string, repo: string, branch?: string): Promise<void> {
    try {
      logger.info('github_pull_start', { owner, repo, branch });

      const git = await this.getGitClient(owner, repo);
      
      if (branch) {
        await git.checkout(branch);
      }

      await git.pull();

      logger.info('github_pull_success', { owner, repo, branch });
    } catch (error: any) {
      logger.error('github_pull_failed', error, { owner, repo, branch });
      throw new Error(`Failed to pull changes: ${error.message}`);
    }
  }

  /**
   * Commit and push changes
   */
  async commitAndPush(commitInfo: CommitInfo): Promise<void> {
    try {
      logger.info('github_commit_push_start', {
        repo: commitInfo.repo,
        branch: commitInfo.branch,
        fileCount: commitInfo.files.length,
      });

      const git = await this.getGitClient(commitInfo.owner, commitInfo.repo);

      // Checkout the target branch
      try {
        await git.checkout(commitInfo.branch);
      } catch {
        // Branch doesn't exist, create it
        await git.checkoutLocalBranch(commitInfo.branch);
      }

      // Write all files
      const repoPath = path.join(this.config.baseDir!, `${commitInfo.owner}-${commitInfo.repo}`);
      
      for (const file of commitInfo.files) {
        const filePath = path.join(repoPath, file.path);
        const fileDir = path.dirname(filePath);
        
        // Ensure directory exists
        await fs.mkdir(fileDir, { recursive: true });
        
        // Write file content
        await fs.writeFile(filePath, file.content, 'utf-8');
        
        // Stage the file
        await git.add(file.path);
      }

      // Configure commit author if provided
      if (commitInfo.author) {
        await git.addConfig('user.name', commitInfo.author.name);
        await git.addConfig('user.email', commitInfo.author.email);
      }

      // Commit changes
      await git.commit(commitInfo.message);

      // Push to remote
      await git.push('origin', commitInfo.branch);

      logger.info('github_commit_push_success', {
        repo: commitInfo.repo,
        branch: commitInfo.branch,
        message: commitInfo.message,
      });
    } catch (error: any) {
      logger.error('github_commit_push_failed', error, {
        repo: commitInfo.repo,
        branch: commitInfo.branch,
      });
      throw new Error(`Failed to commit and push: ${error.message}`);
    }
  }

  // ==========================================================================
  // BRANCH MANAGEMENT
  // ==========================================================================

  /**
   * List branches in a repository
   */
  async listBranches(owner: string, repo: string): Promise<BranchInfo[]> {
    try {
      const { data: branches } = await this.octokit.repos.listBranches({
        owner,
        repo,
      });

      return branches.map(branch => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected,
      }));
    } catch (error: any) {
      logger.error('github_list_branches_failed', error, { owner, repo });
      throw new Error(`Failed to list branches: ${error.message}`);
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(
    owner: string,
    repo: string,
    branchName: string,
    fromBranch?: string
  ): Promise<BranchInfo> {
    try {
      logger.info('github_create_branch_start', {
        owner,
        repo,
        branchName,
        fromBranch,
      });

      // Get the SHA of the source branch
      const sourceRef = fromBranch || 'heads/main';
      const { data: ref } = await this.octokit.git.getRef({
        owner,
        repo,
        ref: sourceRef,
      });

      // Create new branch reference
      const { data: newRef } = await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: ref.object.sha,
      });

      logger.info('github_create_branch_success', {
        owner,
        repo,
        branchName,
      });

      return {
        name: branchName,
        sha: newRef.object.sha,
      };
    } catch (error: any) {
      logger.error('github_create_branch_failed', error, {
        owner,
        repo,
        branchName,
      });
      throw new Error(`Failed to create branch: ${error.message}`);
    }
  }

  /**
   * Delete a branch
   */
  async deleteBranch(owner: string, repo: string, branchName: string): Promise<void> {
    try {
      logger.warn('github_delete_branch_start', { owner, repo, branchName });

      await this.octokit.git.deleteRef({
        owner,
        repo,
        ref: `heads/${branchName}`,
      });

      logger.info('github_delete_branch_success', { owner, repo, branchName });
    } catch (error: any) {
      logger.error('github_delete_branch_failed', error, {
        owner,
        repo,
        branchName,
      });
      throw new Error(`Failed to delete branch: ${error.message}`);
    }
  }

  // ==========================================================================
  // PULL REQUESTS
  // ==========================================================================

  /**
   * Create a pull request
   */
  async createPullRequest(prInfo: PullRequestInfo): Promise<{
    number: number;
    url: string;
    title: string;
  }> {
    try {
      logger.info('github_create_pr_start', {
        repo: prInfo.repo,
        title: prInfo.title,
        head: prInfo.head,
        base: prInfo.base,
      });

      const { data: pr } = await this.octokit.pulls.create({
        owner: prInfo.owner,
        repo: prInfo.repo,
        title: prInfo.title,
        body: prInfo.body,
        head: prInfo.head,
        base: prInfo.base,
        draft: prInfo.draft ?? false,
      });

      logger.info('github_create_pr_success', {
        repo: prInfo.repo,
        number: pr.number,
        url: pr.html_url,
      });

      return {
        number: pr.number,
        url: pr.html_url,
        title: pr.title,
      };
    } catch (error: any) {
      logger.error('github_create_pr_failed', error, {
        repo: prInfo.repo,
        title: prInfo.title,
      });
      throw new Error(`Failed to create pull request: ${error.message}`);
    }
  }

  /**
   * List pull requests
   */
  async listPullRequests(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ) {
    try {
      const { data: prs } = await this.octokit.pulls.list({
        owner,
        repo,
        state,
      });

      return prs.map(pr => ({
        number: pr.number,
        title: pr.title,
        body: pr.body,
        state: pr.state,
        url: pr.html_url,
        head: pr.head.ref,
        base: pr.base.ref,
        draft: pr.draft,
        created_at: pr.created_at,
        updated_at: pr.updated_at,
      }));
    } catch (error: any) {
      logger.error('github_list_prs_failed', error, { owner, repo });
      throw new Error(`Failed to list pull requests: ${error.message}`);
    }
  }

  /**
   * Merge a pull request
   */
  async mergePullRequest(
    owner: string,
    repo: string,
    pullNumber: number,
    options: {
      commitMessage?: string;
      mergeMethod?: 'merge' | 'squash' | 'rebase';
    } = {}
  ): Promise<void> {
    try {
      logger.info('github_merge_pr_start', { owner, repo, pullNumber });

      await this.octokit.pulls.merge({
        owner,
        repo,
        pull_number: pullNumber,
        commit_message: options.commitMessage,
        merge_method: options.mergeMethod || 'merge',
      });

      logger.info('github_merge_pr_success', { owner, repo, pullNumber });
    } catch (error: any) {
      logger.error('github_merge_pr_failed', error, { owner, repo, pullNumber });
      throw new Error(`Failed to merge pull request: ${error.message}`);
    }
  }

  // ==========================================================================
  // ISSUES
  // ==========================================================================

  /**
   * Create an issue
   */
  async createIssue(issueInfo: IssueInfo): Promise<{
    number: number;
    url: string;
    title: string;
  }> {
    try {
      logger.info('github_create_issue_start', {
        repo: issueInfo.repo,
        title: issueInfo.title,
      });

      const { data: issue } = await this.octokit.issues.create({
        owner: issueInfo.owner,
        repo: issueInfo.repo,
        title: issueInfo.title,
        body: issueInfo.body,
        labels: issueInfo.labels,
        assignees: issueInfo.assignees,
      });

      logger.info('github_create_issue_success', {
        repo: issueInfo.repo,
        number: issue.number,
        url: issue.html_url,
      });

      return {
        number: issue.number,
        url: issue.html_url,
        title: issue.title,
      };
    } catch (error: any) {
      logger.error('github_create_issue_failed', error, {
        repo: issueInfo.repo,
        title: issueInfo.title,
      });
      throw new Error(`Failed to create issue: ${error.message}`);
    }
  }

  /**
   * List issues
   */
  async listIssues(
    owner: string,
    repo: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ) {
    try {
      const { data: issues } = await this.octokit.issues.listForRepo({
        owner,
        repo,
        state,
      });

      return issues
        .filter(issue => !issue.pull_request) // Exclude PRs
        .map(issue => ({
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          url: issue.html_url,
          labels: issue.labels.map(l => (typeof l === 'string' ? l : l.name || '')),
          assignees: issue.assignees?.map(a => a.login) || [],
          created_at: issue.created_at,
          updated_at: issue.updated_at,
        }));
    } catch (error: any) {
      logger.error('github_list_issues_failed', error, { owner, repo });
      throw new Error(`Failed to list issues: ${error.message}`);
    }
  }

  /**
   * Close an issue
   */
  async closeIssue(owner: string, repo: string, issueNumber: number): Promise<void> {
    try {
      logger.info('github_close_issue_start', { owner, repo, issueNumber });

      await this.octokit.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        state: 'closed',
      });

      logger.info('github_close_issue_success', { owner, repo, issueNumber });
    } catch (error: any) {
      logger.error('github_close_issue_failed', error, {
        owner,
        repo,
        issueNumber,
      });
      throw new Error(`Failed to close issue: ${error.message}`);
    }
  }

  // ==========================================================================
  // GITHUB ACTIONS
  // ==========================================================================

  /**
   * Trigger a GitHub Actions workflow
   */
  async triggerWorkflow(
    owner: string,
    repo: string,
    workflowId: string | number,
    ref: string = 'main',
    inputs?: Record<string, any>
  ): Promise<void> {
    try {
      logger.info('github_trigger_workflow_start', {
        owner,
        repo,
        workflowId,
        ref,
      });

      await this.octokit.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: workflowId,
        ref,
        inputs,
      });

      logger.info('github_trigger_workflow_success', {
        owner,
        repo,
        workflowId,
      });
    } catch (error: any) {
      logger.error('github_trigger_workflow_failed', error, {
        owner,
        repo,
        workflowId,
      });
      throw new Error(`Failed to trigger workflow: ${error.message}`);
    }
  }

  /**
   * List workflow runs
   */
  async listWorkflowRuns(owner: string, repo: string, workflowId?: string | number) {
    try {
      const params: any = {
        owner,
        repo,
      };

      if (workflowId) {
        params.workflow_id = workflowId;
      }

      const { data } = await this.octokit.actions.listWorkflowRunsForRepo(params);

      return data.workflow_runs.map(run => ({
        id: run.id,
        name: run.name,
        status: run.status,
        conclusion: run.conclusion,
        url: run.html_url,
        created_at: run.created_at,
        updated_at: run.updated_at,
      }));
    } catch (error: any) {
      logger.error('github_list_workflow_runs_failed', error, { owner, repo });
      throw new Error(`Failed to list workflow runs: ${error.message}`);
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Add collaborator to repository
   */
  async addCollaborator(
    owner: string,
    repo: string,
    username: string,
    permission: 'pull' | 'push' | 'admin' | 'maintain' | 'triage' = 'push'
  ): Promise<void> {
    try {
      logger.info('github_add_collaborator_start', {
        owner,
        repo,
        username,
        permission,
      });

      await this.octokit.repos.addCollaborator({
        owner,
        repo,
        username,
        permission,
      });

      logger.info('github_add_collaborator_success', {
        owner,
        repo,
        username,
      });
    } catch (error: any) {
      logger.error('github_add_collaborator_failed', error, {
        owner,
        repo,
        username,
      });
      throw new Error(`Failed to add collaborator: ${error.message}`);
    }
  }

  /**
   * Get repository contents
   */
  async getContents(
    owner: string,
    repo: string,
    path: string = '',
    ref?: string
  ): Promise<any> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      return data;
    } catch (error: any) {
      logger.error('github_get_contents_failed', error, { owner, repo, path });
      throw new Error(`Failed to get repository contents: ${error.message}`);
    }
  }

  /**
   * Cleanup local repository clone
   */
  async cleanupLocalRepo(owner: string, repo: string): Promise<void> {
    try {
      const repoPath = path.join(this.config.baseDir!, `${owner}-${repo}`);
      await fs.rm(repoPath, { recursive: true, force: true });
      
      this.gitClients.delete(`${owner}/${repo}`);
      
      logger.info('github_cleanup_success', { owner, repo });
    } catch (error: any) {
      logger.error('github_cleanup_failed', error, { owner, repo });
      throw new Error(`Failed to cleanup local repository: ${error.message}`);
    }
  }
}

// ============================================================================
// FACTORY & EXPORTS
// ============================================================================

/**
 * Create GitHub client from environment variables
 */
export function createGitHubClient(config?: Partial<GitHubConfig>): GitHubClient {
  const token = config?.token || process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  
  if (!token) {
    throw new Error('GitHub token not provided. Set GITHUB_TOKEN or GITHUB_PAT environment variable.');
  }

  return new GitHubClient({
    token,
    username: config?.username || process.env.GITHUB_USERNAME,
    email: config?.email || process.env.GITHUB_EMAIL,
    baseDir: config?.baseDir || process.env.GITHUB_REPOS_DIR || '/tmp/holly-repos',
  });
}

export default GitHubClient;
