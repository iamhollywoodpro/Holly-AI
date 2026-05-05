/**
 * Deployment Types and Interfaces
 * Defines types for deployment workflows, environments, and status tracking
 */

export type DeploymentEnvironment = 'production' | 'preview' | 'development';

export interface DeploymentTarget {
  name: string;
  environment: DeploymentEnvironment;
  projectId: string;
  domain?: string;
  color: string; // For UI indicators
  icon: string; // Emoji for visual identification
  requiresConfirmation: boolean; // Production requires explicit confirmation
}

export interface DeploymentStatus {
  id: string;
  url: string;
  state: 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  environment: DeploymentEnvironment;
  createdAt: number;
  readyAt?: number;
  errorMessage?: string;
}

export interface DeploymentConfig {
  projectId: string;
  gitSource?: {
    type: 'github';
    ref: string; // branch or commit SHA
    repoId: number;
  };
  target?: 'production' | 'staging' | 'preview';
  env?: Record<string, string>; // Environment variables
}

/**
 * Pre-configured deployment targets
 * Can be extended to support multiple projects/environments
 */
export const DEPLOYMENT_TARGETS: Record<string, DeploymentTarget> = {
  production: {
    name: 'Production',
    environment: 'production',
    projectId: 'prj_uVVYfz9ltTSboB7LCSmyIXoa5fST',
    domain: 'holly.nexamusicgroup.com',
    color: 'text-green-400',
    icon: '🚀',
    requiresConfirmation: true,
  },
  preview: {
    name: 'Preview',
    environment: 'preview',
    projectId: 'prj_uVVYfz9ltTSboB7LCSmyIXoa5fST',
    color: 'text-blue-400',
    icon: '👀',
    requiresConfirmation: false,
  },
  development: {
    name: 'Development',
    environment: 'development',
    projectId: 'prj_uVVYfz9ltTSboB7LCSmyIXoa5fST',
    color: 'text-yellow-400',
    icon: '🔧',
    requiresConfirmation: false,
  },
};

/**
 * Get deployment target configuration
 */
export function getDeploymentTarget(environment: DeploymentEnvironment): DeploymentTarget {
  return DEPLOYMENT_TARGETS[environment] || DEPLOYMENT_TARGETS.preview;
}

/**
 * Format deployment state for display
 */
export function formatDeploymentState(state: DeploymentStatus['state']): {
  label: string;
  color: string;
  icon: string;
} {
  const stateMap = {
    QUEUED: { label: 'Queued', color: 'text-gray-400', icon: '⏳' },
    BUILDING: { label: 'Building', color: 'text-blue-400', icon: '🔨' },
    READY: { label: 'Ready', color: 'text-green-400', icon: '✅' },
    ERROR: { label: 'Error', color: 'text-red-400', icon: '❌' },
    CANCELED: { label: 'Canceled', color: 'text-gray-400', icon: '🚫' },
  };

  return stateMap[state] || stateMap.ERROR;
}
