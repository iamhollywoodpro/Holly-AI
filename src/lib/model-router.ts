/**
 * Multi-Model LLM Router for HOLLY
 * Routes tasks to the best model based on task type
 */

import Groq from 'groq-sdk';
import Bytez from 'bytez.js';

// Initialize Groq for conversation
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

// Initialize Bytez for coding
const bytez = new Bytez(process.env.BYTEZ_API_KEY || '');

export type ModelType = 'conversation' | 'coding' | 'quick';
export type ModelProvider = 'groq' | 'bytez';

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  description: string;
}

/**
 * Available models for HOLLY
 */
export const MODELS: Record<ModelType, ModelConfig> = {
  conversation: {
    provider: 'groq',
    model: 'llama-3.3-70b-versatile',
    description: 'Best for conversation, reasoning, and general tasks',
  },
  coding: {
    provider: 'bytez',
    model: 'zai-org/glm-4-9b-chat-hf',
    description: 'Best for code generation, debugging, and technical tasks',
  },
  quick: {
    provider: 'bytez',
    model: 'zai-org/glm-edge-4b-chat',
    description: 'Best for quick responses and simple tasks',
  },
};

/**
 * Detect if the user's message is a coding request
 */
export function detectTaskType(message: string): ModelType {
  const lowerMessage = message.toLowerCase();
  
  // Coding keywords
  const codingKeywords = [
    'code', 'function', 'class', 'debug', 'error', 'bug',
    'implement', 'write a', 'create a', 'build a',
    'python', 'javascript', 'typescript', 'react', 'node',
    'api', 'database', 'sql', 'query', 'algorithm',
    'fix', 'refactor', 'optimize', 'test',
    'component', 'hook', 'endpoint', 'route',
    'syntax', 'compile', 'runtime', 'exception',
  ];
  
  // Quick response keywords
  const quickKeywords = [
    'quick', 'simple', 'short', 'brief', 'yes or no',
    'what is', 'define', 'explain briefly',
  ];
  
  // Check for coding keywords
  const isCoding = codingKeywords.some(keyword => lowerMessage.includes(keyword));
  if (isCoding) {
    return 'coding';
  }
  
  // Check for quick response keywords
  const isQuick = quickKeywords.some(keyword => lowerMessage.includes(keyword));
  if (isQuick && message.length < 100) {
    return 'quick';
  }
  
  // Default to conversation
  return 'conversation';
}

/**
 * Generate response using Groq (llama-3.3-70b)
 */
async function generateWithGroq(
  messages: Array<{ role: string; content: string }>,
  stream: boolean = true
) {
  return await groq.chat.completions.create({
    messages: messages as any,
    model: MODELS.conversation.model,
    temperature: 0.7,
    max_tokens: 4096,
    stream,
  });
}

/**
 * Generate response using Bytez (GLM models)
 */
async function generateWithBytez(
  messages: Array<{ role: string; content: string }>,
  modelType: 'coding' | 'quick'
) {
  const modelConfig = MODELS[modelType];
  const model = bytez.model(modelConfig.model);
  
  // Convert messages to single prompt (Bytez doesn't support chat format)
  const prompt = messages
    .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');
  
  const { error, output } = await model.run(prompt);
  
  if (error) {
    throw new Error(`Bytez error: ${error}`);
  }
  
  return output;
}

/**
 * Main router function - selects and calls the best model
 */
export async function routeToModel(
  messages: Array<{ role: string; content: string }>,
  taskType?: ModelType,
  stream: boolean = true
): Promise<any> {
  // Auto-detect task type if not provided
  const detectedType = taskType || detectTaskType(messages[messages.length - 1].content);
  const modelConfig = MODELS[detectedType];
  
  console.log(`[Model Router] Task type: ${detectedType}`);
  console.log(`[Model Router] Using: ${modelConfig.model} (${modelConfig.provider})`);
  
  // Route to appropriate model
  if (modelConfig.provider === 'groq') {
    return await generateWithGroq(messages, stream);
  } else {
    // Bytez doesn't support streaming yet, return as single response
    const response = await generateWithBytez(messages, detectedType as 'coding' | 'quick');
    return response;
  }
}

/**
 * Get model info for display in UI
 */
export function getModelInfo(taskType: ModelType): ModelConfig {
  return MODELS[taskType];
}
