'use client';

import { useState, useEffect } from 'react';
import { Loader2, Plus } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface LibraryPageProps {
  title: string;
  description: string;
  icon: string;
  emptyMessage: string;
  type: 'projects' | 'assets' | 'collections' | 'favorites' | 'archived';
}

export function LibraryPage({
  title,
  description,
  icon,
  emptyMessage,
  type
}: LibraryPageProps) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  const Icon = getIcon(icon);

  useEffect(() => {
    // TODO: Load items from API
    const loadItems = async () => {
      try {
        // Placeholder - will implement actual API calls later
        setItems([]);
      } catch (error) {
        console.error(`Failed to load ${type}:`, error);
      } finally {
        setLoading(false);
      }
    };
    loadItems();
  }, [type]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              <Icon className="w-8 h-8 text-gray-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-300 mb-2">
              {emptyMessage}
            </h2>
            <p className="text-gray-500 mb-6 max-w-md">
              This section will contain your {type.toLowerCase()}. Start creating to see them here!
            </p>
            <button className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create New
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-colors cursor-pointer"
              >
                <h3 className="text-white font-medium mb-1">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
