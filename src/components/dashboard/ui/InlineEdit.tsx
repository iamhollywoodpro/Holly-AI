'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, X, Edit2, Loader2 } from 'lucide-react';

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  placeholder?: string;
  type?: 'text' | 'textarea' | 'number';
  className?: string;
  editClassName?: string;
}

export function InlineEdit({
  value,
  onSave,
  placeholder = 'Click to edit',
  type = 'text',
  className = '',
  editClassName = '',
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'text' || type === 'number') {
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [isEditing, type]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Save failed:', error);
      setEditValue(value); // Revert on error
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && type !== 'textarea') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!isEditing) {
    return (
      <div
        className={`group flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-gray-50 ${className}`}
        onClick={() => setIsEditing(true)}
      >
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>
          {value || placeholder}
        </span>
        <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${editClassName}`}>
      {type === 'textarea' ? (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="flex-1 rounded border border-purple-500 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          rows={3}
        />
      ) : (
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={type}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          className="flex-1 rounded border border-purple-500 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        />
      )}
      <button
        onClick={handleSave}
        disabled={loading}
        className="rounded bg-green-600 p-1 text-white hover:bg-green-700 disabled:opacity-50"
        title="Save"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={handleCancel}
        disabled={loading}
        className="rounded bg-gray-600 p-1 text-white hover:bg-gray-700 disabled:opacity-50"
        title="Cancel"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// Inline Select
interface InlineSelectProps {
  value: string;
  options: Array<{ value: string; label: string }>;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
}

export function InlineSelect({
  value,
  options,
  onSave,
  className = '',
}: InlineSelectProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [loading, setLoading] = useState(false);

  const currentOption = options.find(opt => opt.value === value);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Save failed:', error);
      setEditValue(value);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div
        className={`group flex items-center gap-2 cursor-pointer rounded px-2 py-1 hover:bg-gray-50 ${className}`}
        onClick={() => setIsEditing(true)}
      >
        <span className="text-gray-900">{currentOption?.label || value}</span>
        <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        disabled={loading}
        className="flex-1 rounded border border-purple-500 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        autoFocus
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        onClick={handleSave}
        disabled={loading}
        className="rounded bg-green-600 p-1 text-white hover:bg-green-700 disabled:opacity-50"
        title="Save"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Check className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={handleCancel}
        disabled={loading}
        className="rounded bg-gray-600 p-1 text-white hover:bg-gray-700 disabled:opacity-50"
        title="Cancel"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
