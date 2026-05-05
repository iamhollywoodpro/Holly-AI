'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Search, X, MessageSquare, Clock } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import { getConversations } from '@/lib/conversation-manager';
import { formatDistanceToNow } from 'date-fns';
import type { Conversation } from '@/types/conversation';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SearchResult {
  conversation: Conversation;
  matchedContent?: string;
  relevance: number;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConversations();
    }
  }, [isOpen]);

  useEffect(() => {
    if (query.trim()) {
      searchConversations(query);
    } else {
      setResults([]);
    }
  }, [query, conversations]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const convs = await getConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchConversations = (searchQuery: string) => {
    const lowerQuery = searchQuery.toLowerCase();
    const searchResults: SearchResult[] = [];

    conversations.forEach(conv => {
      let relevance = 0;
      let matchedContent = '';

      // Search in title
      if (conv.title?.toLowerCase().includes(lowerQuery)) {
        relevance += 10;
        matchedContent = conv.title;
      }

      // Search in last message preview
      if (conv.lastMessagePreview?.toLowerCase().includes(lowerQuery)) {
        relevance += 5;
        if (!matchedContent) {
          matchedContent = conv.lastMessagePreview;
        }
      }

      if (relevance > 0) {
        searchResults.push({
          conversation: conv,
          matchedContent,
          relevance,
        });
      }
    });

    // Sort by relevance
    searchResults.sort((a, b) => b.relevance - a.relevance);
    setResults(searchResults);
  };

  const handleSelectConversation = (conversationId: string) => {
    window.location.href = `/?conversation=${conversationId}`;
    onClose();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === query.toLowerCase() ? (
        <mark 
          key={index}
          style={{
            background: `${cyberpunkTheme.colors.primary.cyan}40`,
            color: cyberpunkTheme.colors.primary.cyan,
          }}
        >
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-start justify-center p-4 pt-[10vh]">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel 
                className="w-full max-w-2xl transform overflow-hidden rounded-2xl text-left align-middle shadow-xl transition-all"
                style={{
                  backgroundColor: cyberpunkTheme.colors.background.secondary,
                  border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                }}
              >
                {/* Search Input */}
                <div 
                  className="flex items-center gap-3 p-4 border-b"
                  style={{ borderColor: cyberpunkTheme.colors.border.primary }}
                >
                  <Search 
                    className="w-5 h-5 flex-shrink-0"
                    style={{ color: cyberpunkTheme.colors.primary.cyan }}
                  />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search all conversations..."
                    className="flex-1 bg-transparent outline-none text-lg"
                    style={{ color: cyberpunkTheme.colors.text.primary }}
                    autoFocus
                  />
                  <button
                    onClick={onClose}
                    className="p-1 rounded hover:bg-white/5 transition-colors"
                    style={{ color: cyberpunkTheme.colors.text.tertiary }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Results */}
                <div className="max-h-[60vh] overflow-y-auto">
                  {loading ? (
                    <div 
                      className="p-8 text-center"
                      style={{ color: cyberpunkTheme.colors.text.tertiary }}
                    >
                      Loading conversations...
                    </div>
                  ) : results.length > 0 ? (
                    <div className="p-2">
                      {results.map((result) => (
                        <button
                          key={result.conversation.id}
                          onClick={() => handleSelectConversation(result.conversation.id)}
                          className="w-full p-4 rounded-lg hover:bg-white/5 transition-colors text-left"
                        >
                          <div className="flex items-start gap-3">
                            <MessageSquare 
                              className="w-5 h-5 flex-shrink-0 mt-0.5"
                              style={{ color: cyberpunkTheme.colors.primary.cyan }}
                            />
                            <div className="flex-1 min-w-0">
                              <div 
                                className="font-medium mb-1 truncate"
                                style={{ color: cyberpunkTheme.colors.text.primary }}
                              >
                                {result.matchedContent 
                                  ? highlightMatch(result.conversation.title || 'Untitled', query)
                                  : result.conversation.title || 'Untitled'
                                }
                              </div>
                              {result.matchedContent && (
                                <div 
                                  className="text-sm mb-2 truncate"
                                  style={{ color: cyberpunkTheme.colors.text.secondary }}
                                >
                                  {highlightMatch(result.matchedContent, query)}
                                </div>
                              )}
                              <div 
                                className="flex items-center gap-2 text-xs"
                                style={{ color: cyberpunkTheme.colors.text.tertiary }}
                              >
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(result.conversation.updatedAt), { addSuffix: true })}
                                <span>•</span>
                                <span>{result.conversation.messageCount} messages</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : query.trim() ? (
                    <div 
                      className="p-8 text-center"
                      style={{ color: cyberpunkTheme.colors.text.tertiary }}
                    >
                      No conversations found for "{query}"
                    </div>
                  ) : (
                    <div 
                      className="p-8 text-center"
                      style={{ color: cyberpunkTheme.colors.text.tertiary }}
                    >
                      Start typing to search...
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div 
                  className="p-3 border-t text-center text-xs"
                  style={{ 
                    borderColor: cyberpunkTheme.colors.border.primary,
                    color: cyberpunkTheme.colors.text.tertiary,
                  }}
                >
                  Press <kbd className="px-2 py-1 mx-1 font-mono rounded" style={{
                    backgroundColor: cyberpunkTheme.colors.background.primary,
                    border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                  }}>Ctrl/Cmd + K</kbd> to search anytime
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
