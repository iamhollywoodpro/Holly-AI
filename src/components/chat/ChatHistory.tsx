'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Trash2, Calendar, Clock } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_preview: string;
}

interface ChatHistoryProps {
  currentConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}

export default function ChatHistory({
  currentConversationId,
  onSelectConversation,
  onNewConversation
}: ChatHistoryProps) {
  const { isSignedIn, isLoaded } = useUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Load conversations only when user is authenticated
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadConversations();
    } else if (isLoaded && !isSignedIn) {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  // Listen for title updates and refresh conversation list
  useEffect(() => {
    const handleTitleUpdate = () => {
      console.log('[ChatHistory] Title updated - refreshing list...');
      loadConversations();
    };
    
    window.addEventListener('conversation-title-updated', handleTitleUpdate);
    
    return () => {
      window.removeEventListener('conversation-title-updated', handleTitleUpdate);
    };
  }, [isSignedIn]);

  const loadConversations = async () => {
    if (!isSignedIn) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/conversations');
      const data = await response.json();
      
      if (response.ok) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Don't trigger conversation selection
    
    if (!confirm('Delete this conversation?')) return;
    
    try {
      setDeletingId(id);
      const response = await fetch(`/api/conversations?id=${id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        
        // If deleting current conversation, DON'T auto-create new one
        // Just clear the current conversation - user can create new one manually
        if (id === currentConversationId) {
          // Redirect to home without creating new conversation
          window.location.href = '/';
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    } finally {
      setDeletingId(null);
    }
  };

  // Group conversations by date
  const groupedConversations = conversations.reduce((acc, conv) => {
    try {
      const date = new Date(conv.updated_at);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        // Put invalid dates in "Older" group
        if (!acc['Older']) acc['Older'] = [];
        acc['Older'].push(conv);
        return acc;
      }
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let group = 'Older';
      if (diffDays === 0) group = 'Today';
      else if (diffDays === 1) group = 'Yesterday';
      else if (diffDays <= 7) group = 'Last 7 Days';
      else if (diffDays <= 30) group = 'Last 30 Days';

      if (!acc[group]) acc[group] = [];
      acc[group].push(conv);
      return acc;
    } catch (error) {
      // On error, put in "Older" group
      if (!acc['Older']) acc['Older'] = [];
      acc['Older'].push(conv);
      return acc;
    }
  }, {} as Record<string, Conversation[]>);

  const groupOrder = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Older'];

  return (
    <div className="h-full flex flex-col bg-gray-900/50 backdrop-blur-xl border-r border-gray-800/50">
      {/* Header with New Chat button */}
      <div className="p-4 border-b border-gray-800/50">
        <motion.button
          onClick={onNewConversation}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl flex items-center justify-center gap-2 text-white font-medium transition-all"
        >
          <Plus className="w-5 h-5" />
          New Chat
        </motion.button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start chatting with HOLLY!</p>
          </div>
        ) : (
          groupOrder.map(group => {
            const groupConvs = groupedConversations[group];
            if (!groupConvs || groupConvs.length === 0) return null;

            return (
              <div key={group}>
                {/* Group Header */}
                <div className="flex items-center gap-2 px-2 mb-2">
                  <Calendar className="w-3 h-3 text-gray-500" />
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {group}
                  </h3>
                </div>

                {/* Conversations in this group */}
                <div className="space-y-1">
                  <AnimatePresence>
                    {groupConvs.map((conv, index) => (
                      <motion.button
                        key={conv.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => onSelectConversation(conv.id)}
                        className={`w-full text-left p-3 rounded-lg transition-all group relative ${
                          conv.id === currentConversationId
                            ? 'bg-purple-600/20 border border-purple-500/50'
                            : 'bg-gray-800/30 hover:bg-gray-800/50 border border-transparent'
                        }`}
                      >
                        {/* Conversation Title */}
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-medium text-white truncate flex-1">
                            {conv.title || 'New Conversation'}
                          </h4>
                          
                          {/* Delete button */}
                          <motion.button
                            onClick={(e) => deleteConversation(conv.id, e)}
                            disabled={deletingId === conv.id}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                          >
                            <Trash2 className="w-3 h-3 text-red-400" />
                          </motion.button>
                        </div>

                        {/* Last message preview */}
                        <p className="text-xs text-gray-400 truncate mb-2">
                          {conv.last_message_preview || 'No messages yet'}
                        </p>

                        {/* Metadata */}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{conv.message_count}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatTime(conv.updated_at)}</span>
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Helper function to format time
function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Recently';
    }
    
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  } catch (error) {
    return 'Recently';
  }
}
