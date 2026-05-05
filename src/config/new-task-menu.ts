/**
 * New Task Menu Configuration
 * Defines all available tasks in the New Task dropdown
 */

import { NewTaskOption, TaskCategory } from '@/types/navigation';

export const newTaskOptions: NewTaskOption[] = [
  // CREATE CATEGORY
  {
    id: 'website',
    label: 'Create Website',
    description: 'Build a complete website with AI',
    icon: 'Globe',
    route: '/create/website',
    category: 'create',
  },
  {
    id: 'app',
    label: 'Create App',
    description: 'Build a mobile or web application',
    icon: 'Smartphone',
    route: '/create/app',
    category: 'create',
  },
  {
    id: 'code',
    label: 'Code Generator',
    description: 'Generate code snippets and functions',
    icon: 'Code',
    route: '/create/code',
    category: 'create',
  },
  
  // GENERATE CATEGORY
  {
    id: 'image',
    label: 'Image Generator',
    description: 'Create images with AI',
    icon: 'Image',
    route: '/generate/image',
    category: 'generate',
  },
  {
    id: 'video',
    label: 'Video Generator',
    description: 'Generate videos from text or images',
    icon: 'Video',
    route: '/generate/video',
    category: 'generate',
    comingSoon: true,
  },
  {
    id: 'music',
    label: 'Music Generator',
    description: 'Compose music with AI',
    icon: 'Music',
    route: '/generate/music',
    category: 'generate',
    comingSoon: true,
  },
  
  // ANALYZE CATEGORY
  {
    id: 'aura',
    label: 'AURA A&R Analysis',
    description: 'Professional music A&R analysis',
    icon: 'Sparkles',
    route: '/aura',
    category: 'analyze',
    badge: 'NEW',
  },
  
  // WRITE CATEGORY
  {
    id: 'songwriting',
    label: 'Songwriting Tool',
    description: 'Write lyrics and melodies',
    icon: 'Mic2',
    route: '/write/songwriting',
    category: 'write',
    comingSoon: true,
  },
  {
    id: 'screenwriting',
    label: 'Screenwriting Tool',
    description: 'Write scripts and screenplays',
    icon: 'FileText',
    route: '/write/screenwriting',
    category: 'write',
    comingSoon: true,
  },
];

/**
 * Group tasks by category
 */
export const tasksByCategory: Record<TaskCategory, NewTaskOption[]> = {
  create: newTaskOptions.filter(t => t.category === 'create'),
  generate: newTaskOptions.filter(t => t.category === 'generate'),
  analyze: newTaskOptions.filter(t => t.category === 'analyze'),
  write: newTaskOptions.filter(t => t.category === 'write'),
};

/**
 * Category labels for display
 */
export const categoryLabels: Record<TaskCategory, string> = {
  create: 'Create',
  generate: 'Generate',
  analyze: 'Analyze',
  write: 'Write',
};
