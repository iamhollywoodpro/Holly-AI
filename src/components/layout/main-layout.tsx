'use client';

import { ReactNode } from 'react';
import { Sidebar } from '@/components/navigation/sidebar';
import { TopBar } from '@/components/navigation/topbar';

interface MainLayoutProps {
  children: ReactNode;
  showTopBar?: boolean;
  showSidebar?: boolean;
}

export function MainLayout({ 
  children, 
  showTopBar = true, 
  showSidebar = true 
}: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Sidebar */}
      {showSidebar && <Sidebar />}

      {/* Main Content Area */}
      <div className={`${showSidebar ? 'md:pl-64' : ''} min-h-screen`}>
        {/* Top Bar */}
        {showTopBar && <TopBar />}

        {/* Page Content */}
        <main className={`${showTopBar ? 'pt-16' : ''} pb-20 md:pb-0`}>
          {children}
        </main>
      </div>
    </div>
  );
}
