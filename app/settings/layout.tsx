'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Cog6ToothIcon,
  PaintBrushIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  BellIcon,
  CodeBracketIcon,
  UserCircleIcon,
  CommandLineIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { ReactNode } from 'react';
import { SettingsToast } from '@/components/notifications/SettingsToast';
import { useSettings } from '@/lib/settings/settings-store';

interface SettingsLayoutProps {
  children: ReactNode;
}

const settingsSections = [
  { name: 'Integrations', href: '/settings/integrations', icon: Cog6ToothIcon },
  { name: 'Appearance', href: '/settings/appearance', icon: PaintBrushIcon },
  { name: 'Chat Preferences', href: '/settings/chat', icon: ChatBubbleLeftRightIcon },
  { name: 'AI Behavior', href: '/settings/ai-behavior', icon: CpuChipIcon },
  { name: 'Notifications', href: '/settings/notifications', icon: BellIcon },
  { name: 'Developer Tools', href: '/settings/developer', icon: CodeBracketIcon },
  { name: 'Account & Billing', href: '/account', icon: UserCircleIcon },
  { name: 'Keyboard Shortcuts', href: '/settings/shortcuts', icon: CommandLineIcon },
];

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const { isSaving } = useSettings();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Chat
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              Settings
            </h1>
            {isSaving && (
              <span className="text-sm text-gray-400 flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            )}
          </div>
          <p className="text-gray-400 mt-2">
            Customize HOLLY to match your workflow
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1 sticky top-8">
              {settingsSections.map((section) => {
                const isActive = pathname === section.href;
                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    <section.icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : ''}`} />
                    <span className="text-sm font-medium">{section.name}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-6"
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
      
      {/* Settings Toast Notifications */}
      <SettingsToast />
    </div>
  );
}
