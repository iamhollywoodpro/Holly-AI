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
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <Image
              src="/assets/logo-icon-small.png"
              alt="HOLLY AI"
              width={40}
              height={40}
              className="rounded-lg"
            />
          </div>
          <div>
            <h2 
              className="font-bold text-base"
              style={{ 
                background: cyberpunkTheme.colors.gradients.holographic,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              HOLLY
            </h2>
            <p 
              className="text-xs"
              style={{ color: cyberpunkTheme.colors.text.tertiary }}
            >
              Self-Evolving Intelligence
            </p>
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
