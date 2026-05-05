'use client';

import { UserButton } from '@clerk/nextjs';
import { Search } from 'lucide-react';
import { NotificationPanel } from '@/components/dashboard/notifications/NotificationPanel';

export function DashboardHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Search */}
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Real-Time Notifications */}
        <NotificationPanel />

        {/* User Menu */}
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  );
}
