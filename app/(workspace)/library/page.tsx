'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Folder, Image, Layers, Star, Archive, Plus } from 'lucide-react';

type LibraryTab = 'projects' | 'assets' | 'collections' | 'favorites' | 'archived';

const tabs = [
  { id: 'projects' as LibraryTab, label: 'Projects', icon: Folder },
  { id: 'assets' as LibraryTab, label: 'Assets', icon: Image },
  { id: 'collections' as LibraryTab, label: 'Collections', icon: Layers },
  { id: 'favorites' as LibraryTab, label: 'Favorites', icon: Star },
  { id: 'archived' as LibraryTab, label: 'Archived', icon: Archive },
];

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<LibraryTab>('projects');

  const EmptyState = ({ icon: Icon, title, description, actionLabel }: any) => (
    <div className="flex flex-col items-center justify-center py-20">
      <Icon className="w-16 h-16 text-gray-600 mb-4" />
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-center max-w-md mb-6">{description}</p>
      <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors">
        <Plus className="w-4 h-4" />
        {actionLabel}
      </button>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'projects':
        return (
          <EmptyState
            icon={Folder}
            title="No projects yet"
            description="Projects help you organize your work. Create your first project to get started."
            actionLabel="Create Project"
          />
        );
      
      case 'assets':
        return (
          <EmptyState
            icon={Image}
            title="No assets yet"
            description="Assets include generated images, videos, and music. Start creating to build your library."
            actionLabel="Generate Asset"
          />
        );
      
      case 'collections':
        return (
          <EmptyState
            icon={Layers}
            title="No collections yet"
            description="Collections help you group related items together. Create your first collection."
            actionLabel="Create Collection"
          />
        );
      
      case 'favorites':
        return (
          <EmptyState
            icon={Star}
            title="No favorites yet"
            description="Star items to add them to your favorites for quick access."
            actionLabel="Browse Library"
          />
        );
      
      case 'archived':
        return (
          <EmptyState
            icon={Archive}
            title="No archived items"
            description="Archive items you want to keep but don't need to see regularly."
            actionLabel="Browse Library"
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold text-white mb-2">Library</h1>
          <p className="text-gray-400">Manage your projects, assets, and collections</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-3 border-b-2 transition-colors
                    ${isActive
                      ? 'border-purple-500 text-white'
                      : 'border-transparent text-gray-400 hover:text-white'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {renderContent()}
      </main>
    </div>
  );
}
