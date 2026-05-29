'use client';

import { useState } from 'react';
import { Folder, Tag, Archive, Plus, Edit2, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// Holly emerald/copper color palette
const H = {
  bg: { dark: '#0A0908', surface: '#141210', raised: '#1E1B18' },
  text: { primary: '#F5F0E8', secondary: '#8C8476', tertiary: '#5C564D' },
  primary: '#2D8B5E',
  border: '#2A2520',
  holographic: 'linear-gradient(135deg, #C47A4A 0%, #2D8B5E 50%, #D4A853 100%)',
};

export default function OrganizePage() {
  const [folders, setFolders] = useState([
    { id: '1', name: 'Work', color: '#2D8B5E', count: 5 },
    { id: '2', name: 'Personal', color: '#C47A4A', count: 3 },
    { id: '3', name: 'Projects', color: '#D4A853', count: 8 },
  ]);

  const [tags, setTags] = useState([
    { id: '1', name: 'important', color: '#2D8B5E', count: 12 },
    { id: '2', name: 'music', color: '#C47A4A', count: 7 },
    { id: '3', name: 'code', color: '#D4A853', count: 15 },
  ]);

  return (
    <div 
      className="min-h-screen p-6"
      style={{ backgroundColor: H.bg.dark }}
    >
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
          style={{ color: H.text.secondary }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </Link>

        <h1 
          className="text-4xl font-bold mb-2"
          style={{
            background: H.holographic,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          📁 Organize Conversations
        </h1>
        <p style={{ color: H.text.secondary }}>
          Manage folders, tags, and archived conversations
        </p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Folders Section */}
        <div 
          className="p-6 rounded-xl"
          style={{
            backgroundColor: H.bg.surface,
            border: `1px solid ${H.border}`,
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 
              className="text-2xl font-bold flex items-center gap-2"
              style={{ color: H.text.primary }}
            >
              <Folder className="w-6 h-6" />
              Folders
            </h2>
            <button
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: H.primary }}
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
                style={{ backgroundColor: H.bg.dark }}
              >
                <div className="flex items-center gap-3">
                  <Folder 
                    className="w-5 h-5"
                    style={{ color: folder.color }}
                  />
                  <div>
                    <div style={{ color: H.text.primary }}>
                      {folder.name}
                    </div>
                    <div 
                      className="text-sm"
                      style={{ color: H.text.tertiary }}
                    >
                      {folder.count} conversations
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    className="p-2 rounded hover:bg-white/10"
                    style={{ color: H.text.tertiary }}
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    className="p-2 rounded hover:bg-white/10"
                    style={{ color: H.text.tertiary }}
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
            backgroundColor: H.bg.surface,
            border: `1px solid ${H.border}`,
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 
              className="text-2xl font-bold flex items-center gap-2"
              style={{ color: H.text.primary }}
            >
              <Tag className="w-6 h-6" />
              Tags
            </h2>
            <button
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: H.primary }}
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
            backgroundColor: H.bg.surface,
            border: `1px solid ${H.border}`,
          }}
        >
          <h2 
            className="text-2xl font-bold flex items-center gap-2 mb-4"
            style={{ color: H.text.primary }}
          >
            <Archive className="w-6 h-6" />
            Archived Conversations
          </h2>
          <p style={{ color: H.text.tertiary }}>
            No archived conversations yet
          </p>
        </div>
      </div>
    </div>
  );
}
