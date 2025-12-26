'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Library, MessageSquare, Brain, BarChart, Settings, Activity, 
  ChevronRight, Plus, Trash2
} from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import { formatDistanceToNow } from 'date-fns';
import { getConversations, deleteConversation } from '@/lib/conversation-manager';
import type { Conversation } from '@/types/conversation';
import { ConversationSearch } from './ConversationSearch';

interface SidebarCollapsibleProps {
  isOpen: boolean;
  onToggle: () => void;
  currentConversationId?: string | null;
}

export const SidebarCollapsible = forwardRef<any, SidebarCollapsibleProps>(
  function SidebarCollapsible({ isOpen, onToggle, currentConversationId }, ref) {
  const pathname = usePathname();
  const [conversations, setConversations] = useState<any[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<any[]>([]);
  const [showChats, setShowChats] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      console.log('[Sidebar] Loading conversations...');
      const convs = await getConversations();
      setConversations(convs);
      setFilteredConversations(convs);
      console.log('[Sidebar] ✅ Loaded', convs.length, 'conversations');
    } catch (error) {
      console.error('[Sidebar] ❌ Failed to load conversations:', error);
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

  // Expose refresh method to parent
  useImperativeHandle(ref, () => ({
    refreshConversations: loadConversations,
  }));

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Delete this conversation?')) return;

    try {
      console.log('[Sidebar] Deleting conversation:', id);
      await deleteConversation(id);
      
      // If we deleted the current conversation, redirect to home
      if (id === currentConversationId) {
        window.location.href = '/';
      } else {
        loadConversations();
      }
      
      console.log('[Sidebar] ✅ Conversation deleted');
    } catch (error) {
      console.error('[Sidebar] ❌ Delete error:', error);
    }
  };

  const navItems = [
    { icon: Library, label: 'Library', href: '/library/projects' },
    { icon: Brain, label: 'Memory', href: '/memory' },
    { icon: BarChart, label: 'Insights', href: '/insights' },
  ];

  const bottomItems = [
    { icon: Settings, label: 'Settings', href: '/settings' },
    { icon: Activity, label: 'Autonomy', href: '/autonomy' },
  ];

  if (!isOpen) return null;

  return (
    <aside 
      className="w-64 border-r flex flex-col h-full"
      style={{
        backgroundColor: cyberpunkTheme.colors.background.secondary,
        borderColor: cyberpunkTheme.colors.border.primary,
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: cyberpunkTheme.colors.border.primary }}>
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: cyberpunkTheme.colors.gradients.primary }}
          >
            <span className="text-white font-bold text-lg">H</span>
          </div>
          <div>
            <h2 
              className="font-bold"
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
              AI Partner
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: isActive ? cyberpunkTheme.colors.background.tertiary : 'transparent',
                color: isActive ? cyberpunkTheme.colors.primary.purple : cyberpunkTheme.colors.text.secondary,
              }}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}

        {/* Chats Section */}
        <div className="pt-4">
          <button
            onClick={() => setShowChats(!showChats)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
            style={{ color: cyberpunkTheme.colors.text.secondary }}
          >
            <div className="flex items-center gap-3">
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
                onClick={() => window.location.href = '/'}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-sm"
                style={{ color: cyberpunkTheme.colors.text.secondary }}
              >
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </button>

              <ConversationSearch
                onSearch={handleSearch}
                onClear={handleClearSearch}
              />

              <div className="max-h-64 overflow-y-auto space-y-1">
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
                  <button
                    onClick={() => window.location.href = `/?conversation=${conv.id}`}
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

                  <button
                    onClick={(e) => handleDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 transition-all"
                    style={{ color: cyberpunkTheme.colors.accent.error }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className="p-3 border-t space-y-1" style={{ borderColor: cyberpunkTheme.colors.border.primary }}>
        {bottomItems.map((item) => {
          const isActive = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: isActive ? cyberpunkTheme.colors.background.tertiary : 'transparent',
                color: isActive ? cyberpunkTheme.colors.primary.purple : cyberpunkTheme.colors.text.secondary,
              }}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
});
