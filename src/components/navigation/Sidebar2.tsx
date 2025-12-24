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
  HelpCircle,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { useSidebar } from '@/hooks/use-sidebar';
import { NewTaskMenu } from './NewTaskMenu';
import { LibrarySection } from './LibrarySection';

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
              ? 'text-white bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-800'
          }
        `}
        title={isCollapsed ? label : undefined}
      >
        <Icon className={`w-5 h-5 ${active ? 'text-purple-400' : ''}`} />
        {!isCollapsed && <span>{label}</span>}
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                HOLLY
              </h1>
              <p className="text-xs text-gray-400">AI Partner</p>
            </div>
          </div>
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
      <nav className="flex-1 p-3 space-y-2 overflow-y-auto">
        {/* New Task */}
        <NewTaskMenu isCollapsed={isCollapsed} />

        {/* Search */}
        <button
          className={`
            w-full flex items-center gap-3 px-3 py-2 rounded-lg
            text-gray-400 hover:text-white hover:bg-gray-800
            transition-all duration-200
            ${isCollapsed ? 'justify-center' : ''}
          `}
          title={isCollapsed ? 'Search' : undefined}
        >
          <Search className="w-5 h-5" />
          {!isCollapsed && <span className="text-sm">Search</span>}
        </button>

        {/* Library */}
        <LibrarySection isCollapsed={isCollapsed} />

        {/* All Chats - Collapsible with conversation list */}
        {!isCollapsed && (
          <div className="space-y-1">
            <button
              onClick={() => setShowAllChats(!showAllChats)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="w-5 h-5" />
                <span className="text-sm">All Chats</span>
              </div>
              {showAllChats ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {showAllChats && (
              <div className="ml-4 space-y-1 max-h-64 overflow-y-auto">
                {/* New Conversation Button */}
                <button
                  onClick={() => {
                    onNewConversation?.();
                    if (isMobileOpen) closeAll();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Chat</span>
                </button>
                
                {/* Conversation List */}
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      onSelectConversation?.(conv.id);
                      if (isMobileOpen) closeAll();
                    }}
                    className={`
                      w-full flex items-start gap-2 px-3 py-2 rounded-lg text-sm
                      transition-all duration-200 text-left
                      ${
                        conv.id === currentConversationId
                          ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-white'
                          : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }
                    `}
                  >
                    <MessageSquare className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      conv.id === currentConversationId ? 'text-purple-400' : ''
                    }`} />
                    <span className="truncate">
                      {conv.title || `Chat ${new Date(conv.createdAt).toLocaleDateString()}`}
                    </span>
                  </button>
                ))}
                
                {conversations.length === 0 && (
                  <p className="px-3 py-2 text-xs text-gray-500">No conversations yet</p>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Collapsed: Just show icon */}
        {isCollapsed && (
          <Link
            href="/"
            className="flex items-center justify-center px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all duration-200"
            title="All Chats"
          >
            <MessageSquare className="w-5 h-5" />
          </Link>
        )}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-gray-800 space-y-1">
        <NavLink href="/settings" icon={Settings} label="Settings" />
        <NavLink href="/autonomy" icon={Activity} label="Autonomy" />
        <NavLink href="/help" icon={HelpCircle} label="Help & Docs" />
        
        {/* User Button (not collapsed) */}
        {!isCollapsed && (
          <div className="pt-2">
            <UserButton afterSignOutUrl="/" />
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden md:flex flex-col fixed left-0 top-0 h-screen
          bg-gray-900 border-r border-gray-800
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
          <aside className="md:hidden fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 z-50 flex flex-col">
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
