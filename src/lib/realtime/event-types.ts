/**
 * Real-time Event Types
 * Phase 8.2 — Typed definitions for WebSocket and SSE events
 */

// ── Event types ──────────────────────────────────────────────────────────────

export type RealtimeEventType =
  | 'typing_start'
  | 'typing_stop'
  | 'message_new'
  | 'message_delta'
  | 'message_complete'
  | 'conversation_created'
  | 'conversation_updated'
  | 'conversation_deleted'
  | 'consciousness_state_change'
  | 'proactive_notification'
  | 'morning_briefing'
  | 'insight_delivered'
  | 'tool_call_start'
  | 'tool_call_result'
  | 'system_health'
  | 'presence_online'
  | 'presence_offline'
  | 'heartbeat'
  | 'error';

// ── Event payloads ───────────────────────────────────────────────────────────

export interface BaseEvent {
  type: RealtimeEventType;
  timestamp: string;
  userId?: string;
}

export interface TypingEvent extends BaseEvent {
  type: 'typing_start' | 'typing_stop';
  conversationId: string;
}

export interface MessageNewEvent extends BaseEvent {
  type: 'message_new';
  conversationId: string;
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface MessageDeltaEvent extends BaseEvent {
  type: 'message_delta';
  conversationId: string;
  messageId: string;
  delta: string;
}

export interface MessageCompleteEvent extends BaseEvent {
  type: 'message_complete';
  conversationId: string;
  messageId: string;
  fullContent: string;
}

export interface ConversationEvent extends BaseEvent {
  type: 'conversation_created' | 'conversation_updated' | 'conversation_deleted';
  conversationId: string;
  title?: string;
}

export interface ConsciousnessStateEvent extends BaseEvent {
  type: 'consciousness_state_change';
  emotionalState: string;
  mood: string;
  energy: number;
}

export interface ProactiveNotificationEvent extends BaseEvent {
  type: 'proactive_notification' | 'morning_briefing' | 'insight_delivered';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ToolCallEvent extends BaseEvent {
  type: 'tool_call_start' | 'tool_call_result';
  toolName: string;
  conversationId?: string;
  result?: string;
}

export interface SystemHealthEvent extends BaseEvent {
  type: 'system_health';
  status: 'healthy' | 'degraded' | 'critical';
  subsystems: Record<string, string>;
}

export interface PresenceEvent extends BaseEvent {
  type: 'presence_online' | 'presence_offline';
  userName: string;
}

export interface HeartbeatEvent extends BaseEvent {
  type: 'heartbeat';
  serverTime: string;
}

export interface ErrorEvent extends BaseEvent {
  type: 'error';
  message: string;
  code?: string;
}

// ── Union type ───────────────────────────────────────────────────────────────

export type RealtimeEvent =
  | TypingEvent
  | MessageNewEvent
  | MessageDeltaEvent
  | MessageCompleteEvent
  | ConversationEvent
  | ConsciousnessStateEvent
  | ProactiveNotificationEvent
  | ToolCallEvent
  | SystemHealthEvent
  | PresenceEvent
  | HeartbeatEvent
  | ErrorEvent;

// ── Client messages (sent from browser to server) ────────────────────────────

export type ClientMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'ping'
  | 'typing'
  | 'stop_typing';

export interface ClientMessage {
  type: ClientMessageType;
  conversationId?: string;
  timestamp?: string;
}
