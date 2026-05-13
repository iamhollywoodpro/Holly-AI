/**
 * Self-Hosting Config Generator — Local model configuration for sovereignty
 *
 * Generates Ollama/local LLM configurations, checks model availability,
 * and provides fallback routing when external APIs are unavailable.
 * This enables Holly to run fully offline/self-hosted.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type ModelProvider = 'ollama' | 'lmstudio' | 'local-api' | 'groq' | 'openrouter';

export interface LocalModelConfig {
  id: string;
  name: string;
  provider: ModelProvider;
  endpoint: string;
  modelId: string;          // Provider-specific model ID
  contextWindow: number;    // Token limit
  capabilities: ('chat' | 'vision' | 'code' | 'embedding')[];
  speedTier: 'fast' | 'medium' | 'slow';
  qualityTier: 'basic' | 'good' | 'excellent';
  minRamGB: number;
  recommendedFor: string[];
}

export interface SelfHostingConfig {
  models: LocalModelConfig[];
  primaryChat: string;       // Model ID for primary chat
  primaryVision: string | null;
  primaryCode: string | null;
  primaryEmbedding: string | null;
  fallbackChain: string[];   // Model IDs in fallback order
  ollamaEndpoint: string;
  isFullyLocal: boolean;
}

export interface ModelHealthCheck {
  modelId: string;
  available: boolean;
  latencyMs: number | null;
  error: string | null;
}

// ─── Model Registry ─────────────────────────────────────────────────────────

export const RECOMMENDED_MODELS: LocalModelConfig[] = [
  {
    id: 'llama3.1-8b',
    name: 'Llama 3.1 8B',
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    modelId: 'llama3.1:8b',
    contextWindow: 128000,
    capabilities: ['chat', 'code'],
    speedTier: 'fast',
    qualityTier: 'good',
    minRamGB: 8,
    recommendedFor: ['general chat', 'fast responses', 'code assistance'],
  },
  {
    id: 'llama3.1-70b',
    name: 'Llama 3.1 70B',
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    modelId: 'llama3.1:70b',
    contextWindow: 128000,
    capabilities: ['chat', 'code'],
    speedTier: 'slow',
    qualityTier: 'excellent',
    minRamGB: 48,
    recommendedFor: ['complex reasoning', 'long conversations', 'detailed analysis'],
  },
  {
    id: 'gemma2-9b',
    name: 'Gemma 2 9B',
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    modelId: 'gemma2:9b',
    contextWindow: 8192,
    capabilities: ['chat'],
    speedTier: 'fast',
    qualityTier: 'good',
    minRamGB: 8,
    recommendedFor: ['quick chat', 'lightweight tasks'],
  },
  {
    id: 'qwen2.5-coder-7b',
    name: 'Qwen 2.5 Coder 7B',
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    modelId: 'qwen2.5-coder:7b',
    contextWindow: 32768,
    capabilities: ['chat', 'code'],
    speedTier: 'fast',
    qualityTier: 'good',
    minRamGB: 8,
    recommendedFor: ['code generation', 'debugging', 'code review'],
  },
  {
    id: 'llava-1.6-7b',
    name: 'LLaVA 1.6 7B',
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    modelId: 'llava:7b',
    contextWindow: 4096,
    capabilities: ['chat', 'vision'],
    speedTier: 'medium',
    qualityTier: 'basic',
    minRamGB: 8,
    recommendedFor: ['image analysis', 'visual Q&A'],
  },
  {
    id: 'nomic-embed',
    name: 'Nomic Embed Text',
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    modelId: 'nomic-embed-text',
    contextWindow: 8192,
    capabilities: ['embedding'],
    speedTier: 'fast',
    qualityTier: 'good',
    minRamGB: 4,
    recommendedFor: ['semantic search', 'memory embeddings'],
  },
  {
    id: 'mistral-7b',
    name: 'Mistral 7B',
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    modelId: 'mistral:7b',
    contextWindow: 32768,
    capabilities: ['chat', 'code'],
    speedTier: 'fast',
    qualityTier: 'good',
    minRamGB: 8,
    recommendedFor: ['general chat', 'fast inference', 'instruction following'],
  },
  {
    id: 'phi3-medium',
    name: 'Phi-3 Medium 14B',
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    modelId: 'phi3:medium',
    contextWindow: 128000,
    capabilities: ['chat', 'code'],
    speedTier: 'medium',
    qualityTier: 'good',
    minRamGB: 12,
    recommendedFor: ['reasoning', 'long context', 'instruction following'],
  },
];

// ─── Config Generation ──────────────────────────────────────────────────────

/**
 * Generate a self-hosting configuration based on available system resources.
 */
