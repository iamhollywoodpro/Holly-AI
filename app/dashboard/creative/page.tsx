'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/dashboard/ui/Card';
import { Image, FileText, Folder, Star, Plus } from 'lucide-react';

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
        <button className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">
          <Plus className="h-4 w-4" />
          New Creation
        </button>
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
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Describe your image
            </label>
            <textarea
              placeholder="A futuristic cityscape at sunset..."
              className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              rows={4}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Style
              </label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500">
                <option>Realistic</option>
                <option>Artistic</option>
                <option>Abstract</option>
                <option>Cartoon</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Size
              </label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500">
                <option>1024x1024</option>
                <option>1024x768</option>
                <option>768x1024</option>
              </select>
            </div>
          </div>
          <button className="w-full rounded-lg bg-purple-600 px-4 py-3 font-medium text-white hover:bg-purple-700">
            Generate Image
          </button>
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
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Content topic
            </label>
            <input
              type="text"
              placeholder="AI trends in 2025..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Content type
            </label>
            <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500">
              <option>Blog Post</option>
              <option>Social Media</option>
              <option>Email</option>
              <option>Ad Copy</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Tone
            </label>
            <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500">
              <option>Professional</option>
              <option>Casual</option>
              <option>Friendly</option>
              <option>Persuasive</option>
            </select>
          </div>
          <button className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white hover:bg-blue-700">
            Generate Content
          </button>
        </CardContent>
      </Card>

      {/* Recent Generations */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Recent Generations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-100"
              >
                <div className="flex h-full items-center justify-center text-gray-400">
                  <Image className="h-12 w-12" />
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <button className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-gray-900">
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AssetsTab() {
  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <input
            type="text"
            placeholder="Search assets..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <select className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500">
            <option>All Types</option>
            <option>Images</option>
            <option>Content</option>
            <option>Templates</option>
          </select>
          <button className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
            <Star className="h-4 w-4" />
            Favorites
          </button>
        </CardContent>
      </Card>

      {/* Assets Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Card key={i} className="group cursor-pointer hover:shadow-md">
            <CardContent className="p-0">
              <div className="aspect-square bg-gray-100">
                <div className="flex h-full items-center justify-center text-gray-400">
                  <Image className="h-12 w-12" />
                </div>
              </div>
              <div className="p-3">
                <p className="font-medium text-gray-900">Asset {i}</p>
                <p className="text-xs text-gray-500">Created 2 days ago</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function TemplatesTab() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="cursor-pointer hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-purple-600" />
              Template {i}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              A pre-configured template for quick content generation.
            </p>
            <button className="mt-4 w-full rounded-lg border border-purple-600 px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50">
              Use Template
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
