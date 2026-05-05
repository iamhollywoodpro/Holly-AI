/**
 * HOLLY CONVERSATION MANAGER
 * 
 * Manages conversations and messages for user interactions
 * 
 * Uses: Conversation, Message (Prisma models)
 * 
 * ACTUAL PRISMA FIELDS (VERIFIED):
 * 
 * Conversation:
 * - id, userId, title, messageCount, lastMessagePreview
 * - createdAt, updatedAt
 * 
 * Message:
 * - id, conversationId, userId, role, content, emotion
 * - createdAt
 */

import { prisma } from '@/lib/db';

// ================== TYPE DEFINITIONS ==================

export interface ConversationData {
  id: string;
  userId: string;
  title?: string;
  messageCount: number;
  lastMessagePreview?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageData {
  id: string;
  conversationId: string;
  userId: string;
  role: string;
  content: string;
  emotion?: string;
  createdAt: Date;
}

export interface ConversationWithMessages {
  conversation: ConversationData;
  messages: MessageData[];
}

export interface ConversationContext {
  conversationId: string;
  messages: MessageData[];
  summary: {
    totalMessages: number;
    userMessageCount: number;
    assistantMessageCount: number;
    lastInteraction: Date;
  };
}

// ================== CONVERSATION MANAGER ==================

/**
 * Create new conversation
 */
export async function createConversation(
  userId: string,
  title?: string
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  try {
    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title: title || null,
        messageCount: 0,
        lastMessagePreview: null
      }
    });

    return {
      success: true,
      conversationId: conversation.id
    };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Add message to conversation
 */
export async function addMessage(
  conversationId: string,
  userId: string,
  role: string,
  content: string,
  emotion?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        userId,
        role,
        content,
        emotion: emotion || null
      }
    });

    // Update conversation
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        messageCount: { increment: 1 },
        lastMessagePreview: content.substring(0, 100),
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      messageId: message.id
    };
  } catch (error) {
    console.error('Error adding message:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get conversation with optional messages
 */
export async function getConversation(
  conversationId: string,
  includeMessages: boolean = false
): Promise<ConversationWithMessages | null> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: includeMessages ? {
          orderBy: { createdAt: 'asc' }
        } : false
      }
    });

    if (!conversation) return null;

    const messages = includeMessages && conversation.messages 
      ? conversation.messages.map(m => ({
          id: m.id,
          conversationId: m.conversationId,
          userId: m.userId,
          role: m.role,
          content: m.content,
          emotion: m.emotion || undefined,
          createdAt: m.createdAt
        }))
      : [];

    return {
      conversation: {
        id: conversation.id,
        userId: conversation.userId,
        title: conversation.title || undefined,
        messageCount: conversation.messageCount,
        lastMessagePreview: conversation.lastMessagePreview || undefined,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      },
      messages
    };
  } catch (error) {
    console.error('Error getting conversation:', error);
    return null;
  }
}

/**
 * List user conversations
 */
export async function listConversations(
  userId: string,
  limit: number = 50
): Promise<ConversationData[]> {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: limit
    });

    return conversations.map(c => ({
      id: c.id,
      userId: c.userId,
      title: c.title || undefined,
      messageCount: c.messageCount,
      lastMessagePreview: c.lastMessagePreview || undefined,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt
    }));
  } catch (error) {
    console.error('Error listing conversations:', error);
    return [];
  }
}

/**
 * Delete conversation
 */
export async function deleteConversation(
  conversationId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.conversation.delete({
      where: { id: conversationId }
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting conversation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get conversation context with recent messages
 */
export async function getConversationContext(
  conversationId: string,
  messageLimit: number = 10
): Promise<ConversationContext | null> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: messageLimit
        }
      }
    });

    if (!conversation) return null;

    const messages = conversation.messages.reverse().map(m => ({
      id: m.id,
      conversationId: m.conversationId,
      userId: m.userId,
      role: m.role,
      content: m.content,
      emotion: m.emotion || undefined,
      createdAt: m.createdAt
    }));

    const userMessageCount = messages.filter(m => m.role === 'user').length;
    const assistantMessageCount = messages.filter(m => m.role === 'assistant').length;

    return {
      conversationId: conversation.id,
      messages,
      summary: {
        totalMessages: conversation.messageCount,
        userMessageCount,
        assistantMessageCount,
        lastInteraction: conversation.updatedAt
      }
    };
  } catch (error) {
    console.error('Error getting conversation context:', error);
    return null;
  }
}