export function generateSelfHostingConfig(
  availableRamGB: number,
  preferredProvider: ModelProvider = 'ollama',
  customEndpoint?: string,
): SelfHostingConfig {
  const endpoint = customEndpoint || getDefaultEndpoint(preferredProvider);

  // Filter models that fit in available RAM
  const affordableModels = RECOMMENDED_MODELS.filter(
    m => m.minRamGB <= availableRamGB && m.provider === preferredProvider,
  ).map(m => ({ ...m, endpoint }));

  // If no models fit, use the smallest one anyway
  const models = affordableModels.length > 0
    ? affordableModels
    : [{ ...RECOMMENDED_MODELS.reduce((a, b) => a.minRamGB < b.minRamGB ? a : b), endpoint }];

  // Select primary models by capability
  const primaryChat = selectBestModel(models, 'chat', availableRamGB);
  const primaryVision = selectBestModel(models, 'vision', availableRamGB);
  const primaryCode = selectBestModel(models, 'code', availableRamGB);
  const primaryEmbedding = selectBestModel(models, 'embedding', availableRamGB);

  // Build fallback chain (fastest to slowest)
  const fallbackChain = [...models]
    .sort((a, b) => {
      const speedOrder = { fast: 0, medium: 1, slow: 2 };
      return speedOrder[a.speedTier] - speedOrder[b.speedTier];
    })
    .map(m => m.id);

  return {
    models,
    primaryChat: primaryChat?.id || models[0].id,
    primaryVision: primaryVision?.id || null,
    primaryCode: primaryCode?.id || null,
    primaryEmbedding: primaryEmbedding?.id || null,
    fallbackChain,
    ollamaEndpoint: endpoint,
    isFullyLocal: preferredProvider === 'ollama' || preferredProvider === 'lmstudio',
  };
}

/**
 * Select the best model for a given capability within RAM constraints.
 */
export function selectBestModel(
  models: LocalModelConfig[],
  capability: string,
  maxRamGB: number,
): LocalModelConfig | null {
  const candidates = models.filter(
    m => m.capabilities.includes(capability as any) && m.minRamGB <= maxRamGB,
  );

  if (candidates.length === 0) return null;

  // Prefer excellent quality, then good, then basic
  const qualityOrder = { excellent: 0, good: 1, basic: 2 };
  candidates.sort((a, b) => qualityOrder[a.qualityTier] - qualityOrder[b.qualityTier]);

  return candidates[0];
}

/**
 * Get the default endpoint for a provider.
 */
export function getDefaultEndpoint(provider: ModelProvider): string {
  switch (provider) {
    case 'ollama': return 'http://localhost:11434';
    case 'lmstudio': return 'http://localhost:1234';
    case 'local-api': return 'http://localhost:8000';
    case 'groq': return 'https://api.groq.com/openai/v1';
    case 'openrouter': return 'https://openrouter.ai/api/v1';
    default: return 'http://localhost:11434';
  }
}

// ─── Model Selection ────────────────────────────────────────────────────────

/**
 * Select a model for a specific task based on requirements.
 */
