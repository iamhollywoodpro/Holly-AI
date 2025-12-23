'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { librarySections } from '@/config/library-sections';
import { useSidebar } from '@/hooks/use-sidebar';

interface LibrarySectionProps {
  isCollapsed?: boolean;
}

export function LibrarySection({ isCollapsed = false }: LibrarySectionProps) {
  const pathname = usePathname();
  const { expandedSections, toggleSection } = useSidebar();
  const isExpanded = expandedSections.includes('library');

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  const isActive = (route: string) => {
    return pathname?.startsWith(route);
  };

  return (
    <div>
      {/* Library Header */}
      <button
        onClick={() => !isCollapsed && toggleSection('library')}
        className={`
          w-full flex items-center gap-3 px-3 py-2 rounded-lg
          text-gray-400 hover:text-white hover:bg-gray-800
          transition-all duration-200
          ${isCollapsed ? 'justify-center' : 'justify-between'}
        `}
        title={isCollapsed ? 'Library' : undefined}
      >
        <div className="flex items-center gap-3">
          <LucideIcons.Library className="w-5 h-5" />
          {!isCollapsed && <span className="text-sm font-medium">Library</span>}
        </div>
        {!isCollapsed && (
          <ChevronRight
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          />
        )}
      </button>

      {/* Library Items */}
      {!isCollapsed && isExpanded && (
        <div className="ml-6 mt-1 space-y-1">
          {librarySections.map((section) => {
            const Icon = getIcon(section.icon);
            const active = isActive(section.route);

            return (
              <Link
                key={section.id}
                href={section.route}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
                  transition-all duration-200
                  ${
                    active
                      ? 'text-white bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }
                `}
              >
                <Icon className={`w-4 h-4 ${active ? 'text-purple-400' : ''}`} />
                <span>{section.label}</span>
              </Link>
            );
          })}
        </div>
      )}

      {/* Collapsed Tooltip Menu */}
      {isCollapsed && (
        <div className="group relative">
          <div className="absolute left-full ml-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
            <div className="p-2 space-y-1">
              {librarySections.map((section) => {
                const Icon = getIcon(section.icon);
                const active = isActive(section.route);

                return (
                  <Link
                    key={section.id}
                    href={section.route}
                    className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                      transition-colors
                      ${
                        active
                          ? 'text-white bg-purple-500/20'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{section.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
