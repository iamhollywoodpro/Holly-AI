'use client';

import { useState } from 'react';
import { ArrowLeft, FileText, Plus, Star, Sparkles, Code, Music, Palette, Search as SearchIcon } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import Link from 'next/link';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  prompt: string;
  icon: any;
  featured?: boolean;
}

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const templates: Template[] = [
    {
      id: '1',
      name: 'Generate Lo-Fi Beat',
      description: 'Create a chill lo-fi hip-hop instrumental',
      category: 'music',
      prompt: 'Create a chill lo-fi hip-hop beat with jazzy piano, vinyl crackle, and smooth drums. BPM around 85-90.',
      icon: Music,
      featured: true,
    },
    {
      id: '2',
      name: 'Build Landing Page',
      description: 'Generate a modern landing page with React',
      category: 'code',
      prompt: 'Build me a modern landing page using React and Tailwind CSS. Include a hero section, features, pricing, and contact form.',
      icon: Code,
      featured: true,
    },
    {
      id: '3',
      name: 'Design Logo',
      description: 'Create a professional logo concept',
      category: 'design',
      prompt: 'Design a modern, minimalist logo for a tech startup. Use geometric shapes and a futuristic color palette.',
      icon: Palette,
    },
    {
      id: '4',
      name: 'Analyze Track',
      description: 'Get professional A&R feedback on music',
      category: 'music',
      prompt: 'Analyze this track and provide professional A&R feedback including strengths, weaknesses, market potential, and recommendations.',
      icon: Music,
    },
    {
      id: '5',
      name: 'Debug Code',
      description: 'Find and fix bugs in code',
      category: 'code',
      prompt: 'Help me debug this code. Identify the issues, explain what\'s wrong, and provide the corrected version.',
      icon: Code,
    },
    {
      id: '6',
      name: 'UI/UX Review',
      description: 'Get feedback on interface design',
      category: 'design',
      prompt: 'Review this UI/UX design and provide feedback on usability, aesthetics, accessibility, and best practices.',
      icon: Palette,
    },
  ];

  const categories = [
    { id: 'all', label: 'All Templates', count: templates.length },
    { id: 'music', label: 'Music', count: templates.filter(t => t.category === 'music').length },
    { id: 'code', label: 'Code', count: templates.filter(t => t.category === 'code').length },
    { id: 'design', label: 'Design', count: templates.filter(t => t.category === 'design').length },
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = (template: Template) => {
    // Redirect to chat with pre-filled prompt
    const encodedPrompt = encodeURIComponent(template.prompt);
    window.location.href = `/?prompt=${encodedPrompt}`;
  };

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
          📝 Templates
        </h1>
        <p style={{ color: cyberpunkTheme.colors.text.secondary }}>
          Quick-start templates for common tasks
        </p>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Search & Filters */}
        <div className="mb-6">
          {/* Search Bar */}
          <div 
            className="flex items-center gap-3 p-4 rounded-xl mb-4"
            style={{
              backgroundColor: cyberpunkTheme.colors.background.secondary,
              border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
            }}
          >
            <SearchIcon 
              className="w-5 h-5"
              style={{ color: cyberpunkTheme.colors.text.tertiary }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="flex-1 bg-transparent outline-none"
              style={{ color: cyberpunkTheme.colors.text.primary }}
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-3">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                style={{
                  backgroundColor: selectedCategory === category.id
                    ? cyberpunkTheme.colors.background.secondary
                    : 'transparent',
                  border: `1px solid ${selectedCategory === category.id
                    ? cyberpunkTheme.colors.primary.cyan
                    : cyberpunkTheme.colors.border.primary}`,
                  color: selectedCategory === category.id
                    ? cyberpunkTheme.colors.primary.cyan
                    : cyberpunkTheme.colors.text.secondary,
                }}
              >
                {category.label}
                <span 
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${cyberpunkTheme.colors.primary.cyan}20`,
                  }}
                >
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Featured Templates */}
        {selectedCategory === 'all' && !searchQuery && (
          <div className="mb-8">
            <h2 
              className="text-2xl font-bold mb-4 flex items-center gap-2"
              style={{ color: cyberpunkTheme.colors.text.primary }}
            >
              <Star className="w-6 h-6" style={{ color: cyberpunkTheme.colors.primary.cyan }} />
              Featured Templates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.filter(t => t.featured).map(template => {
                const Icon = template.icon;
                return (
                  <div
                    key={template.id}
                    className="p-6 rounded-xl group hover:scale-105 transition-transform"
                    style={{
                      backgroundColor: cyberpunkTheme.colors.background.secondary,
                      border: `2px solid ${cyberpunkTheme.colors.primary.cyan}`,
                      boxShadow: `0 0 20px ${cyberpunkTheme.colors.primary.cyan}20`,
                    }}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div 
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: `${cyberpunkTheme.colors.primary.cyan}20` }}
                      >
                        <Icon 
                          className="w-6 h-6"
                          style={{ color: cyberpunkTheme.colors.primary.cyan }}
                        />
                      </div>
                      <div className="flex-1">
                        <h3 
                          className="text-xl font-bold mb-1"
                          style={{ color: cyberpunkTheme.colors.text.primary }}
                        >
                          {template.name}
                        </h3>
                        <p style={{ color: cyberpunkTheme.colors.text.secondary }}>
                          {template.description}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUseTemplate(template)}
                      className="w-full py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                      style={{
                        background: cyberpunkTheme.colors.gradients.primary,
                        color: '#FFFFFF',
                      }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Use Template
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Templates */}
        <div>
          <h2 
            className="text-2xl font-bold mb-4 flex items-center gap-2"
            style={{ color: cyberpunkTheme.colors.text.primary }}
          >
            <FileText className="w-6 h-6" />
            {selectedCategory === 'all' ? 'All Templates' : `${categories.find(c => c.id === selectedCategory)?.label} Templates`}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map(template => {
              const Icon = template.icon;
              return (
                <div
                  key={template.id}
                  className="p-4 rounded-xl group hover:bg-white/5 transition-colors"
                  style={{
                    backgroundColor: cyberpunkTheme.colors.background.secondary,
                    border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                  }}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Icon 
                      className="w-5 h-5 mt-1"
                      style={{ color: cyberpunkTheme.colors.primary.cyan }}
                    />
                    <div>
                      <h3 
                        className="font-bold mb-1"
                        style={{ color: cyberpunkTheme.colors.text.primary }}
                      >
                        {template.name}
                      </h3>
                      <p 
                        className="text-sm"
                        style={{ color: cyberpunkTheme.colors.text.tertiary }}
                      >
                        {template.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="w-full py-2 rounded-lg hover:bg-white/10 transition-colors text-sm"
                    style={{ color: cyberpunkTheme.colors.primary.cyan }}
                  >
                    Use Template
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Create Custom Template */}
        <div 
          className="mt-8 p-6 rounded-xl text-center"
          style={{
            backgroundColor: cyberpunkTheme.colors.background.secondary,
            border: `1px dashed ${cyberpunkTheme.colors.border.primary}`,
          }}
        >
          <Plus 
            className="w-12 h-12 mx-auto mb-3"
            style={{ color: cyberpunkTheme.colors.text.tertiary }}
          />
          <h3 
            className="text-xl font-bold mb-2"
            style={{ color: cyberpunkTheme.colors.text.primary }}
          >
            Create Custom Template
          </h3>
          <p 
            className="mb-4"
            style={{ color: cyberpunkTheme.colors.text.secondary }}
          >
            Save your own prompts as reusable templates
          </p>
          <button
            className="px-6 py-3 rounded-lg transition-colors"
            style={{
              background: cyberpunkTheme.colors.gradients.primary,
              color: '#FFFFFF',
            }}
          >
            Create Template
          </button>
        </div>
      </div>
    </div>
  );
}
