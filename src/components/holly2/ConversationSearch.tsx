'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface ConversationSearchProps {
  onSearch: (query: string) => void;
  onClear: () => void;
}

export function ConversationSearch({ onSearch, onClear }: ConversationSearchProps) {
  const [query, setQuery] = useState('');

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onClear();
  };

  return (
    <div className="relative mb-3">
      <div 
        className="flex items-center gap-2 px-3 py-2 rounded-lg border"
        style={{
          backgroundColor: cyberpunkTheme.colors.background.tertiary,
          borderColor: cyberpunkTheme.colors.border.primary,
        }}
      >
        <Search 
          className="w-4 h-4 flex-shrink-0" 
          style={{ color: cyberpunkTheme.colors.text.tertiary }}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search conversations..."
          className="flex-1 bg-transparent outline-none text-sm"
          style={{ color: cyberpunkTheme.colors.text.primary }}
        />
        {query && (
          <button
            onClick={handleClear}
            className="p-1 rounded hover:bg-white/10 transition-colors"
          >
            <X 
              className="w-4 h-4" 
              style={{ color: cyberpunkTheme.colors.text.tertiary }}
            />
          </button>
        )}
      </div>
    </div>
  );
}
