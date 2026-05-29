'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Search, 
  MessageSquare, 
  Settings, 
  Activity, 
  Users,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
  TrendingUp,
  Hammer,
  Music,
  Bot,
  Image,
  Code2,
  LogOut,
} from 'lucide-react';
import { UserButton, useClerk } from '@clerk/nextjs';
import { useSidebar } from '@/hooks/use-sidebar';
import { NewTaskMenu } from './NewTaskMenu';
import { ChatHistorySection } from '@/components/chat/ChatHistorySection';
import { LivingLogo } from '@/components/holly/LivingLogo';
import { HollyStateBar } from '@/components/holly/HollyStateBar';
import { useHollyEmotion } from '@/components/holly/HollyEmotionContext';

export function Sidebar2({ 
  currentConversationId,
  onSelectConversation,
  onNewConversation,
}: {
  currentConversationId?: string;
  onSelectConversation?: (id: string) => void;
  onNewConversation?: () => void;
}) {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { isCollapsed, isMobileOpen, toggleCollapse, toggleMobile, closeAll } = useSidebar();
  const [conversations, setConversations] = useState<any[]>([]);
  const [showAllChats, setShowAllChats] = useState(true);

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      try {
        const response = await fetch('/api/conversations');
        if (response.ok) {
          const data = await response.json();
          setConversations(data.conversations || []);
        }
      } catch (error) {
        console.error('Failed to load conversations:', error);
      }
    };
    loadConversations();
  }, [currentConversationId]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

  const NavLink = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => {
    const active = isActive(href);
    
    return (
      <Link
        href={href}
        onClick={() => isMobileOpen && closeAll()}
        className={`
          flex items-center gap-3 px-3 py-2 rounded-lg text-sm
          transition-all duration-200
          ${isCollapsed ? 'justify-center' : ''}
          ${
            active
              ? 'text-white bg-gradient-to-r from-[#2D8B5E]/20 to-[#C47A4A]/20 border border-[#2D8B5E]/35 shadow-[0_0_15px_rgba(45,139,94,0.15)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5 hover:border-white/10 hover:scale-[1.01] transition-all duration-200'
          }
        `}
        title={isCollapsed ? label : undefined}
      >
        <Icon className={`w-5 h-5 ${active ? 'text-[#2D8B5E]' : ''}`} />
        {!isCollapsed && <span>{label}</span>}
      </Link>
    );
  };

  const { emotion, sessionMinutes, confidence } = useHollyEmotion();

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        {!isCollapsed && (
          <div className="flex items-center gap-2.5">
            <LivingLogo emotion={emotion} size={36} showGlow />
            <div>
              <h1 className="text-lg font-black tracking-[0.2em] bg-gradient-to-r from-[#2D8B5E] via-[#F5F0E8] to-[#C47A4A] bg-clip-text text-transparent uppercase">
                HOLLY
              </h1>
              <p className="text-xs text-gray-500">Sovereign Intelligence</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <LivingLogo emotion={emotion} size={32} showGlow />
        )}
        
        {/* Desktop: Collapse button */}
        <button
          onClick={toggleCollapse}
          className="hidden md:block p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Mobile: Close button */}
        <button
          onClick={toggleMobile}
          className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* User button when collapsed */}
        {isCollapsed && (
          <div className="hidden md:block">
            <UserButton afterSignOutUrl="/" />
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {/* New Task */}
        <div className="px-1 mb-3">
          <NewTaskMenu isCollapsed={isCollapsed} />
        </div>

        {/* Core */}
        {!isCollapsed && (
          <p className="px-2 mb-1 text-[10px] font-bold text-[#2D8B5E]/50 uppercase tracking-[0.2em]">Core</p>
        )}
        <div className="space-y-0.5 mb-3">
          <NavLink href="/chat" icon={MessageSquare} label="Chat" />
          <NavLink href="/builder" icon={Hammer} label="AI Builder" />
        </div>

        {/* Create */}
        {!isCollapsed && (
          <p className="px-2 mb-1 text-[10px] font-bold text-[#2D8B5E]/50 uppercase tracking-[0.2em]">Create</p>
        )}
        <div className="space-y-0.5 mb-3">
          <NavLink href="/music-studio" icon={Music} label="Music Studio" />
          <NavLink href="/generate/studio" icon={Image} label="Generation Studio" />
          <NavLink href="/aura-lab" icon={Sparkles} label="AURA" />
        </div>

        {/* Tools */}
        {!isCollapsed && (
          <p className="px-2 mb-1 text-[10px] font-bold text-[#2D8B5E]/50 uppercase tracking-[0.2em]">Tools</p>
        )}
        <div className="space-y-0.5 mb-3">
          <NavLink href="/code-workshop" icon={Code2} label="Code Workshop" />
          <NavLink href="/library" icon={Activity} label="Library" />
        </div>

        {/* Chat History */}
        <ChatHistorySection
          conversations={conversations}
          currentConversationId={currentConversationId}
          isCollapsed={isCollapsed}
          onSelectConversation={(id) => {
            onSelectConversation?.(id);
            if (isMobileOpen) closeAll();
          }}
          onNewConversation={() => {
            onNewConversation?.();
            if (isMobileOpen) closeAll();
          }}
          onRefresh={() => {
            const loadConversations = async () => {
              try {
                const response = await fetch('/api/conversations');
                if (response.ok) {
                  const data = await response.json();
                  setConversations(data.conversations || []);
                }
              } catch (error) {
                console.error('Failed to load conversations:', error);
              }
            };
            loadConversations();
          }}
        />
      </nav>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-white/5 space-y-1">
        <NavLink href="/evolution" icon={TrendingUp} label="Evolution" />
        <NavLink href="/settings" icon={Settings} label="Settings" />
        <NavLink href="/autonomy" icon={Activity} label="Autonomy" />
        <NavLink href="/onboarding" icon={Users} label="Partner Setup" />
        
        {/* Sign Out Button */}
        <button
          onClick={() => signOut({ redirectUrl: '/' })}
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg text-sm w-full
            transition-all duration-200
            ${isCollapsed ? 'justify-center' : ''}
            text-gray-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent
          `}
          title={isCollapsed ? 'Sign Out' : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>
        
        {/* User Button (not collapsed) */}
        {!isCollapsed && (
          <div className="pt-2">
            <UserButton afterSignOutUrl="/" />
          </div>
        )}
      </div>

      {/* Living State Bar */}
      {!isCollapsed && (
        <HollyStateBar
          emotion={emotion}
          sessionMinutes={sessionMinutes}
          confidence={confidence}
        />
      )}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden md:flex flex-col fixed left-0 top-0 h-screen
          sdi-glass border-r border-[#2D8B5E]/15
          transition-all duration-300 z-40
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
            onClick={toggleMobile}
          />

          {/* Sidebar */}
          <aside className="md:hidden fixed left-0 top-0 h-screen w-64 sdi-glass border-r border-[#2D8B5E]/15 z-50 flex flex-col">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobile}
        className="md:hidden fixed top-4 left-4 z-30 p-2 rounded-lg bg-gray-900 border border-gray-800 text-white"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
    </>
  );
}
