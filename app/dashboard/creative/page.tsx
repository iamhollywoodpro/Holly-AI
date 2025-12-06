'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/dashboard/ui/Card';
import { Image, FileText, Folder, Star, Plus, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { useAssets, useTemplates, useImageGeneration } from '@/hooks/useCreative';
import * as creativeApi from '@/lib/api/creative';

export default function CreativeDashboardPage() {
  const [activeTab, setActiveTab] = useState<'generate' | 'assets' | 'templates'>('generate');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Creative Studio</h1>
          <p className="mt-2 text-gray-600">
            Generate images, create content, and manage your creative assets.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('generate')}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'generate'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Generate
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'assets'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Assets
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`border-b-2 px-1 py-4 text-sm font-medium ${
              activeTab === 'templates'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            }`}
          >
            Templates
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'generate' && <GenerateTab />}
      {activeTab === 'assets' && <AssetsTab />}
      {activeTab === 'templates' && <TemplatesTab />}
    </div>
  );
}

function GenerateTab() {
  const { generate, loading: generating, error: genError } = useImageGeneration();
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageModel, setImageModel] = useState('dall-e-3');
  const [imageSize, setImageSize] = useState('1024x1024');
  const [contentTopic, setContentTopic] = useState('');
  const [contentType, setContentType] = useState('blog');
  const [contentTone, setContentTone] = useState('professional');
  const [contentLoading, setContentLoading] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [contentResult, setContentResult] = useState<string | null>(null);

  const handleImageGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imagePrompt.trim()) return;
    
    try {
      const [width, height] = imageSize.split('x').map(Number);
      await generate({
        prompt: imagePrompt,
        model: imageModel,
        width,
        height,
      });
    } catch (err) {
      console.error('Image generation failed:', err);
    }
  };

  const handleContentGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentTopic.trim()) return;

    setContentLoading(true);
    setContentError(null);
    try {
      const result = await creativeApi.generateContent({
        topic: contentTopic,
        type: contentType,
        tone: contentTone,
      });
      setContentResult(result.content);
    } catch (err: any) {
      setContentError(err.message);
    } finally {
      setContentLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Image Generation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-purple-600" />
            Image Generation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleImageGeneration} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Describe your image
              </label>
              <textarea
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="A futuristic cityscape at sunset..."
                className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                rows={4}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Model
                </label>
                <select 
                  value={imageModel}
                  onChange={(e) => setImageModel(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="dall-e-3">DALL-E 3</option>
                  <option value="stable-diffusion">Stable Diffusion</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Size
                </label>
                <select 
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="1024x1024">1024x1024</option>
                  <option value="1024x768">1024x768</option>
                  <option value="768x1024">768x1024</option>
                </select>
              </div>
            </div>
            {genError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                {genError}
              </div>
            )}
            <button 
              type="submit"
              disabled={generating || !imagePrompt.trim()}
              className="w-full rounded-lg bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Image'
              )}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Content Creation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Content Creation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleContentGeneration} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Content topic
              </label>
              <input
                type="text"
                value={contentTopic}
                onChange={(e) => setContentTopic(e.target.value)}
                placeholder="AI trends in 2025..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Content type
              </label>
              <select 
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="blog">Blog Post</option>
                <option value="social">Social Media</option>
                <option value="email">Email</option>
                <option value="ad">Ad Copy</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Tone
              </label>
              <select 
                value={contentTone}
                onChange={(e) => setContentTone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="professional">Professional</option>
                <option value="casual">Casual</option>
                <option value="friendly">Friendly</option>
                <option value="persuasive">Persuasive</option>
              </select>
            </div>
            {contentError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                {contentError}
              </div>
            )}
            {contentResult && (
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-gray-700">
                <p className="font-medium mb-2">Generated Content:</p>
                <p className="whitespace-pre-wrap">{contentResult}</p>
              </div>
            )}
            <button 
              type="submit"
              disabled={contentLoading || !contentTopic.trim()}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {contentLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Content'
              )}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AssetsTab() {
  const { assets, loading, error, deleteAsset } = useAssets();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = asset.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || asset.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;
    try {
      await deleteAsset(assetId);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load assets: {error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assets..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <select 
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="content">Content</option>
            <option value="template">Templates</option>
          </select>
        </CardContent>
      </Card>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            {searchQuery || typeFilter !== 'all' ? 'No assets found matching your filters.' : 'No assets yet. Generate something!'}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} className="group cursor-pointer hover:shadow-md">
              <CardContent className="p-0">
                <div className="aspect-square bg-gray-100 relative">
                  {asset.url ? (
                    <img src={asset.url} alt={asset.name || 'Asset'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-400">
                      <Image className="h-12 w-12" />
                    </div>
                  )}
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-3">
                  <p className="font-medium text-gray-900">{asset.name || 'Untitled'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(asset.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function TemplatesTab() {
  const { templates, loading, error } = useTemplates();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to load templates: {error}</span>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="py-12 text-center text-gray-500">
            No templates available yet.
          </CardContent>
        </Card>
      ) : (
        templates.map((template) => (
          <Card key={template.id} className="cursor-pointer hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-purple-600" />
                {template.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {template.description || 'A pre-configured template for quick content generation.'}
              </p>
              <button className="mt-4 w-full rounded-lg border border-purple-600 px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50">
                Use Template
              </button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
