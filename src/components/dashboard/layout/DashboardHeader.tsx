'use client';

import { UserButton } from '@clerk/nextjs';
import { Search } from 'lucide-react';
import { NotificationPanel } from '@/components/dashboard/notifications/NotificationPanel';

export function DashboardHeader() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-white/5 bg-[#141210] px-6">
      {/* Search */}
      <div className="flex flex-1 items-center gap-4">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C564D]" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full rounded-lg border border-[#2D8B5E]/15 bg-[#1E1B18] py-2 pl-10 pr-4 text-sm text-[#F5F0E8] placeholder-[#5C564D] focus:border-[#2D8B5E]/40 focus:outline-none focus:ring-1 focus:ring-[#2D8B5E]/30"
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
