'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
  KeyIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { ReactNode, useState } from 'react';
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
  { name: 'API Keys',        href: '/settings/api-keys', icon: KeyIcon },
  { name: 'Account & Billing', href: '/settings/account', icon: UserCircleIcon },
  { name: 'Keyboard Shortcuts', href: '/settings/shortcuts', icon: CommandLineIcon },
];

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname();
  const { isSaving } = useSettings();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Find the current section name for the mobile header
  const currentSection = settingsSections.find(s => s.href === pathname);

  return (
    <div className="min-h-screen bg-[#0A0908] text-[#F5F0E8] font-serif">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#8C8476] hover:text-[#2D8B5E] transition-colors mb-4 sm:mb-6 uppercase text-[10px] font-black tracking-widest"
          >
            <ArrowLeftIcon className="w-3 h-3" />
            Nexus Return
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-4xl font-black bg-gradient-to-r from-[#2D8B5E] via-[#F5F0E8] to-[#C47A4A] bg-clip-text text-transparent uppercase tracking-[0.1em] sm:tracking-[0.2em]">
              Protocols
            </h1>
            {isSaving && (
              <span className="text-[10px] text-[#2D8B5E] uppercase font-black tracking-tighter flex items-center gap-2">
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Syncing...
              </span>
            )}
          </div>
          <p className="text-[#8C8476] text-[10px] sm:text-xs font-medium uppercase tracking-widest mt-1 sm:mt-2">
            Configure the sentient ecosystem parameters
          </p>
        </div>

        {/* Mobile nav toggle — visible only on small screens */}
        <button
          onClick={() => setMobileNavOpen(true)}
          className="lg:hidden flex items-center gap-2 w-full px-4 py-3 mb-4 bg-[#12110F] border border-[#2D8B5E]/20 rounded-xl text-left"
        >
          <Bars3Icon className="w-4 h-4 text-[#2D8B5E]" />
          <span className="text-[11px] font-black text-[#2D8B5E] uppercase tracking-widest">
            {currentSection?.name || 'Navigate'}
          </span>
          <span className="ml-auto text-[9px] text-[#8C8476] uppercase tracking-widest">Tap to navigate</span>
        </button>

        {/* Mobile nav drawer */}
        <AnimatePresence>
          {mobileNavOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileNavOpen(false)}
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "tween", duration: 0.2 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-[#12110F] border-t border-[#2D8B5E]/20 rounded-t-2xl max-h-[70vh] overflow-y-auto lg:hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                  <span className="text-[10px] font-black text-[#2D8B5E] uppercase tracking-widest">Settings Navigation</span>
                  <button onClick={() => setMobileNavOpen(false)} className="p-2 text-[#8C8476] hover:text-[#F5F0E8]">
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
                <nav className="p-2 space-y-0.5">
                  {settingsSections.map((section) => {
                    const isActive = pathname === section.href;
                    return (
                      <Link
                        key={section.href}
                        href={section.href}
                        onClick={() => setMobileNavOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                          isActive
                            ? 'bg-gradient-to-r from-[#2D8B5E]/10 to-[#C47A4A]/10 border border-[#2D8B5E]/30 text-[#2D8B5E]'
                            : 'text-[#8C8476] hover:text-[#F5F0E8] hover:bg-white/5'
                        }`}
                      >
                        <section.icon className={`w-4 h-4 ${isActive ? 'text-[#2D8B5E]' : ''}`} />
                        <span className="text-[11px] font-black uppercase tracking-widest">{section.name}</span>
                      </Link>
                    );
                  })}
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
          {/* Desktop Sidebar Navigation — hidden on mobile */}
          <aside className="hidden lg:block lg:w-64 flex-shrink-0">
            <nav className="space-y-1 sticky top-8">
              {settingsSections.map((section) => {
                const isActive = pathname === section.href;
                return (
                  <Link
                    key={section.href}
                    href={section.href}
                    className={`flex items-center gap-3 px-5 py-3.5 rounded-xl transition-all duration-300 ${
                      isActive
                        ? 'bg-gradient-to-r from-[#2D8B5E]/10 to-[#C47A4A]/10 border border-[#2D8B5E]/30 text-[#2D8B5E] shadow-[0_0_15px_rgba(45,139,94,0.1)]'
                        : 'text-[#8C8476] hover:text-[#F5F0E8] hover:bg-white/5'
                    }`}
                  >
                    <section.icon className={`w-4 h-4 ${isActive ? 'text-[#2D8B5E]' : ''}`} />
                    <span className="text-[11px] font-black uppercase tracking-widest">{section.name}</span>
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
              transition={{ duration: 0.5, ease: [0.19, 1, 0.22, 1] }}
              className="bg-[#12110F] border border-[#2D8B5E]/10 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl"
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
