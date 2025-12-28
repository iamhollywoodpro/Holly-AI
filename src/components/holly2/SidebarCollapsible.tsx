'use client';

import { forwardRef, useImperativeHandle } from 'react';
import { ChevronLeft } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import { SidebarContent } from './SidebarContent';
import Image from 'next/image';

interface SidebarCollapsibleProps {
  isOpen: boolean;
  onToggle: () => void;
  currentConversationId?: string | null;
}

export const SidebarCollapsible = forwardRef<any, SidebarCollapsibleProps>(
  function SidebarCollapsible({ isOpen, onToggle, currentConversationId }, ref) {

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refreshConversations: () => {
      window.location.reload();
    },
  }));

  if (!isOpen) return null;

  return (
    <aside 
      className="hidden lg:flex w-64 border-r flex-col h-full relative"
      style={{
        backgroundColor: cyberpunkTheme.colors.background.secondary,
        borderColor: cyberpunkTheme.colors.border.primary,
      }}
    >
      {/* Header with Minimize Button */}
      <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: cyberpunkTheme.colors.border.primary }}>
        <div className="flex items-center gap-2 flex-1">
          <div className="relative w-full max-w-[180px]">
            <Image
              src="/assets/holly-logo-full.png"
              alt="HOLLY AI"
              width={180}
              height={60}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>

        {/* Minimize Button */}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: cyberpunkTheme.colors.text.secondary }}
          title="Minimize sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <SidebarContent currentConversationId={currentConversationId} />
      </div>
    </aside>
  );
});
