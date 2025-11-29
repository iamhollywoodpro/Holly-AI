'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  Search,
  Pin,
  Tag,
  Download,
  ChevronDown,
  MoreVertical,
  Archive
} from 'lucide-react';
import { useUser } from '@clerk/nextjs';
import { Menu } from '@headlessui/react';

interface Conversation {
  id: string;
  title: string;
  createdAt: string; // Match API camelCase
  updatedAt: string; // Match API camelCase
  messageCount: number; // Match API camelCase
  lastMessagePreview: string; // Match API camelCase
  isPinned?: boolean;
  colorTag?: string;
  thumbnail?: string;
}

interface ChatHistoryRevampedProps {
  currentConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}

type SortOption = 'date' | 'name' | 'messages';

const COLOR_TAGS = [
  { name: 'Red', color: 'bg-red-500', border: 'border-red-500' },
  { name: 'Orange', color: 'bg-orange-500', border: 'border-orange-500' },
  { name: 'Yellow', color: 'bg-yellow-500', border: 'border-yellow-500' },
  { name: 'Green', color: 'bg-green-500', border: 'border-green-500' },
  { name: 'Blue', color: 'bg-blue-500', border: 'border-blue-500' },
  { name: 'Purple', color: 'bg-purple-500', border: 'border-purple-500' },
  { name: 'Pink', color: 'bg-pink-500', border: 'border-pink-500' },
];

