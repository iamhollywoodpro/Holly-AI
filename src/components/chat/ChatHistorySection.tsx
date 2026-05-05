'use client';

import { useState } from 'react';
import { MessageSquare, Trash2, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

interface ChatHistorySectionProps {
  conversations: Conversation[];
  currentConversationId?: string;
  isCollapsed?: boolean;
  onSelectConversation?: (id: string) => void;
  onNewConversation?: () => void;
  onDeleteConversation?: (id: string) => void;
  onRefresh?: () => void;
}

export function ChatHistorySection({
  conversations,
  currentConversationId,
  isCollapsed = false,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onRefresh
}: ChatHistorySectionProps) {
  const [showAllChats, setShowAllChats] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Group conversations by date
  const groupedConversations = groupByDate(conversations);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDeleteConversation?.(id);
        onRefresh?.();
      } else {
        alert('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete conversation');
    } finally {
      setDeletingId(null);
    }
  };

  if (isCollapsed) {
    return (
      <button
        onClick={() => onNewConversation?.()}
        className="flex items-center justify-center px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
        title="All Chats"
      >
        <MessageSquare className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <button
        onClick={() => setShowAllChats(!showAllChats)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
      >
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm font-medium">All Chats</span>
          <span className="text-xs text-gray-500">({conversations.length})</span>
        </div>
        {showAllChats ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      
      {showAllChats && (
        <div className="ml-2 space-y-3 max-h-96 overflow-y-auto">
          {/* New Chat Button */}
          <button
            onClick={onNewConversation}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
          
          {/* Grouped Conversations */}
          {Object.entries(groupedConversations).map(([group, convs]) => (
            <div key={group} className="space-y-1">
              <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">
                {group}
              </div>
              {convs.map((conv) => (
                <div
                  key={conv.id}
                  className={`
                    group relative flex items-start gap-2 px-3 py-2 rounded-lg text-sm
                    transition-all duration-200
                    ${
                      conv.id === currentConversationId
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }
                  `}
                >
                  <button
                    onClick={() => onSelectConversation?.(conv.id)}
                    className="flex-1 flex items-start gap-2 text-left min-w-0"
                  >
                    <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      conv.id === currentConversationId ? 'text-purple-400' : ''
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">
                        {conv.title || `Chat ${new Date(conv.createdAt).toLocaleDateString()}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                        {conv.messageCount && ` · ${conv.messageCount} messages`}
                      </div>
                    </div>
                  </button>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    disabled={deletingId === conv.id}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-all"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ))}
          
          {conversations.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-500">No conversations yet</p>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to group conversations by date
function groupByDate(conversations: Conversation[]): Record<string, Conversation[]> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today);
  lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);

  const groups: Record<string, Conversation[]> = {
    'Today': [],
    'Yesterday': [],
    'Last 7 Days': [],
    'Last 30 Days': [],
    'Older': []
  };

  conversations.forEach(conv => {
    const date = new Date(conv.updatedAt);
    
    if (date >= today) {
      groups['Today'].push(conv);
    } else if (date >= yesterday) {
      groups['Yesterday'].push(conv);
    } else if (date >= lastWeek) {
      groups['Last 7 Days'].push(conv);
    } else if (date >= lastMonth) {
      groups['Last 30 Days'].push(conv);
    } else {
      groups['Older'].push(conv);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });

  return groups;
}
