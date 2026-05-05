/**
 * Library Sections Configuration
 * Defines all sections in the Library
 */

import { LibrarySection } from '@/types/navigation';

export interface LibrarySectionConfig {
  id: LibrarySection;
  label: string;
  icon: string;
  description: string;
  route: string;
  emptyMessage: string;
}

export const librarySections: LibrarySectionConfig[] = [
  {
    id: 'projects',
    label: 'Projects',
    icon: 'FolderOpen',
    description: 'All your creative projects',
    route: '/library/projects',
    emptyMessage: 'No projects yet. Create your first project!',
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: 'Image',
    description: 'Generated images, videos, and music',
    route: '/library/assets',
    emptyMessage: 'No assets yet. Generate your first asset!',
  },
  {
    id: 'collections',
    label: 'Collections',
    icon: 'Layers',
    description: 'Organized groups of items',
    route: '/library/collections',
    emptyMessage: 'No collections yet. Create your first collection!',
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: 'Star',
    description: 'Your starred items',
    route: '/library/favorites',
    emptyMessage: 'No favorites yet. Star items to see them here!',
  },
  {
    id: 'archived',
    label: 'Archived',
    icon: 'Archive',
    description: 'Archived projects and assets',
    route: '/library/archived',
    emptyMessage: 'No archived items.',
  },
];
