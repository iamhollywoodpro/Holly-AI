/**
 * HOLLY API Types
 * 
 * Shared TypeScript types for all API routes.
 */

// ============================================================================
// Common Response Types
// ============================================================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    responseTime?: number;
    timestamp?: string;
    version?: string;
  };
}

export interface PaginatedResponse<T> extends APIResponse<T> {
  pagination?: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// Chat API Types
// ============================================================================

export interface ChatRequest {
  message: string;
  userId?: string;
  conversationId?: string;
  context?: {
    previousMessages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    userPreferences?: Record<string, any>;
  };
}

export interface ChatResponse {
  response: string;
  emotion?: {
    primary: string;
    intensity: number;
    confidence: number;
  };
  conversationId: string;
  timestamp: string;
  metadata?: {
    responseTime: number;
    tokensUsed?: number;
  };
}

// ============================================================================
// Code Generation API Types
// ============================================================================

export type SupportedLanguage = 
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'nodejs'
  | 'react'
  | 'html'
  | 'css'
  | 'sql'
  | 'php';

export type CodeTemplate = 
  | 'react-component'
  | 'react-hook'
  | 'api-route'
  | 'database-schema'
  | 'express-server'
  | 'typescript-class'
  | 'python-class'
  | 'sql-migration'
  | 'html-page'
  | 'css-module';

export interface CodeStyle {
  indent?: 'tabs' | 'spaces';
  indentSize?: number;
  quotes?: 'single' | 'double';
  semicolons?: boolean;
  trailingComma?: boolean;
  lineLength?: number;
  naming?: 'camelCase' | 'snake_case' | 'PascalCase';
}

export interface CodeGenerateRequest {
  prompt: string;
  language: SupportedLanguage;
  template?: CodeTemplate;
  userId?: string;
  includeTests?: boolean;
  includeDocs?: boolean;
  optimizationLevel?: 'basic' | 'standard' | 'aggressive';
  style?: CodeStyle;
  targetEnvironment?: 'production' | 'development' | 'test';
  context?: string;
}

export interface GeneratedCode {
  code: string;
  language: SupportedLanguage;
  filename: string;
  documentation?: string;
  tests?: string;
  dependencies?: string[];
  warnings?: string[];
  suggestions?: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export interface CodeGenerateResponse {
  success: boolean;
  code?: GeneratedCode;
  securityScan?: SecurityScan;
  ethicsCheck?: EthicsCheck;
  blocked?: boolean;
  blockReason?: string;
  emotion?: {
    detected: string;
    intensity: number;
  };
  metadata?: {
    responseTime: number;
    timestamp: string;
  };
}

// ============================================================================
// Code Review API Types
// ============================================================================

export interface CodeReviewRequest {
  code: string;
  language: SupportedLanguage;
  userId?: string;
}

export interface CodeReview {
  score: number;
  issues: CodeIssue[];
  suggestions: string[];
  securityConcerns: string[];
  performanceNotes: string[];
  bestPractices: string[];
}

export interface CodeIssue {
  severity: 'error' | 'warning' | 'info';
  line?: number;
  message: string;
  fix?: string;
}

export interface SecurityScan {
  score: number;
  issues: SecurityIssue[];
  vulnerabilities: Vulnerability[];
  secrets: DetectedSecret[];
  dangerousFunctions: DangerousFunction[];
  passed: boolean;
}

export interface SecurityIssue {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  line?: number;
  code: string;
  description: string;
  fix: string;
  cwe?: string;
}

export interface Vulnerability {
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  affectedCode: string;
  mitigation: string;
}

export interface DetectedSecret {
  type: string;
  pattern: string;
  line?: number;
  recommendation: string;
}

export interface DangerousFunction {
  function: string;
  reason: string;
  alternative: string;
  line?: number;
}

export interface CodeReviewResponse {
  success: boolean;
  review?: {
    codeReview: CodeReview;
    securityScan: SecurityScan;
    overallScore: number;
    passed: boolean;
  };
  recommendations?: string[];
  metadata?: {
    responseTime: number;
    timestamp: string;
  };
}

// ============================================================================
// Code Optimization API Types
// ============================================================================

export interface CodeOptimizeRequest {
  code: string;
  language: SupportedLanguage;
  level?: 'basic' | 'standard' | 'aggressive';
  userId?: string;
}

export interface OptimizationResult {
  originalCode: string;
  optimizedCode: string;
  improvements: string[];
  performanceGain?: string;
  complexityReduction?: string;
}

export interface CodeOptimizeResponse {
  success: boolean;
  optimization?: OptimizationResult;
  securityScan?: SecurityScan;
  summary?: {
    improvements: number;
    performanceGain: string;
    complexity: string;
    highlights: string[];
  };
  metadata?: {
    level: string;
    responseTime: number;
    timestamp: string;
  };
}

// ============================================================================
// GitHub API Types
// ============================================================================

export interface GitHubRepository {
  name: string;
  fullName: string;
  description?: string;
  url: string;
  cloneUrl?: string;
  private: boolean;
  stars?: number;
  forks?: number;
  language?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  url: string;
  author?: {
    name: string;
    email: string;
  };
  date?: string;
}

export interface GitHubFile {
  path: string;
  content?: string;
  sha: string;
  size: number;
  url: string;
  downloadUrl?: string;
}

export interface CreateRepoRequest {
  name: string;
  description?: string;
  private?: boolean;
  userId?: string;
}

export interface CommitRequest {
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  branch?: string;
  userId?: string;
}

export interface GitHubResponse {
  success: boolean;
  repository?: GitHubRepository;
  repositories?: GitHubRepository[];
  commit?: GitHubCommit;
  file?: GitHubFile;
  count?: number;
  message?: string;
}

// ============================================================================
// Deployment API Types
// ============================================================================

export interface DeployRequest {
  action: 'upload' | 'deploy' | 'backup' | 'rollback' | 'health-check';
  files?: Array<{
    path: string;
    content: string;
  }>;
  backupId?: string;
  userId?: string;
}

export interface DeploymentResult {
  filesUploaded?: number;
  filesDeployed?: number;
  files?: Array<{
    path: string;
    success: boolean;
    size: number;
  }>;
  backup?: {
    id: string;
    timestamp: string;
  };
  health?: HealthCheck;
}

export interface HealthCheck {
  healthy: boolean;
  statusCode?: number;
  responseTime?: number;
  checks?: Array<{
    name: string;
    passed: boolean;
    message?: string;
  }>;
}

export interface DeployResponse {
  success: boolean;
  action?: string;
  result?: DeploymentResult;
  status?: string;
  health?: HealthCheck;
  backups?: any[];
  metadata?: {
    responseTime: number;
    timestamp: string;
  };
}

// ============================================================================
// Ethics Framework Types
// ============================================================================

export interface EthicsCheck {
  approved: boolean;
  score: number;
  violations: EthicsViolation[];
  warnings: EthicsWarning[];
  reason?: string;
}

export interface EthicsViolation {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  detectedPattern: string;
  recommendation: string;
}

export interface EthicsWarning {
  category: string;
  message: string;
  guidance: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface APIError {
  error: string;
  message?: string;
  code?: string;
  details?: any;
  timestamp?: string;
}

// ============================================================================
// Utility Types
// ============================================================================

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestMetadata {
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  timestamp: string;
}
