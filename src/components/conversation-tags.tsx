// HOLLY Phase 2D: Tag Management Component
// Color-coded tags with add/remove/filter functionality

'use client';

import { useState } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';

export interface ConversationTag {
  id: string;
  name: string;
  color: string;
}

interface ConversationTagsProps {
  conversationId: string;
  tags: ConversationTag[];
  onTagsChange: (tags: ConversationTag[]) => void;
  availableTags: ConversationTag[];
}

const DEFAULT_TAGS: ConversationTag[] = [
  { id: 'work', name: 'Work', color: '#3b82f6' }, // blue
  { id: 'research', name: 'Research', color: '#8b5cf6' }, // purple
  { id: 'ideas', name: 'Ideas', color: '#f59e0b' }, // amber
  { id: 'bugs', name: 'Bugs', color: '#ef4444' }, // red
  { id: 'personal', name: 'Personal', color: '#10b981' }, // green
];

export function ConversationTags({
  conversationId,
  tags,
  onTagsChange,
  availableTags = DEFAULT_TAGS,
}: ConversationTagsProps) {
  const [showTagMenu, setShowTagMenu] = useState(false);

  const handleAddTag = (tag: ConversationTag) => {
    if (!tags.find(t => t.id === tag.id)) {
      onTagsChange([...tags, tag]);
    }
    setShowTagMenu(false);
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(tags.filter(t => t.id !== tagId));
  };

  const unselectedTags = availableTags.filter(
    at => !tags.find(t => t.id === at.id)
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Existing Tags */}
      {tags.map(tag => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium text-white transition-all hover:opacity-80"
          style={{ backgroundColor: tag.color }}
        >
          {tag.name}
          <button
            onClick={() => handleRemoveTag(tag.id)}
            className="hover:bg-white/20 rounded-full p-0.5 transition-colors"
            aria-label={`Remove ${tag.name} tag`}
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      {/* Add Tag Button */}
      <div className="relative">
        <button
          onClick={() => setShowTagMenu(!showTagMenu)}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Add tag"
        >
          <Plus className="w-3 h-3" />
          Add Tag
        </button>

        {/* Tag Selection Menu */}
        {showTagMenu && unselectedTags.length > 0 && (
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 z-10 min-w-[150px]">
            {unselectedTags.map(tag => (
              <button
                key={tag.id}
                onClick={() => handleAddTag(tag)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Tag Filter Component for Sidebar
interface TagFilterProps {
  selectedTags: string[];
  onTagToggle: (tagId: string) => void;
  availableTags?: ConversationTag[];
}

export function TagFilter({
  selectedTags,
  onTagToggle,
  availableTags = DEFAULT_TAGS,
}: TagFilterProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
      <TagIcon className="w-4 h-4 text-gray-500" />
      <div className="flex gap-1 flex-wrap flex-1">
        {availableTags.map(tag => {
          const isSelected = selectedTags.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => onTagToggle(tag.id)}
              className={`px-2 py-1 rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }`}
              style={
                isSelected
                  ? { backgroundColor: tag.color }
                  : undefined
              }
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { DEFAULT_TAGS };
