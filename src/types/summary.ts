// Conversation summary types

export interface ImportantMoment {
  messageId: string;
  type: 'decision' | 'code' | 'solution' | 'file' | 'link' | 'milestone';
  description: string;
  timestamp: string;
}

export interface ConversationSummary {
  id: string;
  conversationId: string;
  summary: string; // Main 2-3 sentence summary
  keyPoints: string[]; // Array of key points
  topics: string[]; // Tags/topics discussed
  outcome?: string; // Resolution or outcome
  importantMoments: ImportantMoment[]; // Key moments for jumping
  progress?: number; // 0.0-1.0 for project conversations
  projectId?: string; // Link to project if applicable
  messageCount: number; // # messages when generated
  generatedAt: string;
  updatedAt: string;
}

export interface GenerateSummaryRequest {
  conversationId: string;
  forceRegenerate?: boolean;
}

export interface GenerateSummaryResponse {
  summary: ConversationSummary;
  cached: boolean;
}
