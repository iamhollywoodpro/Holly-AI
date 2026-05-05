/**
 * HOLLY Context Manager
 * 
 * Prevents 400 errors in long conversations by:
 * 1. Intelligently limiting conversation history
 * 2. Summarizing old messages to save tokens
 * 3. Ensuring requests never exceed token limits
 */

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ContextConfig {
  maxMessages: number;
  maxTokensPerMessage: number;
  enableSummarization: boolean;
}

const DEFAULT_CONFIG: ContextConfig = {
  maxMessages: 15, // Keep last 15 messages (reduced from 20 for safety)
  maxTokensPerMessage: 4000, // Truncate extremely long messages
  enableSummarization: true,
};

/**
 * Estimate token count (rough approximation: 1 token ≈ 4 characters)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate message if it's too long
 */
export function truncateMessage(message: Message, maxTokens: number): Message {
  const estimatedTokens = estimateTokens(message.content);
  
  if (estimatedTokens <= maxTokens) {
    return message;
  }

  // Truncate to max tokens
  const maxChars = maxTokens * 4;
  const truncated = message.content.substring(0, maxChars);
  
  return {
    ...message,
    content: truncated + '\n\n[Message truncated due to length]',
  };
}

/**
 * Summarize old messages to save tokens
 */
export function summarizeOldMessages(messages: Message[]): Message[] {
  if (messages.length <= 5) {
    return messages; // Too few to summarize
  }

  // Keep first 2 and last 10 messages, summarize the middle
  const first = messages.slice(0, 2);
  const middle = messages.slice(2, -10);
  const last = messages.slice(-10);

  if (middle.length === 0) {
    return messages;
  }

  // Create summary of middle messages
  const summary: Message = {
    role: 'system',
    content: `[Previous conversation summary: ${middle.length} messages exchanged covering: ${
      middle
        .filter(m => m.role === 'user')
        .map(m => m.content.substring(0, 50))
        .join(', ')
    }...]`,
  };

  return [...first, summary, ...last];
}

/**
 * Manage conversation context to prevent 400 errors
 */
export function manageContext(
  messages: Message[],
  config: Partial<ContextConfig> = {}
): Message[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Step 1: Limit to recent messages
  let limitedMessages = messages.length > cfg.maxMessages
    ? messages.slice(-cfg.maxMessages)
    : messages;

  // Step 2: Truncate extremely long individual messages
  limitedMessages = limitedMessages.map(msg =>
    truncateMessage(msg, cfg.maxTokensPerMessage)
  );

  // Step 3: Summarize if still too many messages
  if (cfg.enableSummarization && limitedMessages.length > 12) {
    limitedMessages = summarizeOldMessages(limitedMessages);
  }

  return limitedMessages;
}

/**
 * Calculate total tokens in message array
 */
export function calculateTotalTokens(messages: Message[]): number {
  return messages.reduce((total, msg) => total + estimateTokens(msg.content), 0);
}

/**
 * Validate that messages won't cause 400 error
 */
export function validateMessages(messages: Message[]): {
  valid: boolean;
  issues: string[];
  estimatedTokens: number;
} {
  const issues: string[] = [];
  const estimatedTokens = calculateTotalTokens(messages);

  // Check for common issues
  if (messages.length === 0) {
    issues.push('No messages provided');
  }

  if (messages.some(m => !m.content || m.content.trim() === '')) {
    issues.push('Some messages have empty content');
  }

  if (messages.some(m => !['system', 'user', 'assistant'].includes(m.role))) {
    issues.push('Invalid message roles detected');
  }

  // Warn if approaching limits (800K tokens out of 1M)
  if (estimatedTokens > 800000) {
    issues.push('Message history approaching token limit - conversation reset recommended');
  }

  return {
    valid: issues.length === 0,
    issues,
    estimatedTokens,
  };
}
