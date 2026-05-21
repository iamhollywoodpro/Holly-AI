/**
 * Conversation Manager
 * Helper functions for managing conversations and messages
 */

import type {
  Conversation,
  Message,
  ConversationCreateRequest,
  ConversationCreateResponse,
  ConversationListResponse,
  MessageListResponse,
} from '@/types/conversation';

/**
 * Create a new conversation
 */
export async function createConversation(
  firstMessage: string
): Promise<Conversation> {
  try {
    console.log('[ConversationManager] Creating new conversation...');
    
    const response = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstMessage,
      } as ConversationCreateRequest),
    });

    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.statusText}`);
    }

    const data: ConversationCreateResponse = await response.json();
    console.log('[ConversationManager] ✅ Conversation created:', data.conversation.id);
    
    return data.conversation;
  } catch (error) {
    console.error('[ConversationManager] ❌ Create conversation error:', error);
    throw error;
  }
}

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
  try {
    console.log('[ConversationManager] Fetching conversations...');
    
    const response = await fetch('/api/conversations', {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch conversations: ${response.statusText}`);
    }

    const data: ConversationListResponse = await response.json();
    console.log('[ConversationManager] ✅ Fetched', data.conversations.length, 'conversations');
    
    return data.conversations;
  } catch (error) {
    console.error('[ConversationManager] ❌ Fetch conversations error:', error);
    throw error;
  }
}

/**
 * Get all messages for a specific conversation
 */
export async function getConversationMessages(
  conversationId: string
): Promise<Message[]> {
  try {
    console.log('[ConversationManager] Fetching messages for conversation:', conversationId);
    
    const response = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch messages: ${response.statusText}`);
    }

    const data: MessageListResponse = await response.json();
    console.log('[ConversationManager] ✅ Fetched', data.messages.length, 'messages');
    
    return data.messages;
  } catch (error) {
    console.error('[ConversationManager] ❌ Fetch messages error:', error);
    throw error;
  }
}

/**
 * Delete a conversation
 */
export async function deleteConversation(conversationId: string): Promise<void> {
  try {
    console.log('[ConversationManager] Deleting conversation:', conversationId);
    
    const response = await fetch(`/api/conversations?id=${conversationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete conversation: ${response.statusText}`);
    }

    console.log('[ConversationManager] ✅ Conversation deleted');
  } catch (error) {
    console.error('[ConversationManager] ❌ Delete conversation error:', error);
    throw error;
  }
}

/**
 * Generate a conversation title from the first message
 */
export function generateConversationTitle(message: string): string {
  // Clean the message
  let cleaned = message.trim();
  
  // Remove markdown
  cleaned = cleaned.replace(/[*_`#]/g, '');
  
  // Take first 50 characters
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 47) + '...';
  }
  
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  return cleaned || 'New Conversation';
}

/**
 * Pin a conversation
 */
export async function pinConversation(conversationId: string): Promise<void> {
  try {
    console.log('[ConversationManager] Pinning conversation:', conversationId);
    
    const response = await fetch(`/api/conversations/${conversationId}/pin`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to pin conversation: ${response.statusText}`);
    }

    console.log('[ConversationManager] ✅ Conversation pinned');
  } catch (error) {
    console.error('[ConversationManager] ❌ Pin conversation error:', error);
    throw error;
  }
}

/**
 * Unpin a conversation
 */
export async function unpinConversation(conversationId: string): Promise<void> {
  try {
    console.log('[ConversationManager] Unpinning conversation:', conversationId);
    
    const response = await fetch(`/api/conversations/${conversationId}/unpin`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to unpin conversation: ${response.statusText}`);
    }

    console.log('[ConversationManager] ✅ Conversation unpinned');
  } catch (error) {
    console.error('[ConversationManager] ❌ Unpin conversation error:', error);
    throw error;
  }
}
