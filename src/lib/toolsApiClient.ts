import crypto from 'crypto';

const TOOLS_API_URL = process.env.NEXT_PUBLIC_TOOLS_API_URL;
const API_KEY = process.env.TOOLS_API_KEY;
const API_SECRET = process.env.TOOLS_API_SECRET;

/**
 * Generate HMAC signature for request authentication
 */
function generateSignature(payload: any): string {
  if (!API_SECRET) {
    throw new Error('API_SECRET is not configured');
  }
  return crypto
    .createHmac('sha256', API_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
}

/**
 * Call HOLLY Tools API
 */
export async function callTool(endpoint: string, payload: any = {}): Promise<any> {
  if (!TOOLS_API_URL) {
    throw new Error('TOOLS_API_URL is not configured. Please set NEXT_PUBLIC_TOOLS_API_URL in your environment variables.');
  }

  if (!API_KEY) {
    throw new Error('API_KEY is not configured. Please set TOOLS_API_KEY in your environment variables.');
  }

  const method = Object.keys(payload).length > 0 ? 'POST' : 'GET';
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'X-HOLLY-API-KEY': API_KEY,
  };

  // Add signature for POST requests
  if (method === 'POST') {
    const signature = generateSignature(payload);
    headers['X-HOLLY-SIGNATURE'] = signature;
  }

  try {
    const response = await fetch(`${TOOLS_API_URL}${endpoint}`, {
      method,
      headers,
      ...(method === 'POST' && { body: JSON.stringify(payload) }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `API request failed with status ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('Tools API Error:', error);
    throw error;
  }
}

/**
 * GitHub Tools
 */
export const github = {
  /**
   * Read a file from the repository
   */
  readFile: async (filePath: string) => {
    return callTool('/api/tools/github/read-file', { filePath });
  },

  /**
   * Write a file to the repository
   */
  writeFile: async (filePath: string, content: string) => {
    return callTool('/api/tools/github/write-file', { filePath, content });
  },

  /**
   * Commit changes
   */
  commit: async (message: string, files?: string[]) => {
    return callTool('/api/tools/github/commit', { message, files: files || [] });
  },

  /**
   * Push changes to remote
   */
  push: async (branch: string = 'main') => {
    return callTool('/api/tools/github/push', { branch });
  },

  /**
   * Get repository status
   */
  getStatus: async () => {
    return callTool('/api/tools/github/status');
  },

  /**
   * List files in a directory
   */
  listFiles: async (dirPath: string = '.') => {
    return callTool('/api/tools/github/list-files', { dirPath });
  },

  /**
   * Create a pull request
   */
  createPR: async (title: string, body: string, head: string, base: string = 'main') => {
    return callTool('/api/tools/github/create-pr', { title, body, head, base });
  },
};

/**
 * Vercel Tools
 */
export const vercel = {
  /**
   * Deploy to Vercel
   */
  deploy: async (options: {
    gitBranch?: string;
    target?: 'production' | 'preview';
    forceRebuild?: boolean;
  } = {}) => {
    return callTool('/api/tools/vercel/deploy', {
      gitBranch: options.gitBranch || 'main',
      target: options.target || 'production',
      forceRebuild: options.forceRebuild || false,
    });
  },

  /**
   * Get deployment status
   */
  getStatus: async (deploymentId: string) => {
    return callTool(`/api/tools/vercel/status/${deploymentId}`);
  },

  /**
   * Get deployment logs
   */
  getLogs: async (deploymentId: string) => {
    return callTool(`/api/tools/vercel/logs/${deploymentId}`);
  },

  /**
   * List recent deployments
   */
  listDeployments: async (limit: number = 10) => {
    return callTool(`/api/tools/vercel/deployments?limit=${limit}`);
  },

  /**
   * Cancel a deployment
   */
  cancelDeployment: async (deploymentId: string) => {
    return callTool(`/api/tools/vercel/cancel/${deploymentId}`);
  },

  /**
   * Get project information
   */
  getProject: async () => {
    return callTool('/api/tools/vercel/project');
  },
};

/**
 * Helper: Check if Tools API is configured
 */
export function isToolsAPIConfigured(): boolean {
  return !!(TOOLS_API_URL && API_KEY && API_SECRET);
}

/**
 * Helper: Get Tools API status
 */
export async function checkToolsAPIHealth(): Promise<{ healthy: boolean; error?: string }> {
  if (!TOOLS_API_URL) {
    return { healthy: false, error: 'Tools API URL not configured' };
  }

  try {
    const response = await fetch(`${TOOLS_API_URL}/health`);
    const data = await response.json();
    return { healthy: data.success && data.status === 'healthy' };
  } catch (error) {
    return { healthy: false, error: (error as Error).message };
  }
}