export function selectModelForTask(
  config: SelfHostingConfig,
  task: 'chat' | 'vision' | 'code' | 'embedding' | 'fast-chat',
  complexity: 'simple' | 'moderate' | 'complex' = 'moderate',
): LocalModelConfig | null {
  let modelId: string | null = null;

  switch (task) {
    case 'chat':
      modelId = complexity === 'simple' && config.fallbackChain[0]
        ? config.fallbackChain[0]
        : config.primaryChat;
      break;
    case 'vision':
      modelId = config.primaryVision;
      break;
    case 'code':
      modelId = config.primaryCode || config.primaryChat;
      break;
    case 'embedding':
      modelId = config.primaryEmbedding;
      break;
    case 'fast-chat':
      modelId = config.fallbackChain[0] || config.primaryChat;
      break;
  }

  if (!modelId) return null;
  return config.models.find(m => m.id === modelId) || null;
}

/**
 * Build a fallback chain for a specific task.
 */
export function buildTaskFallbackChain(
  config: SelfHostingConfig,
  task: 'chat' | 'vision' | 'code' | 'fast-chat',
): string[] {
  const capability: LocalModelConfig['capabilities'][number] = task === 'fast-chat' ? 'chat' : task;
  const capable = config.models.filter(
    m => m.capabilities.includes(capability),
  );

  // Sort by quality (best first), then speed (fastest first)
  const qualityOrder = { excellent: 0, good: 1, basic: 2 };
  const speedOrder = { fast: 0, medium: 1, slow: 2 };

  return capable
    .sort((a, b) => {
      const qDiff = qualityOrder[a.qualityTier] - qualityOrder[b.qualityTier];
      if (qDiff !== 0) return qDiff;
      return speedOrder[a.speedTier] - speedOrder[b.speedTier];
    })
    .map(m => m.id);
}

// ─── Config Validation ──────────────────────────────────────────────────────

/**
 * Validate a self-hosting configuration.
 */
export function validateSelfHostingConfig(config: SelfHostingConfig): {
  valid: boolean;
  warnings: string[];
  errors: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (config.models.length === 0) {
    errors.push('No models configured');
  }

  if (!config.primaryChat) {
    errors.push('No primary chat model selected');
  }

  const chatModel = config.models.find(m => m.id === config.primaryChat);
  if (chatModel && !chatModel.capabilities.includes('chat')) {
    errors.push('Primary chat model does not support chat capability');
  }

  if (config.primaryVision) {
    const visionModel = config.models.find(m => m.id === config.primaryVision);
    if (!visionModel) {
      warnings.push('Primary vision model not found in model list');
    } else if (!visionModel.capabilities.includes('vision')) {
      warnings.push('Primary vision model does not support vision capability');
    }
  }

  if (!config.primaryEmbedding) {
    warnings.push('No embedding model configured — semantic search will use external API');
  }

  if (!config.isFullyLocal) {
    warnings.push('Configuration uses external APIs — not fully self-hosted');
  }

  return { valid: errors.length === 0, warnings, errors };
}

// ─── Config Summary ─────────────────────────────────────────────────────────

/**
 * Generate a human-readable summary of the self-hosting config.
 */
export function configSummary(config: SelfHostingConfig): string {
  const lines: string[] = [];

  lines.push(`Self-Hosting Configuration (${config.isFullyLocal ? 'FULLY LOCAL' : 'HYBRID'})`);
  lines.push(`Models: ${config.models.length} available`);
  lines.push(`Primary Chat: ${config.primaryChat || 'none'}`);
  if (config.primaryVision) lines.push(`Primary Vision: ${config.primaryVision}`);
  if (config.primaryCode) lines.push(`Primary Code: ${config.primaryCode}`);
  if (config.primaryEmbedding) lines.push(`Primary Embedding: ${config.primaryEmbedding}`);
  lines.push(`Fallback Chain: ${config.fallbackChain.join(' → ')}`);
  lines.push(`Endpoint: ${config.ollamaEndpoint}`);

  return lines.join('\n');
}
