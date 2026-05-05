'use client';

import { useState } from 'react';
import { ArrowLeft, Palette, Layout, Type, Monitor } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import Link from 'next/link';

export default function CustomizePage() {
  const [primaryColor, setPrimaryColor] = useState('#00F0FF');
  const [fontSize, setFontSize] = useState('base');
  const [density, setDensity] = useState('comfortable');
  const [layout, setLayout] = useState('default');

  const colorPresets = [
    { name: 'Cyan', value: '#00F0FF' },
    { name: 'Purple', value: '#B026FF' },
    { name: 'Pink', value: '#FF006E' },
    { name: 'Green', value: '#10B981' },
    { name: 'Blue', value: '#3B82F6' },
    { name: 'Orange', value: '#F59E0B' },
  ];

  const fontSizes = [
    { name: 'Small', value: 'sm' },
    { name: 'Medium', value: 'base' },
    { name: 'Large', value: 'lg' },
    { name: 'Extra Large', value: 'xl' },
  ];

  const densities = [
    { name: 'Compact', value: 'compact', description: 'More content, less spacing' },
    { name: 'Comfortable', value: 'comfortable', description: 'Balanced spacing' },
    { name: 'Spacious', value: 'spacious', description: 'Maximum breathing room' },
  ];

  const layouts = [
    { name: 'Default', value: 'default', description: 'Sidebar + chat' },
    { name: 'Focused', value: 'focused', description: 'Chat only, minimal UI' },
    { name: 'Wide', value: 'wide', description: 'Full width chat area' },
  ];

  return (
    <div 
      className="min-h-screen p-6"
      style={{ backgroundColor: cyberpunkTheme.colors.background.primary }}
    >
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
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
          🎨 Customize HOLLY
        </h1>
        <p style={{ color: cyberpunkTheme.colors.text.secondary }}>
          Personalize your experience with custom themes and preferences
        </p>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Theme Colors */}
        <div 
          className="p-6 rounded-xl"
          style={{
            backgroundColor: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
          }}
        >
          <h2 
            className="text-2xl font-bold mb-4 flex items-center gap-2"
            style={{ color: cyberpunkTheme.colors.text.primary }}
          >
            <Palette className="w-6 h-6" />
            Theme Colors
          </h2>
          <p 
            className="mb-6"
            style={{ color: cyberpunkTheme.colors.text.secondary }}
          >
            Choose your primary accent color
          </p>

          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {colorPresets.map(color => (
              <button
                key={color.value}
                onClick={() => setPrimaryColor(color.value)}
                className="aspect-square rounded-lg transition-all hover:scale-105"
                style={{
                  backgroundColor: color.value,
                  border: primaryColor === color.value 
                    ? `3px solid ${color.value}`
                    : '3px solid transparent',
                  boxShadow: primaryColor === color.value 
                    ? `0 0 20px ${color.value}60`
                    : 'none',
                }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div 
          className="p-6 rounded-xl"
          style={{
            backgroundColor: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
          }}
        >
          <h2 
            className="text-2xl font-bold mb-4 flex items-center gap-2"
            style={{ color: cyberpunkTheme.colors.text.primary }}
          >
            <Type className="w-6 h-6" />
            Font Size
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {fontSizes.map(size => (
              <button
                key={size.value}
                onClick={() => setFontSize(size.value)}
                className="p-4 rounded-lg transition-all"
                style={{
                  backgroundColor: fontSize === size.value 
                    ? cyberpunkTheme.colors.background.primary
                    : 'transparent',
                  border: `1px solid ${fontSize === size.value 
                    ? cyberpunkTheme.colors.primary.cyan
                    : cyberpunkTheme.colors.border.primary}`,
                  color: cyberpunkTheme.colors.text.primary,
                }}
              >
                {size.name}
              </button>
            ))}
          </div>
        </div>

        {/* Density */}
        <div 
          className="p-6 rounded-xl"
          style={{
            backgroundColor: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
          }}
        >
          <h2 
            className="text-2xl font-bold mb-4 flex items-center gap-2"
            style={{ color: cyberpunkTheme.colors.text.primary }}
          >
            <Layout className="w-6 h-6" />
            Density
          </h2>

          <div className="space-y-3">
            {densities.map(d => (
              <button
                key={d.value}
                onClick={() => setDensity(d.value)}
                className="w-full p-4 rounded-lg text-left transition-all"
                style={{
                  backgroundColor: density === d.value 
                    ? cyberpunkTheme.colors.background.primary
                    : 'transparent',
                  border: `1px solid ${density === d.value 
                    ? cyberpunkTheme.colors.primary.cyan
                    : cyberpunkTheme.colors.border.primary}`,
                }}
              >
                <div style={{ color: cyberpunkTheme.colors.text.primary }}>
                  {d.name}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: cyberpunkTheme.colors.text.tertiary }}
                >
                  {d.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Layout */}
        <div 
          className="p-6 rounded-xl"
          style={{
            backgroundColor: cyberpunkTheme.colors.background.secondary,
            border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
          }}
        >
          <h2 
            className="text-2xl font-bold mb-4 flex items-center gap-2"
            style={{ color: cyberpunkTheme.colors.text.primary }}
          >
            <Monitor className="w-6 h-6" />
            Layout
          </h2>

          <div className="space-y-3">
            {layouts.map(l => (
              <button
                key={l.value}
                onClick={() => setLayout(l.value)}
                className="w-full p-4 rounded-lg text-left transition-all"
                style={{
                  backgroundColor: layout === l.value 
                    ? cyberpunkTheme.colors.background.primary
                    : 'transparent',
                  border: `1px solid ${layout === l.value 
                    ? cyberpunkTheme.colors.primary.cyan
                    : cyberpunkTheme.colors.border.primary}`,
                }}
              >
                <div style={{ color: cyberpunkTheme.colors.text.primary }}>
                  {l.name}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: cyberpunkTheme.colors.text.tertiary }}
                >
                  {l.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            className="px-6 py-3 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: cyberpunkTheme.colors.text.secondary }}
          >
            Reset to Default
          </button>
          <button
            className="px-6 py-3 rounded-lg transition-colors"
            style={{
              background: cyberpunkTheme.colors.gradients.primary,
              color: '#FFFFFF',
            }}
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
