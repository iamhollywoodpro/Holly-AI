'use client';

import { useState } from 'react';
import { Folder, Tag, Archive, Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import Link from 'next/link';

export default function OrganizePage() {
  const [folders, setFolders] = useState([
    { id: '1', name: 'Work', color: '#00F0FF', count: 5 },
    { id: '2', name: 'Personal', color: '#B026FF', count: 3 },
    { id: '3', name: 'Projects', color: '#FF006E', count: 8 },
  ]);

  const [tags, setTags] = useState([
    { id: '1', name: 'important', color: '#00F0FF', count: 12 },
    { id: '2', name: 'music', color: '#B026FF', count: 7 },
    { id: '3', name: 'code', color: '#FF006E', count: 15 },
  ]);

  return (
    <div 
      className="min-h-screen p-6"
      style={{ backgroundColor: cyberpunkTheme.colors.background.primary }}
    >
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
          style={{ color: cyberpunkTheme.colors.text.secondary }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </Link>

        <h1 
          className="text-4xl font-bold mb-2"
          style={{
            background: cyberpunkTheme.colors.gradients.holographic,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          📁 Organize Conversations
        </h1>
        <p style={{ color: cyberpunkTheme.colors.text.secondary }}>
          Manage folders, tags, and archived conversations
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Folders Section */}
        <div 
          className="p-6 rounded-xl"
          style={{
            backgroundColor: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 
              className="text-2xl font-bold flex items-center gap-2"
              style={{ color: cyberpunkTheme.colors.text.primary }}
            >
              <Folder className="w-6 h-6" />
              Folders
            </h2>
            <button
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: cyberpunkTheme.colors.primary.cyan }}
              title="New folder"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-3">
            {folders.map(folder => (
              <div
                key={folder.id}
                className="p-4 rounded-lg flex items-center justify-between group hover:bg-white/5 transition-colors"
                style={{ backgroundColor: cyberpunkTheme.colors.background.primary }}
              >
                <div className="flex items-center gap-3">
                  <Folder 
                    className="w-5 h-5"
                    style={{ color: folder.color }}
                  />
                  <div>
                    <div style={{ color: cyberpunkTheme.colors.text.primary }}>
                      {folder.name}
                    </div>
                    <div 
                      className="text-sm"
                      style={{ color: cyberpunkTheme.colors.text.tertiary }}
                    >
                      {folder.count} conversations
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-2 rounded hover:bg-white/10"
                    style={{ color: cyberpunkTheme.colors.text.tertiary }}
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 rounded hover:bg-white/10"
                    style={{ color: cyberpunkTheme.colors.text.tertiary }}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tags Section */}
        <div 
          className="p-6 rounded-xl"
          style={{
            backgroundColor: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 
              className="text-2xl font-bold flex items-center gap-2"
              style={{ color: cyberpunkTheme.colors.text.primary }}
            >
              <Tag className="w-6 h-6" />
              Tags
            </h2>
            <button
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: cyberpunkTheme.colors.primary.cyan }}
              title="New tag"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <button
                key={tag.id}
                className="px-4 py-2 rounded-full flex items-center gap-2 hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: `${tag.color}20`,
                  border: `1px solid ${tag.color}`,
                  color: tag.color,
                }}
              >
                <Tag className="w-4 h-4" />
                {tag.name}
                <span 
                  className="text-xs"
                  style={{ opacity: 0.7 }}
                >
                  ({tag.count})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Archive Section */}
        <div 
          className="p-6 rounded-xl lg:col-span-2"
          style={{
            backgroundColor: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
          }}
        >
          <h2 
            className="text-2xl font-bold flex items-center gap-2 mb-4"
            style={{ color: cyberpunkTheme.colors.text.primary }}
          >
            <Archive className="w-6 h-6" />
            Archived Conversations
          </h2>
          <p style={{ color: cyberpunkTheme.colors.text.tertiary }}>
            No archived conversations yet
          </p>
        </div>
      </div>
    </div>
  );
}
