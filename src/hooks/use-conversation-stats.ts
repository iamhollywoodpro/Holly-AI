// HOLLY Phase 2D: Conversation Stats Hook
// Fetch and aggregate stats data

import { useState, useEffect, useCallback } from 'react';

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  metadata?: Record<string, any>;
}

interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any>;
}

interface StatsData {
  conversations: Conversation[];
  messages: Message[];
}

export function useConversationStats(userId?: string) {
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all conversations
      const conversationsResponse = await fetch(`/api/conversations?userId=${userId}`);
      if (!conversationsResponse.ok) throw new Error('Failed to fetch conversations');
      const conversationsData = await conversationsResponse.json();
      const conversations = conversationsData.conversations || [];

      // Fetch all messages for all conversations
      const messagesPromises = conversations.map((conv: Conversation) =>
        fetch(`/api/conversations/${conv.id}/messages`)
          .then(res => res.json())
          .then(data => data.messages || [])
      );

      const messagesArrays = await Promise.all(messagesPromises);
      const allMessages = messagesArrays.flat();

      setStatsData({
        conversations,
        messages: allMessages,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatsData(null);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    statsData,
    isLoading,
    error,
    refetchStats: fetchStats,
  };
}
