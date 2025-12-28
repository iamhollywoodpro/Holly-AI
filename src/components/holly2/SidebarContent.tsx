'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Library, MessageSquare, Brain, BarChart, Settings, Activity, 
  ChevronRight, Plus, Trash2, Music, Mic2, Code, Pin, User, LogOut, ChevronDown
} from 'lucide-react';
import { useUser, useClerk } from '@clerk/nextjs';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import { formatDistanceToNow } from 'date-fns';
import { getConversations, deleteConversation, pinConversation, unpinConversation } from '@/lib/conversation-manager';
import { ConversationSearch } from './ConversationSearch';
import Image from 'next/image';

interface SidebarContentProps {
  currentConversationId?: string | null;
  onNavigate?: () => void;
}

export function SidebarContent({ currentConversationId, onNavigate }: SidebarContentProps) {
  const pathname = usePathname();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [conversations, setConversations] = useState<any[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<any[]>([]);
  const [showChats, setShowChats] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const convs = await getConversations();
      // Sort: pinned first, then by updatedAt
      const sorted = convs.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      setConversations(sorted);
      setFilteredConversations(sorted);
    } catch (error) {
      console.error('[Sidebar] Failed to load conversations:', error);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredConversations(conversations);
      return;
    }
    
    const filtered = conversations.filter(conv =>
      conv.title?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredConversations(filtered);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setFilteredConversations(conversations);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Delete this conversation?')) return;

    try {
      await deleteConversation(id);
      
      if (id === currentConversationId) {
        window.location.href = '/';
      } else {
        loadConversations();
      }
    } catch (error) {
      console.error('[Sidebar] Delete error:', error);
    }
  };

  const handleTogglePin = async (conv: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      if (conv.pinned) {
        await unpinConversation(conv.id);
      } else {
        await pinConversation(conv.id);
      }
      loadConversations();
    } catch (error) {
      console.error('[Sidebar] Pin toggle error:', error);
    }
  };

  const navItems = [
    { icon: Music, label: 'Music Studio', href: '/music-studio', gradient: true },
    { icon: Mic2, label: 'AURA A&R', href: '/aura-lab', gradient: true },
    { icon: Code, label: 'Code Workshop', href: '/code-workshop', gradient: true },
    { icon: Library, label: 'Library', href: '/library/projects' },
  ];

  const bottomItems = [
    { icon: Brain, label: 'Memory', href: '/memory' },
    { icon: BarChart, label: 'Insights', href: '/insights' },
    { icon: Settings, label: 'Settings', href: '/settings' },
    { icon: Activity, label: 'Autonomy', href: '/autonomy' },
  ];

  return (
    <div 
      className="w-full h-full flex flex-col"
      style={{
        backgroundColor: cyberpunkTheme.colors.background.secondary,
        borderRight: `1px solid ${cyberpunkTheme.colors.border.primary}`,
      }}
    >


      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3">
        <div className="space-y-1 mb-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: isActive ? cyberpunkTheme.colors.background.tertiary : 'transparent',
                  color: isActive ? cyberpunkTheme.colors.primary.cyan : cyberpunkTheme.colors.text.secondary,
                }}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
                {item.gradient && (
                  <div className="ml-auto">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" 
                      style={{ backgroundColor: cyberpunkTheme.colors.primary.pink }} 
                    />
                  </div>
                )}
              </Link>
            );
          })}
        </div>

        {/* Search - moved above Chats */}
        <div className="px-3 mb-3">
          <ConversationSearch
            onSearch={handleSearch}
            onClear={handleClearSearch}
          />
        </div>

        {/* Chats Section */}
        <div className="mb-4">
          <button
            onClick={() => setShowChats(!showChats)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm font-medium">Chats</span>
              <span 
                className="text-xs px-1.5 py-0.5 rounded"
                style={{ 
                  backgroundColor: cyberpunkTheme.colors.background.tertiary,
                  color: cyberpunkTheme.colors.text.tertiary,
                }}
              >
                {conversations.length}
              </span>
            </div>
            <ChevronRight 
              className={`w-4 h-4 transition-transform ${showChats ? 'rotate-90' : ''}`}
            />
          </button>

          {showChats && (
            <div className="mt-1 space-y-1">
              <button
                onClick={() => {
                  window.location.href = '/';
                  onNavigate?.();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm"
                style={{ color: cyberpunkTheme.colors.text.secondary }}
              >
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </button>

              <div className="max-h-48 overflow-y-auto space-y-1">
                {filteredConversations.length === 0 && searchQuery && (
                  <div 
                    className="px-3 py-4 text-sm text-center"
                    style={{ color: cyberpunkTheme.colors.text.tertiary }}
                  >
                    No conversations found
                  </div>
                )}
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="group relative flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    {conv.pinned && (
                      <Pin 
                        className="w-3 h-3 flex-shrink-0" 
                        style={{ color: cyberpunkTheme.colors.primary.cyan }}
                        fill="currentColor"
                      />
                    )}

                    <button
                      onClick={() => {
                        window.location.href = `/?conversation=${conv.id}`;
                        onNavigate?.();
                      }}
                      className="flex-1 text-left min-w-0"
                    >
                      <div 
                        className="text-sm truncate"
                        style={{ color: cyberpunkTheme.colors.text.primary }}
                      >
                        {conv.title || 'Untitled Chat'}
                      </div>
                      <div 
                        className="text-xs"
                        style={{ color: cyberpunkTheme.colors.text.tertiary }}
                      >
                        {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                      </div>
                    </button>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => handleTogglePin(conv, e)}
                        className="p-1 rounded hover:bg-cyan-500/20 transition-all"
                        style={{ color: conv.pinned ? cyberpunkTheme.colors.primary.cyan : cyberpunkTheme.colors.text.tertiary }}
                        title={conv.pinned ? 'Unpin' : 'Pin'}
                      >
                        <Pin className="w-3.5 h-3.5" fill={conv.pinned ? 'currentColor' : 'none'} />
                      </button>

                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="p-1 rounded hover:bg-red-500/20 transition-all"
                        style={{ color: cyberpunkTheme.colors.accent?.error || '#EF4444' }}
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="p-3 space-y-1 border-t" style={{ borderColor: cyberpunkTheme.colors.border.primary }}>
        {bottomItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: isActive ? cyberpunkTheme.colors.background.tertiary : 'transparent',
                color: isActive ? cyberpunkTheme.colors.primary.purple : cyberpunkTheme.colors.text.secondary,
              }}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User Profile at Bottom */}
      <div className="border-t" style={{ borderColor: cyberpunkTheme.colors.border.primary }}>
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors"
          >
            <div 
              className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden"
              style={{ background: cyberpunkTheme.colors.gradients.primary }}
            >
              {user?.imageUrl ? (
                <img 
                  src={user.imageUrl} 
                  alt={user.firstName || 'User'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={20} style={{ color: '#fff' }} />
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div 
                className="text-sm font-medium truncate"
                style={{ color: cyberpunkTheme.colors.text.primary }}
              >
                {user?.firstName || user?.username || 'User'}
              </div>
              <div 
                className="text-xs truncate"
                style={{ color: cyberpunkTheme.colors.text.tertiary }}
              >
                {user?.primaryEmailAddress?.emailAddress || 'user@email.com'}
              </div>
            </div>
            <ChevronDown 
              className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
              style={{ color: cyberpunkTheme.colors.text.secondary }}
            />
          </button>

          {/* Expandable User Menu */}
          {showUserMenu && (
            <div 
              className="absolute bottom-full left-0 right-0 mb-1 rounded-lg border overflow-hidden"
              style={{
                backgroundColor: cyberpunkTheme.colors.background.elevated,
                borderColor: cyberpunkTheme.colors.border.primary,
                boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.3)',
              }}
            >
              <Link
                href="/settings"
                onClick={onNavigate}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                style={{ color: cyberpunkTheme.colors.text.primary }}
              >
                <Settings className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </Link>
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                style={{ color: cyberpunkTheme.colors.accent.error }}
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
