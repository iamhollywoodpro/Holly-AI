'use client';

/**
 * FeaturePageShell — Shared wrapper for all HOLLY feature pages
 *
 * Provides:
 *  • A consistent top navigation bar with HOLLY branding + "Back to Chat"
 *  • The page title, icon and description
 *  • A dark, full-screen layout matching the chat UI aesthetic
 *
 * Usage:
 *   <FeaturePageShell title="Evolution" icon={<TrendingUp />} description="...">
 *     {children}
 *   </FeaturePageShell>
 */

import Link from 'next/link';
import { ReactNode } from 'react';
import { ArrowLeft, MessageSquare } from 'lucide-react';

interface FeaturePageShellProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  children: ReactNode;
  /** Additional action buttons shown in the top-right of the header */
  actions?: ReactNode;
}

export default function FeaturePageShell({
  title,
  description,
  icon,
  children,
  actions,
}: FeaturePageShellProps) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* ── Top nav bar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-gray-950/90 backdrop-blur-xl border-b border-gray-800/60">
        {/* Left — back to chat */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/chat"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-purple-500/40 transition-all text-gray-400 hover:text-white text-xs font-medium shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Chat</span>
          </Link>

          {/* Page title */}
          <div className="flex items-center gap-2 min-w-0">
            {icon && (
              <div className="w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-400">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white truncate">{title}</h1>
              {description && (
                <p className="text-[10px] text-gray-500 truncate hidden sm:block">{description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right — HOLLY brand + optional actions */}
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <Link
            href="/chat"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 transition-all text-purple-300 hover:text-white text-xs font-medium"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Chat</span>
          </Link>
        </div>
      </header>

      {/* ── Page content ──────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
