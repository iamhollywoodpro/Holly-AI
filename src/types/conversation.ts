/**
 * Conversation Types
 * TypeScript interfaces for conversation management
 */

export interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  lastMessagePreview: string | null;
  createdAt: Date;
  updatedAt: Date;
  pinned?: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  emotion?: string | null;
  createdAt: Date;
}

export interface ConversationCreateRequest {
  title?: string;
  firstMessage?: string;
}

export interface ConversationCreateResponse {
  conversation: Conversation;
}

export interface ConversationListResponse {
  conversations: Conversation[];
}

export interface MessageListResponse {
  messages: Message[];
}

export interface MessageCreateRequest {
  role: 'user' | 'assistant';
  content: string;
  emotion?: string;
}

export interface MessageCreateResponse {
  message: Message;
}
