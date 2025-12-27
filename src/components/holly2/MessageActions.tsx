'use client';

import { Copy, RefreshCw, Edit2, Check } from 'lucide-react';
import { useState } from 'react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface MessageActionsProps {
  messageId: string;
  content: string;
  role: 'user' | 'assistant';
  onRegenerate?: () => void;
  onEdit?: (newContent: string) => void;
}

export function MessageActions({ 
  messageId, 
  content, 
  role, 
  onRegenerate,
  onEdit 
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleEdit = () => {
    if (isEditing && onEdit) {
      onEdit(editContent);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setEditContent(content);
    setIsEditing(false);
  };

  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Copy Button */}
      <button
        onClick={handleCopy}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        style={{ color: copied ? cyberpunkTheme.colors.primary.cyan : cyberpunkTheme.colors.text.tertiary }}
        title="Copy message"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>

      {/* Regenerate Button (Assistant messages only) */}
      {role === 'assistant' && onRegenerate && (
        <button
          onClick={onRegenerate}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: cyberpunkTheme.colors.text.tertiary }}
          title="Regenerate response"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}

      {/* Edit Button (User messages only) */}
      {role === 'user' && onEdit && (
        <button
          onClick={handleEdit}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          style={{ color: isEditing ? cyberpunkTheme.colors.primary.cyan : cyberpunkTheme.colors.text.tertiary }}
          title="Edit message"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      )}

      {/* Edit Modal/Inline Editor */}
      {isEditing && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          onClick={handleCancelEdit}
        >
          <div 
            className="w-full max-w-2xl p-6 rounded-xl"
            style={{
              backgroundColor: cyberpunkTheme.colors.background.secondary,
              border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 
              className="text-lg font-semibold mb-4"
              style={{ color: cyberpunkTheme.colors.text.primary }}
            >
              Edit Message
            </h3>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full p-3 rounded-lg resize-none"
              style={{
                backgroundColor: cyberpunkTheme.colors.background.primary,
                border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                color: cyberpunkTheme.colors.text.primary,
                minHeight: '150px',
              }}
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
                style={{ color: cyberpunkTheme.colors.text.secondary }}
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  background: cyberpunkTheme.colors.gradients.primary,
                  color: '#FFFFFF',
                }}
              >
                Save & Resend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
