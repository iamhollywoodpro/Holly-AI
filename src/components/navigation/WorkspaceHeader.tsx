'use client';

import { Search, Bell, Settings } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { useState } from 'react';

export function WorkspaceHeader() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="h-16 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-2xl">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300 transition-all group"
        >
          <Search className="w-4 h-4" />
          <span className="text-sm">Search projects, assets, chats...</span>
          <kbd className="ml-auto px-2 py-1 text-xs bg-gray-700/50 rounded border border-gray-600 group-hover:border-gray-500">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full" />
        </button>

        {/* Settings */}
        <button
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>

        {/* User */}
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'w-8 h-8 rounded-lg',
            },
          }}
        />
      </div>
    </header>
  );
}
