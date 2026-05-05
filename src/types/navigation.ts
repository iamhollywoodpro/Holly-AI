/**
 * Navigation Types for Sprint 2
 * Workspace-style sidebar navigation system
 */

/**
 * Task types available in New Task menu
 */
export type TaskType =
  | 'website'
  | 'app'
  | 'code'
  | 'image'
  | 'video'
  | 'music'
  | 'aura'
  | 'songwriting'
  | 'screenwriting';

/**
 * Task categories for grouping
 */
export type TaskCategory = 'create' | 'generate' | 'analyze' | 'write';

/**
 * Library section types
 */
export type LibrarySection =
  | 'projects'
  | 'assets'
  | 'collections'
  | 'favorites'
  | 'archived';

/**
 * Navigation item type
 */
export type NavItemType =
  | 'link'        // Simple link
  | 'dropdown'    // Dropdown menu
  | 'expandable'  // Expandable section
  | 'button';     // Action button

/**
 * Base navigation item interface
 */
export interface NavigationItem {
  id: string;
  label: string;
  icon: string; // Lucide icon name
  type: NavItemType;
  href?: string;
  badge?: string | number;
  children?: NavigationItem[];
  action?: () => void;
  isExpanded?: boolean;
  isActive?: boolean;
}

/**
 * New Task option interface
 */
export interface NewTaskOption {
  id: TaskType;
  label: string;
  description: string;
  icon: string; // Lucide icon name
  route: string;
  category: TaskCategory;
  comingSoon?: boolean;
  badge?: string;
}

/**
 * Library item interface
 */
export interface LibraryItem {
  id: string;
  type: 'project' | 'asset' | 'collection';
  name: string;
  description?: string;
  thumbnail?: string;
  icon?: string;
  color?: string;
  tags: string[];
  isFavorite: boolean;
  isArchived: boolean;
  itemCount?: number; // For collections
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Search result interface
 */
export interface SearchResult {
  id: string;
  type: 'chat' | 'project' | 'asset' | 'analysis' | 'file';
  title: string;
  description?: string;
  thumbnail?: string;
  icon?: string;
  route: string;
  relevance: number; // 0-1
  createdAt: Date;
}

/**
 * Sidebar state interface
 */
export interface SidebarState {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  expandedSections: string[];
  activeItem: string | null;
}
