'use client';

import { useState, useEffect } from 'react';
import { Search, X, ChevronUp, ChevronDown } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface InConversationSearchProps {
  messages: Message[];
  onHighlight: (messageId: string, query: string) => void;
  onClose: () => void;
}

export function InConversationSearch({ messages, onHighlight, onClose }: InConversationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      const matchingIds = messages
        .filter(m => m.content.toLowerCase().includes(lowerQuery))
        .map(m => m.id);
      setResults(matchingIds);
      setCurrentIndex(0);
      
      if (matchingIds.length > 0) {
        onHighlight(matchingIds[0], query);
      }
    } else {
      setResults([]);
      setCurrentIndex(0);
    }
  }, [query, messages]);

  const handleNext = () => {
    if (results.length > 0) {
      const newIndex = (currentIndex + 1) % results.length;
      setCurrentIndex(newIndex);
      onHighlight(results[newIndex], query);
    }
  };

  const handlePrevious = () => {
    if (results.length > 0) {
      const newIndex = currentIndex === 0 ? results.length - 1 : currentIndex - 1;
      setCurrentIndex(newIndex);
      onHighlight(results[newIndex], query);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        handlePrevious();
      } else {
        handleNext();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div 
      className="flex items-center gap-2 px-4 py-3 border-b"
      style={{
        backgroundColor: cyberpunkTheme.colors.background.secondary,
        borderColor: cyberpunkTheme.colors.border.primary,
      }}
    >
      {/* Search Icon */}
      <Search 
        className="w-4 h-4 flex-shrink-0"
        style={{ color: cyberpunkTheme.colors.primary.cyan }}
      />

      {/* Search Input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Search in conversation..."
        className="flex-1 bg-transparent outline-none text-sm"
        style={{ color: cyberpunkTheme.colors.text.primary }}
        autoFocus
      />

      {/* Results Counter */}
      {query && (
        <div 
          className="text-xs flex-shrink-0"
          style={{ color: cyberpunkTheme.colors.text.tertiary }}
        >
          {results.length > 0 ? `${currentIndex + 1} / ${results.length}` : 'No results'}
        </div>
      )}

      {/* Navigation Buttons */}
      {results.length > 0 && (
        <>
          <button
            onClick={handlePrevious}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: cyberpunkTheme.colors.text.secondary }}
            title="Previous (Shift + Enter)"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: cyberpunkTheme.colors.text.secondary }}
            title="Next (Enter)"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Close Button */}
      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-white/10 transition-colors"
        style={{ color: cyberpunkTheme.colors.text.tertiary }}
        title="Close (Esc)"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
