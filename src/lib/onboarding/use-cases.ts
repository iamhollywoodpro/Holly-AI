/**
 * Signup use-case picker — Roadmap C2b
 *
 * New users pick what they want to use Holly for. Each use case maps to a
 * curated set of starter extensions from the catalog that get auto-installed
 * (autoInstalled: true) so Holly's tool grants match the user's intent from
 * the very first chat. Users can always install more from the Extensions
 * Store later.
 *
 * Curated sets are intentionally small (3-4 each) — the point is a relevant
 * starting kit, not the whole suite.
 */

export interface UseCase {
  id: string;
  label: string;
  description: string;
  icon: string;
  /** Curated starter extension ids from src/lib/extensions/catalog.ts */
  starterExtensions: string[];
}

export const USE_CASES: UseCase[] = [
  {
    id: 'coding',
    label: 'Coding Partner',
    description: 'Build, review, test, and deploy code together.',
    icon: '⌨️',
    starterExtensions: ['dev-github', 'dev-code-review', 'dev-terminal', 'dev-testing-harness'],
  },
  {
    id: 'music',
    label: 'Music Partner',
    description: 'Studio sessions, songwriting, releases, and A&R research.',
    icon: '🎵',
    starterExtensions: ['music-studio-sessions', 'music-aura-lab', 'music-spotify', 'music-distribution'],
  },
  {
    id: 'design',
    label: 'Design Partner',
    description: 'Graphic design, branding, animation, and visuals.',
    icon: '🎨',
    starterExtensions: ['creative-graphic-design', 'creative-brand-kit', 'creative-animation'],
  },
  {
    id: 'friend',
    label: 'Friend / Life Partner',
    description: 'Companionship, conversation, goals, and daily life.',
    icon: '💜',
    starterExtensions: ['prod-notes', 'prod-goals'],
  },
  {
    id: 'chat',
    label: 'Just Chat',
    description: 'Open conversation — Holly with her general toolkit.',
    icon: '💬',
    starterExtensions: ['research-web-search'],
  },
  {
    id: 'business',
    label: 'Business',
    description: 'Business plans, invoicing, dashboards, and deals.',
    icon: '💼',
    starterExtensions: ['biz-business-plans', 'biz-invoicing', 'biz-dashboard'],
  },
  {
    id: 'content',
    label: 'Content & Social',
    description: 'Posts, calendars, analytics, and audience growth.',
    icon: '📸',
    starterExtensions: ['social-post-creation', 'social-content-calendar', 'social-analytics'],
  },
  {
    id: 'web',
    label: 'Website & Store',
    description: 'Build sites, landing pages, SEO, and shops.',
    icon: '🌐',
    starterExtensions: ['web-website-builder', 'web-seo', 'web-store'],
  },
];

export function getUseCaseById(id: string): UseCase | undefined {
  return USE_CASES.find(uc => uc.id === id);
}

/** Union of starter extensions for a set of selected use-case ids. */
export function starterExtensionsFor(useCaseIds: string[]): string[] {
  const ids = new Set<string>();
  for (const ucId of useCaseIds) {
    const uc = getUseCaseById(ucId);
    if (uc) uc.starterExtensions.forEach(extId => ids.add(extId));
  }
  return [...ids];
}
