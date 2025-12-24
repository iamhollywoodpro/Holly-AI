/**
 * Tool Execution Framework
 * Provides actual tool execution with real GitHub, Bash, and File operations
 */

import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Initialize GitHub client
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

const REPO_OWNER = 'iamhollywoodpro';
const REPO_NAME = 'Holly-AI';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * GitHub Tools
 */
export async function githubReadFile(path: string): Promise<ToolResult> {
  try {
    const response = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path
    });

    if ('content' in response.data) {
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      return {
        success: true,
        data: {
          path,
          content,
          sha: response.data.sha
        }
      };
    }

    return {
      success: false,
      error: 'File not found or is a directory'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function githubWriteFile(
  path: string,
  content: string,
  message: string,
  sha?: string
): Promise<ToolResult> {
  try {
    const response = await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
      sha
    });

    return {
      success: true,
      data: {
        path,
        sha: response.data.content?.sha,
        commit: response.data.commit.sha
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function githubListFiles(path: string = ''): Promise<ToolResult> {
  try {
    const response = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path
    });

    if (Array.isArray(response.data)) {
      return {
        success: true,
        data: response.data.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          size: item.size
        }))
      };
    }

    return {
      success: false,
      error: 'Path is not a directory'
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Bash/Terminal Tools
 */
export async function bashExecute(command: string): Promise<ToolResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: '/home/ubuntu/Holly-AI',
      timeout: 30000 // 30 second timeout
    });

    return {
      success: true,
      data: {
        stdout: stdout.trim(),
        stderr: stderr.trim()
      }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      data: {
        stdout: error.stdout?.trim() || '',
        stderr: error.stderr?.trim() || ''
      }
    };
  }
}

/**
 * File System Tools
 */
export async function fileRead(path: string): Promise<ToolResult> {
  try {
    const content = await fs.readFile(path, 'utf-8');
    return {
      success: true,
      data: { path, content }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function fileWrite(path: string, content: string): Promise<ToolResult> {
  try {
    await fs.writeFile(path, content, 'utf-8');
    return {
      success: true,
      data: { path }
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function fileList(dirPath: string): Promise<ToolResult> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return {
      success: true,
      data: entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file',
        path: `${dirPath}/${entry.name}`
      }))
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Tool Executor
 * Routes tool calls to the appropriate handler
 */
export async function executeTool(
  toolName: string,
  args: any
): Promise<ToolResult> {
  console.log(`[Tool Executor] Executing: ${toolName}`, args);

  switch (toolName) {
    case 'github_read_file':
      return githubReadFile(args.path);
    
    case 'github_write_file':
      return githubWriteFile(args.path, args.content, args.message, args.sha);
    
    case 'github_list_files':
      return githubListFiles(args.path);
    
    case 'bash_execute':
      return bashExecute(args.command);
    
    case 'file_read':
      return fileRead(args.path);
    
    case 'file_write':
      return fileWrite(args.path, args.content);
    
    case 'file_list':
      return fileList(args.path);
    
    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`
      };
  }
}

/**
 * Tool Definitions for Gemini
 */
export const toolDefinitions = [
  {
    name: 'github_read_file',
    description: 'Read a file from the Holly-AI GitHub repository',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file in the repository (e.g., "src/App.tsx")'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'github_write_file',
    description: 'Write or update a file in the Holly-AI GitHub repository',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file'
        },
        content: {
          type: 'string',
          description: 'File content'
        },
        message: {
          type: 'string',
          description: 'Commit message'
        },
        sha: {
          type: 'string',
          description: 'File SHA (required for updates, optional for new files)'
        }
      },
      required: ['path', 'content', 'message']
    }
  },
  {
    name: 'github_list_files',
    description: 'List files in a directory in the Holly-AI repository',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path (empty string for root)'
        }
      },
      required: []
    }
  },
  {
    name: 'bash_execute',
    description: 'Execute a bash command in the Holly-AI project directory',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Bash command to execute'
        }
      },
      required: ['command']
    }
  },
  {
    name: 'file_read',
    description: 'Read a file from the local filesystem',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path to the file'
        }
      },
      required: ['path']
    }
  },
  {
    name: 'file_write',
    description: 'Write content to a file in the local filesystem',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Absolute path to the file'
        },
        content: {
          type: 'string',
          description: 'Content to write'
        }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'file_list',
    description: 'List files in a directory',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path'
        }
      },
      required: ['path']
    }
  }
];
