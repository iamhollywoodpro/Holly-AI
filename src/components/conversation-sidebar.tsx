'use client';

// HOLLY Phase 2B: Conversation Sidebar Component
// Displays conversation history with create/select/delete functionality

import React, { useState } from 'react';
import { PlusCircle, MessageSquare, Trash2, Edit2, Check, X } from 'lucide-react';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  isLoading?: boolean;
}

export function ConversationSidebar({
  conversations,
  currentConversationId,
  onSelectConversation,
  onCreateConversation,
  onDeleteConversation,
  onUpdateTitle,
  isLoading = false,
}: ConversationSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleStartEdit = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim()) {
      onUpdateTitle(editingId, editTitle.trim());
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
    return date.toLocaleDateString();
  };

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <button
          onClick={onCreateConversation}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white px-4 py-3 rounded-lg transition-colors font-medium"
        >
          <PlusCircle size={20} />
          New Conversation
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4 text-center">
            <MessageSquare size={48} className="mb-3 opacity-50" />
            <p className="text-sm">No conversations yet</p>
            <p className="text-xs mt-1">Start a new one to begin!</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative rounded-lg transition-all ${
                  currentConversationId === conv.id
                    ? 'bg-purple-600/20 border border-purple-500/50'
                    : 'hover:bg-gray-800 border border-transparent'
                }`}
              >
                {editingId === conv.id ? (
                  // Edit Mode
                  <div className="p-3 flex items-center gap-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="flex-1 bg-gray-800 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveEdit}
                      className="p-1 hover:bg-green-600/20 rounded text-green-400"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="p-1 hover:bg-red-600/20 rounded text-red-400"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  // View Mode
                  <div
                    onClick={() => onSelectConversation(conv.id)}
                    className="p-3 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-white truncate">
                          {conv.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(conv.updated_at)}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEdit(conv);
                          }}
                          className="p-1 hover:bg-blue-600/20 rounded text-blue-400"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this conversation?')) {
                              onDeleteConversation(conv.id);
                            }
                          }}
                          className="p-1 hover:bg-red-600/20 rounded text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-800 text-xs text-gray-500">
        <p>💜 HOLLY Memory System</p>
        <p className="mt-1">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
}
