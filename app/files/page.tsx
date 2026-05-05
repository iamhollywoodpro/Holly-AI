'use client';

import { useState } from 'react';
import { ArrowLeft, Search, File, Image, Music, Video, FileText, Download, Trash2, Grid, List } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import Link from 'next/link';

interface FileItem {
  id: string;
  name: string;
  type: 'image' | 'audio' | 'video' | 'document' | 'other';
  size: string;
  uploadedAt: string;
  url: string;
  thumbnail?: string;
}

export default function FilesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Mock data
  const files: FileItem[] = [
    {
      id: '1',
      name: 'project-mockup.png',
      type: 'image',
      size: '2.4 MB',
      uploadedAt: '2 hours ago',
      url: '#',
    },
    {
      id: '2',
      name: 'demo-track.mp3',
      type: 'audio',
      size: '5.1 MB',
      uploadedAt: '1 day ago',
      url: '#',
    },
    {
      id: '3',
      name: 'presentation.pdf',
      type: 'document',
      size: '1.8 MB',
      uploadedAt: '3 days ago',
      url: '#',
    },
  ];

  const fileTypes = [
    { id: 'all', label: 'All Files', icon: File, count: files.length },
    { id: 'image', label: 'Images', icon: Image, count: files.filter(f => f.type === 'image').length },
    { id: 'audio', label: 'Audio', icon: Music, count: files.filter(f => f.type === 'audio').length },
    { id: 'video', label: 'Videos', icon: Video, count: files.filter(f => f.type === 'video').length },
    { id: 'document', label: 'Documents', icon: FileText, count: files.filter(f => f.type === 'document').length },
  ];

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || file.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image': return Image;
      case 'audio': return Music;
      case 'video': return Video;
      case 'document': return FileText;
      default: return File;
    }
  };

  return (
    <div 
      className="min-h-screen p-6"
      style={{ backgroundColor: cyberpunkTheme.colors.background.primary }}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition-opacity"
          style={{ color: cyberpunkTheme.colors.text.secondary }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Chat
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 
              className="text-4xl font-bold mb-2"
              style={{
                background: cyberpunkTheme.colors.gradients.holographic,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              📎 File Library
            </h1>
            <p style={{ color: cyberpunkTheme.colors.text.secondary }}>
              Manage all your uploaded files
            </p>
          </div>

          {/* View Toggle */}
          <div 
            className="flex gap-2 p-1 rounded-lg"
            style={{ backgroundColor: cyberpunkTheme.colors.background.secondary }}
          >
            <button
              onClick={() => setViewMode('grid')}
              className="p-2 rounded transition-colors"
              style={{
                backgroundColor: viewMode === 'grid' 
                  ? cyberpunkTheme.colors.background.primary
                  : 'transparent',
                color: viewMode === 'grid'
                  ? cyberpunkTheme.colors.primary.cyan
                  : cyberpunkTheme.colors.text.tertiary,
              }}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded transition-colors"
              style={{
                backgroundColor: viewMode === 'list' 
                  ? cyberpunkTheme.colors.background.primary
                  : 'transparent',
                color: viewMode === 'list'
                  ? cyberpunkTheme.colors.primary.cyan
                  : cyberpunkTheme.colors.text.tertiary,
              }}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div 
          className="flex items-center gap-3 p-4 rounded-xl mb-6"
          style={{
            backgroundColor: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
          }}
        >
          <Search 
            className="w-5 h-5"
            style={{ color: cyberpunkTheme.colors.text.tertiary }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
            className="flex-1 bg-transparent outline-none"
            style={{ color: cyberpunkTheme.colors.text.primary }}
          />
        </div>

        {/* File Type Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          {fileTypes.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                style={{
                  backgroundColor: selectedType === type.id
                    ? cyberpunkTheme.colors.background.secondary
                    : 'transparent',
                  border: `1px solid ${selectedType === type.id
                    ? cyberpunkTheme.colors.primary.cyan
                    : cyberpunkTheme.colors.border.primary}`,
                  color: selectedType === type.id
                    ? cyberpunkTheme.colors.primary.cyan
                    : cyberpunkTheme.colors.text.secondary,
                }}
              >
                <Icon className="w-4 h-4" />
                {type.label}
                <span 
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${cyberpunkTheme.colors.primary.cyan}20`,
                  }}
                >
                  {type.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Files Grid/List */}
      <div className="max-w-7xl mx-auto">
        {filteredFiles.length === 0 ? (
          <div 
            className="text-center py-12"
            style={{ color: cyberpunkTheme.colors.text.tertiary }}
          >
            No files found
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map(file => {
              const Icon = getFileIcon(file.type);
              return (
                <div
                  key={file.id}
                  className="p-4 rounded-xl group hover:scale-105 transition-transform"
                  style={{
                    backgroundColor: cyberpunkTheme.colors.background.secondary,
                    border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                  }}
                >
                  <div 
                    className="w-full aspect-square rounded-lg mb-3 flex items-center justify-center"
                    style={{ backgroundColor: cyberpunkTheme.colors.background.primary }}
                  >
                    <Icon 
                      className="w-12 h-12"
                      style={{ color: cyberpunkTheme.colors.primary.cyan }}
                    />
                  </div>
                  <div 
                    className="font-medium mb-1 truncate"
                    style={{ color: cyberpunkTheme.colors.text.primary }}
                  >
                    {file.name}
                  </div>
                  <div 
                    className="text-sm mb-3"
                    style={{ color: cyberpunkTheme.colors.text.tertiary }}
                  >
                    {file.size} • {file.uploadedAt}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="flex-1 p-2 rounded hover:bg-white/10 transition-colors"
                      style={{ color: cyberpunkTheme.colors.text.secondary }}
                      title="Download"
                    >
                      <Download className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      className="flex-1 p-2 rounded hover:bg-white/10 transition-colors"
                      style={{ color: cyberpunkTheme.colors.text.secondary }}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFiles.map(file => {
              const Icon = getFileIcon(file.type);
              return (
                <div
                  key={file.id}
                  className="p-4 rounded-lg flex items-center justify-between group hover:bg-white/5 transition-colors"
                  style={{
                    backgroundColor: cyberpunkTheme.colors.background.secondary,
                    border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                  }}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Icon 
                      className="w-8 h-8"
                      style={{ color: cyberpunkTheme.colors.primary.cyan }}
                    />
                    <div className="flex-1">
                      <div style={{ color: cyberpunkTheme.colors.text.primary }}>
                        {file.name}
                      </div>
                      <div 
                        className="text-sm"
                        style={{ color: cyberpunkTheme.colors.text.tertiary }}
                      >
                        {file.size} • {file.uploadedAt}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      className="p-2 rounded hover:bg-white/10 transition-colors"
                      style={{ color: cyberpunkTheme.colors.text.secondary }}
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      className="p-2 rounded hover:bg-white/10 transition-colors"
                      style={{ color: cyberpunkTheme.colors.text.secondary }}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
