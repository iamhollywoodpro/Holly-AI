'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  MessageSquare,
  Music,
  Image as ImageIcon,
  Video,
  Mic,
  FolderOpen,
  Settings,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: Home, href: '/' },
  { id: 'chat', label: 'Chat', icon: MessageSquare, href: '/chat' },
  { id: 'music', label: 'Music Studio', icon: Music, href: '/music', badge: 'NEW' },
  { id: 'image', label: 'Image Studio', icon: ImageIcon, href: '/image' },
  { id: 'video', label: 'Video Studio', icon: Video, href: '/video' },
  { id: 'audio', label: 'Audio Studio', icon: Mic, href: '/audio' },
  { id: 'files', label: 'Files', icon: FolderOpen, href: '/files' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/settings' },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname?.startsWith(href);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden md:flex flex-col fixed left-0 top-0 h-screen bg-bg-secondary border-r border-border-primary
          transition-all duration-300 z-40
          ${isCollapsed ? 'w-20' : 'w-64'}
        `}
      >
        {/* Logo & Toggle */}
        <div className="flex items-center justify-between p-4 border-b border-border-primary">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-holly-gradient flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gradient tracking-tight">HOLLY</h1>
                <p className="text-xs text-text-tertiary">AI Dev Partner</p>
              </div>
            </div>
          )}
          
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="btn-icon"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  ${active ? 'nav-item-active' : 'nav-item'}
                  ${isCollapsed ? 'justify-center' : ''}
                  relative group
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-holly-purple' : ''}`} />
                
                {!isCollapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="badge-primary text-xs px-2 py-0.5">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}

                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-bg-elevated rounded-md text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {item.label}
                    {item.badge && (
                      <span className="ml-2 badge-primary text-xs">{item.badge}</span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-border-primary">
          {!isCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-holly-gradient flex items-center justify-center text-sm font-bold">
                SH
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">Steve Hollywood</p>
                <p className="text-xs text-text-tertiary truncate">hollywood@email.com</p>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-10 h-10 rounded-full bg-holly-gradient flex items-center justify-center text-sm font-bold">
                SH
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-elevated/95 backdrop-blur-xl border-t border-border-primary z-50 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`
                  flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all
                  ${active ? 'text-holly-purple' : 'text-text-secondary'}
                `}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{item.label.split(' ')[0]}</span>
                {item.badge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-holly-purple rounded-full" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
