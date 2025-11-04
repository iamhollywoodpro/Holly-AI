'use client';

// HOLLY Phase 2D: Conversation Search Component
// Global search with keyboard shortcuts

import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationSearchProps {
  conversations: Conversation[];
  onSelectConversation: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function ConversationSearch({
  conversations,
  onSelectConversation,
  isOpen,
  onClose,
}: ConversationSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredResults, setFilteredResults] = useState<Conversation[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter conversations as user types
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = conversations.filter((conv) =>
      conv.title.toLowerCase().includes(query)
    );
    setFilteredResults(results);
    setSelectedIndex(0);
  }, [searchQuery, conversations]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredResults.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredResults[selectedIndex]) {
            handleSelect(filteredResults[selectedIndex].id);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredResults, selectedIndex]);

  const handleSelect = (conversationId: string) => {
    onSelectConversation(conversationId);
    setSearchQuery('');
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
      />

      {/* Search Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -20 }}
        className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4"
      >
        <div className="glass-card overflow-hidden">
          {/* Search Input */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none text-lg"
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {searchQuery && filteredResults.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No conversations found</p>
                <p className="text-sm mt-1">Try different keywords</p>
              </div>
            ) : (
              filteredResults.map((conv, index) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelect(conv.id)}
                  className={`w-full text-left p-4 border-b border-white/5 transition-colors ${
                    index === selectedIndex
                      ? 'bg-purple-600/20 border-l-4 border-l-purple-500'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">
                        {conv.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        Updated {formatDate(conv.updated_at)}
                      </p>
                    </div>
                    {index === selectedIndex && (
                      <span className="text-xs text-purple-400 font-medium">
                        ↵ Enter
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {filteredResults.length > 0 && (
            <div className="p-3 bg-white/5 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
              <div className="flex items-center gap-4">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>Esc Close</span>
              </div>
              <span>{filteredResults.length} results</span>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
