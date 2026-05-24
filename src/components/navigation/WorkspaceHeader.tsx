'use client';

import { Search, Bell, Settings } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { useState } from 'react';

export function WorkspaceHeader() {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="h-16 border-b border-white/5 bg-[#0B0A08]/40 backdrop-blur-md flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex-1 max-w-2xl">
        <button
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5 text-white/30 hover:border-[#D4A853]/30 hover:text-white/60 hover:bg-white/10 transition-all duration-300 group"
        >
          <Search className="w-4 h-4 text-white/30 group-hover:text-[#D4A853] transition-colors" />
          <span className="text-sm">Search projects, assets, chats...</span>
          <kbd className="ml-auto px-2 py-1 text-xs bg-white/5 rounded-lg border border-white/10 group-hover:border-[#D4A853]/30 transition-colors">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg text-white/40 hover:text-[#D4A853] hover:bg-white/5 transition-all"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#B84052] shadow-[0_0_8px_#B84052] rounded-full" />
        </button>

        {/* Settings */}
        <button
          className="p-2 rounded-lg text-white/40 hover:text-[#D4A853] hover:bg-white/5 transition-all"
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
