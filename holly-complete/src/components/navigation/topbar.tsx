'use client';

import { useState } from 'react';
import { Search, Bell, Settings, User, Sparkles } from 'lucide-react';

export function TopBar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 bg-bg-secondary/80 backdrop-blur-xl border-b border-border-primary z-30">
      <div className="flex items-center justify-between h-full px-6">
        {/* Search */}
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              type="text"
              placeholder="Search conversations, files, or ask HOLLY..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-holly-purple focus:border-transparent transition-all"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-text-tertiary border border-border-primary rounded bg-bg-secondary">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {/* AI Status Indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-holly-purple/10 border border-holly-purple/20">
            <div className="w-2 h-2 rounded-full bg-holly-purple animate-pulse-glow" />
            <span className="text-xs text-holly-purple-400 font-medium">HOLLY Online</span>
          </div>

          {/* Notifications */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="btn-icon relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-holly-purple rounded-full" />
          </button>

          {/* Settings */}
          <button className="btn-icon" aria-label="Settings">
            <Settings className="w-5 h-5" />
          </button>

          {/* User Profile */}
          <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg-tertiary transition-all">
            <div className="w-8 h-8 rounded-full bg-holly-gradient flex items-center justify-center text-sm font-bold">
              SH
            </div>
          </button>
        </div>
      </div>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="absolute top-full right-6 mt-2 w-80 bg-bg-elevated rounded-lg border border-border-primary shadow-xl animate-slide-up">
          <div className="p-4 border-b border-border-primary">
            <h3 className="text-sm font-semibold">Notifications</h3>
          </div>
          <div className="p-2 max-h-96 overflow-y-auto">
            <div className="p-3 rounded-lg hover:bg-bg-tertiary cursor-pointer transition-all">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-holly-purple/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-4 h-4 text-holly-purple" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Music generation complete</p>
                  <p className="text-xs text-text-secondary mt-1">
                    "Summer Vibes" is ready to play
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">2 minutes ago</p>
                </div>
              </div>
            </div>
            
            <div className="p-3 rounded-lg hover:bg-bg-tertiary cursor-pointer transition-all">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">New artist persona created</p>
                  <p className="text-xs text-text-secondary mt-1">
                    "Luna Eclipse" is ready to use
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">1 hour ago</p>
                </div>
              </div>
            </div>
          </div>
          <div className="p-3 border-t border-border-primary text-center">
            <button className="text-sm text-holly-purple hover:text-holly-purple-400 transition-colors">
              View all notifications
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