export default function ChatHistoryRevamped({
  currentConversationId,
  onSelectConversation,
  onNewConversation
}: ChatHistoryRevampedProps) {
  const { isSignedIn, isLoaded } = useUser();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');
  const [selectedConvos, setSelectedConvos] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadConversations();
    } else if (isLoaded && !isSignedIn) {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    const handleTitleUpdate = () => {
      loadConversations();
    };
    
    window.addEventListener('conversation-title-updated', handleTitleUpdate);
    return () => window.removeEventListener('conversation-title-updated', handleTitleUpdate);
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

  const togglePin = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => prev.map(c => 
      c.id === id ? { ...c, isPinned: !c.isPinned } : c
    ));
  };

  const setColorTag = async (id: string, color: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => prev.map(c => 
      c.id === id ? { ...c, colorTag: color } : c
    ));
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this conversation?')) return;
    
    try {
      const response = await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' });
      if (response.ok) {
        setConversations(prev => prev.filter(c => c.id !== id));
        if (id === currentConversationId) {
          window.location.href = '/';
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const exportConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement export functionality
    alert('Export feature coming soon!');
  };

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selectedConvos.size} conversations?`)) return;
    
    try {
      await Promise.all(
        Array.from(selectedConvos).map(id =>
          fetch(`/api/conversations?id=${id}`, { method: 'DELETE' })
        )
      );
      setConversations(prev => prev.filter(c => !selectedConvos.has(c.id)));
      setSelectedConvos(new Set());
      setBulkMode(false);
    } catch (error) {
      console.error('Failed to bulk delete:', error);
    }
  };

  const bulkExport = async () => {
    alert('Bulk export feature coming soon!');
  };

  const toggleSelection = (id: string) => {
    setSelectedConvos(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Filter and sort
  const filteredConversations = conversations
    .filter(conv => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        conv.title?.toLowerCase().includes(query) ||
        conv.lastMessagePreview?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      // Pinned always first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      
      // Then by sort option
      switch (sortBy) {
        case 'name':
          return (a.title || '').localeCompare(b.title || '');
        case 'messages':
          return b.messageCount - a.messageCount;
        case 'date':
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

  // Group by date
  const groupedConversations = filteredConversations.reduce((acc, conv) => {
    try {
      const date = new Date(conv.updatedAt);
      if (isNaN(date.getTime())) {
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
      if (!acc['Older']) acc['Older'] = [];
      acc['Older'].push(conv);
      return acc;
    }
  }, {} as Record<string, Conversation[]>);

  const groupOrder = ['Today', 'Yesterday', 'Last 7 Days', 'Last 30 Days', 'Older'];

  return (
    <div className="h-full flex flex-col bg-gray-900/50 backdrop-blur-xl border-r border-gray-800/50">
      {/* Header */}
      <div className="p-4 border-b border-gray-800/50 space-y-3">
        <motion.button
          onClick={onNewConversation}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl flex items-center justify-center gap-2 text-white font-medium transition-all"
        >
          <Plus className="w-5 h-5" />
          New Chat
        </motion.button>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>

        {/* Sort & Bulk Actions */}
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          >
            <option value="date">Sort by Date</option>
            <option value="name">Sort by Name</option>
            <option value="messages">Sort by Messages</option>
          </select>

          <button
            onClick={() => setBulkMode(!bulkMode)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              bulkMode
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800/50 text-gray-400 hover:text-white'
            }`}
          >
            {bulkMode ? 'Done' : 'Select'}
          </button>
        </div>

        {/* Bulk Actions Bar */}
        {bulkMode && selectedConvos.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-2 bg-purple-500/20 rounded-lg border border-purple-500/30"
          >
            <span className="text-xs text-purple-300 flex-1">
              {selectedConvos.size} selected
            </span>
            <button
              onClick={bulkExport}
              className="p-1.5 hover:bg-purple-500/20 rounded text-purple-300 transition-colors"
              title="Export selected"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={bulkDelete}
              className="p-1.5 hover:bg-red-500/20 rounded text-red-400 transition-colors"
              title="Delete selected"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </motion.div>
        )}
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

                {/* Conversations */}
                <div className="space-y-1">
                  <AnimatePresence>
                    {groupConvs.map((conv, index) => (
                      <motion.div
                        key={conv.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => !bulkMode && onSelectConversation(conv.id)}
                        className={`relative group p-3 rounded-lg transition-all cursor-pointer ${
                          conv.id === currentConversationId
                            ? 'bg-purple-600/20 border border-purple-500/50'
                            : 'bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/30 hover:border-gray-600/50'
                        } ${
                          conv.colorTag ? `border-l-4 ${conv.colorTag === 'red' ? 'border-l-red-500' : conv.colorTag === 'blue' ? 'border-l-blue-500' : conv.colorTag === 'green' ? 'border-l-green-500' : conv.colorTag === 'purple' ? 'border-l-purple-500' : conv.colorTag === 'pink' ? 'border-l-pink-500' : conv.colorTag === 'orange' ? 'border-l-orange-500' : 'border-l-yellow-500'}` : ''
                        }`}
                      >
                        {/* Bulk Mode Checkbox */}
                        {bulkMode && (
                          <div className="absolute top-2 left-2">
                            <input
                              type="checkbox"
                              checked={selectedConvos.has(conv.id)}
                              onChange={() => toggleSelection(conv.id)}
                              className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500"
                            />
                          </div>
                        )}

                        <div className={bulkMode ? 'ml-6' : ''}>
                          {/* Title & Pin */}
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className="text-sm font-medium text-white truncate flex-1 flex items-center gap-2">
                              {conv.isPinned && <Pin className="w-3 h-3 text-purple-400 flex-shrink-0" />}
                              {conv.title || 'New Conversation'}
                            </h4>

                            {/* Actions Menu */}
                            {!bulkMode && (
                              <Menu as="div" className="relative flex-shrink-0">
                                <Menu.Button className="p-1 hover:bg-gray-700 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                  <MoreVertical className="w-4 h-4 text-gray-400" />
                                </Menu.Button>
                                <Menu.Items className="absolute right-0 mt-1 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-lg z-10">
                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={(e) => togglePin(conv.id, e)}
                                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${active ? 'bg-gray-800' : ''}`}
                                      >
                                        <Pin className="w-4 h-4" />
                                        {conv.isPinned ? 'Unpin' : 'Pin to Top'}
                                      </button>
                                    )}
                                  </Menu.Item>
                                  
                                  {/* Color Tags Submenu */}
                                  <div className="px-3 py-2 border-t border-gray-800">
                                    <div className="text-xs text-gray-500 mb-2">Color Tag</div>
                                    <div className="flex flex-wrap gap-1">
                                      {COLOR_TAGS.map(tag => (
                                        <button
                                          key={tag.name}
                                          onClick={(e) => setColorTag(conv.id, tag.name.toLowerCase(), e)}
                                          className={`w-6 h-6 rounded ${tag.color} ${conv.colorTag === tag.name.toLowerCase() ? 'ring-2 ring-white' : ''}`}
                                          title={tag.name}
                                        />
                                      ))}
                                    </div>
                                  </div>

                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={(e) => exportConversation(conv.id, e)}
                                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${active ? 'bg-gray-800' : ''}`}
                                      >
                                        <Download className="w-4 h-4" />
                                        Export
                                      </button>
                                    )}
                                  </Menu.Item>

                                  <Menu.Item>
                                    {({ active }) => (
                                      <button
                                        onClick={(e) => deleteConversation(conv.id, e)}
                                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-red-400 ${active ? 'bg-gray-800' : ''}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                      </button>
                                    )}
                                  </Menu.Item>
                                </Menu.Items>
                              </Menu>
                            )}
                          </div>

                          {/* Preview */}
                          <p className="text-xs text-gray-400 truncate mb-2">
                            {conv.lastMessagePreview || 'No messages yet'}
                          </p>

                          {/* Metadata */}
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              <span>{conv.messageCount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{formatTime(conv.updatedAt)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Hover Preview Tooltip */}
                        <div className="absolute left-full ml-2 top-0 w-64 p-3 bg-gray-900 border border-gray-800 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-20 hidden lg:block">
                          <div className="text-xs text-white font-semibold mb-1">{conv.title}</div>
                          <div className="text-xs text-gray-400">{conv.lastMessagePreview}</div>
                          <div className="text-xs text-gray-500 mt-2">{conv.messageCount} messages</div>
                        </div>
                      </motion.div>
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

// Helper function
function formatTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Recently';
    
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
