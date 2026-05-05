// Suggestion types for AI-powered contextual suggestions

export interface Suggestion {
  id: string;
  type: 'question' | 'action' | 'tool' | 'navigation';
  text: string;
  icon: string;
  action: 'send_message' | 'execute_tool' | 'navigate';
  payload?: any;
  relevanceScore: number;
}

export interface GenerateSuggestionsRequest {
  conversationId: string;
  messageCount?: number;
}

export interface GenerateSuggestionsResponse {
  suggestions: Suggestion[];
  contextUsed: number;
}
