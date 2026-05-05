'use client';

// HOLLY Phase 2D: Enhanced Conversation Sidebar - FIXED VERSION
// Matches chat-interface prop names

import React, { useState } from 'react';
import { PlusCircle, MessageSquare, Trash2, Edit2, Check, X, Search, Pin, PinOff } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  pinned?: boolean;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;  // FIXED: Changed from currentConversationId
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;  // FIXED: Changed from onCreateConversation
  onDeleteConversation: (id: string) => void;
  onTogglePin: (id: string) => void;
  onOpenSearch: () => void;
  onCleanupEmpty?: () => Promise<number>; // Optional cleanup function
  isLoading?: boolean;
}

export function ConversationSidebar({
  conversations,
  currentConversation,  // FIXED
  onSelectConversation,
  onNewConversation,  // FIXED
  onDeleteConversation,
  onTogglePin,
  onOpenSearch,
  onCleanupEmpty,
  isLoading = false,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const currentConversationId = currentConversation?.id || null;  // FIXED: Extract ID

  const handleStartEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveEdit = async () => {
    if (editingId && editTitle.trim()) {
      // FIXED: Call API directly instead of relying on prop
      try {
        await fetch(`/api/conversations/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: editTitle.trim() }),
        });
      } catch (error) {
        console.error('Failed to update title:', error);
      }
      setEditingId(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Separate pinned and unpinned conversations
  const pinnedConversations = conversations.filter(c => c.pinned);
  const unpinnedConversations = conversations.filter(c => !c.pinned);

  const renderConversation = (conv: Conversation) => {
    const isActive = currentConversationId === conv.id;
    const isEditing = editingId === conv.id;

    return (
      <div
        key={conv.id}
        className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
          isActive
            ? 'bg-blue-600 text-white'
            : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100'
        }`}
        onClick={() => !isEditing && onSelectConversation(conv.id)}
      >
        <MessageSquare className="w-4 h-4 flex-shrink-0" />

        {isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') handleCancelEdit();
              }}
              className="flex-1 px-2 py-1 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600 rounded"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveEdit();
              }}
              className="p-1 hover:bg-green-500/20 rounded"
            >
              <Check className="w-4 h-4 text-green-600" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleCancelEdit();
              }}
              className="p-1 hover:bg-red-500/20 rounded"
            >
              <X className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{conv.title}</p>
              <p className={`text-xs ${isActive ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
                {formatDate(conv.updated_at)}
              </p>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(conv.id);
                }}
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                  isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                }`}
                aria-label={conv.pinned ? 'Unpin' : 'Pin'}
              >
                {conv.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartEdit(conv);
                }}
                className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                  isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                }`}
                aria-label="Edit title"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this conversation?')) {
                    onDeleteConversation(conv.id);
                  }
                }}
                className={`p-1 rounded hover:bg-red-500/20 ${
                  isActive ? 'text-white' : 'text-red-600'
                }`}
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={onNewConversation}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
        >
          <PlusCircle className="w-5 h-5" />
          New Conversation
        </button>
      </div>

      {/* Search Trigger */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-800 space-y-2">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>Search conversations...</span>
          <kbd className="ml-auto px-2 py-0.5 text-xs bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded">
            ⌘K
          </kbd>
        </button>
        
        {/* Cleanup Empty Conversations Button */}
        {onCleanupEmpty && (
          <button
            onClick={async () => {
              if (confirm('Delete all empty conversations? This cannot be undone.')) {
                const deleted = await onCleanupEmpty();
                if (deleted > 0) {
                  alert(`Successfully deleted ${deleted} empty conversation${deleted > 1 ? 's' : ''}!`);
                } else {
                  alert('No empty conversations found.');
                }
              }
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
            title="Delete all empty conversations"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clean Up Empty</span>
          </button>
        )}
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Pinned Section */}
        {pinnedConversations.length > 0 && (
          <div>
            <div className="flex items-center gap-2 px-3 mb-2">
              <Pin className="w-3 h-3 text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Pinned
              </h3>
            </div>
            <div className="space-y-1">
              {pinnedConversations.map(renderConversation)}
            </div>
          </div>
        )}

        {/* All Conversations */}
        {unpinnedConversations.length > 0 && (
          <div>
            {pinnedConversations.length > 0 && (
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-3 mb-2">
                All Conversations
              </h3>
            )}
            <div className="space-y-1">
              {unpinnedConversations.map(renderConversation)}
            </div>
          </div>
        )}

        {conversations.length === 0 && !isLoading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Create one to get started!</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          💜 HOLLY Memory System
        </p>
      </div>
    </div>
  );
}
