/**
 * Phase R1/S: Extension Catalog
 * ──────────────────────────────
 * The canonical source of truth for every extension Holly can offer.
 *
 * Catalog lives in code (not DB) so it is:
 *   - Type-safe (compiler-enforced shape)
 *   - Versioned (changes tracked in git)
 *   - Sortable/groupable at runtime
 *   - Offline-available (no DB round-trip to render the marketplace)
 *
 * The DB only tracks installs (see UserExtension model). To install an
 * extension that doesn't exist in this catalog = 404. To change what an
 * extension does = edit this file. Simple.
 *
 * Suite order matches Steve's priority:
 *   Developer > Music > Business > Social Media > Web > Creative > Productivity > Research
 *
 * Pricing: per Steve's directive (2026-07-01) everything is free for now.
 * The `premium` flag is reserved for future billing tiers but currently unused.
 */

export type ExtensionSuite =
  | 'developer'
  | 'music'
  | 'business'
  | 'social'
  | 'web'
  | 'creative'
  | 'productivity'
  | 'research';

export const ALL_SUITES: ExtensionSuite[] = [
  'developer',
  'music',
  'business',
  'social',
  'web',
  'creative',
  'productivity',
  'research',
];

export interface ExtensionSuiteMeta {
  key: ExtensionSuite;
  name: string;
  icon: string;        // emoji for quick render
  tagline: string;     // one-line description of the suite
  priority: number;    // 1 = highest (developer), 8 = lowest (research)
}

export const SUITE_METADATA: Record<ExtensionSuite, ExtensionSuiteMeta> = {
  developer: {
    key: 'developer',
    name: 'Developer',
    icon: '💻',
    tagline: 'Code, deploy, and ship software with Holly as your pair programmer',
    priority: 1,
  },
  music: {
    key: 'music',
    name: 'Music Industry',
    icon: '🎵',
    tagline: 'Run your music career, label, or publishing company end-to-end',
    priority: 2,
  },
  business: {
    key: 'business',
    name: 'Business & Finance',
    icon: '💼',
    tagline: 'Make money, manage deals, trade, and run the business side',
    priority: 3,
  },
  social: {
    key: 'social',
    name: 'Social Media',
    icon: '📱',
    tagline: 'Automate posting, engagement, and growth across every platform',
    priority: 4,
  },
  web: {
    key: 'web',
    name: 'Web & Digital',
    icon: '🌐',
    tagline: 'Build websites, stores, blogs, and money-making landing pages',
    priority: 5,
  },
  creative: {
    key: 'creative',
    name: 'Creative',
    icon: '🎨',
    tagline: 'Design logos, edit video, build brand kits, and produce visuals',
    priority: 6,
  },
  productivity: {
    key: 'productivity',
    name: 'Productivity',
    icon: '⚡',
    tagline: 'CRM, tasks, calendar, docs — the operations layer for your life',
    priority: 7,
  },
  research: {
    key: 'research',
    name: 'Research',
    icon: '🔬',
    tagline: 'Search, analyze, and synthesize information into action',
    priority: 8,
  },
};

export interface ExtensionManifest {
  /** Unique kebab-case identifier (e.g. "music-distribution") */
  id: string;
  /** Which suite this belongs to */
  suite: ExtensionSuite;
  /** Display name shown in marketplace UI */
  name: string;
  /** One-to-two-sentence description of what this extension does */
  description: string;
  /** Concrete capabilities Holly gains when this is installed */
  capabilities: string[];
  /** Emoji icon for quick rendering */
  icon: string;
  /** True if this extension involves adult content (requires requireAdult) */
  nsfw?: boolean;
  /**
   * True if locked for non-creators. Currently UNUSED — Steve's directive
   * (2026-07-01) is "everything free for now". Flag exists so we can add
   * billing tiers later without rewriting the catalog.
   */
  premium?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE CATALOG — 80 extensions across 8 suites
// ═══════════════════════════════════════════════════════════════════════════

export const EXTENSION_CATALOG: ExtensionManifest[] = [

  // ─── S1: DEVELOPER SUITE (9 extensions) ─────────────────────────────────
  {
    id: 'dev-api-testing',
    suite: 'developer',
    name: 'API Testing & Documentation',
    icon: '🔌',
    description: 'Test any REST or GraphQL API and auto-generate documentation from the responses.',
    capabilities: [
      'Send requests with custom headers, auth, and bodies',
      'Auto-generate OpenAPI/GraphQL schema from responses',
      'Compare endpoint behavior across environments',
    ],
  },
  {
    id: 'dev-deployment',
    suite: 'developer',
    name: 'Deployment Integration',
    icon: '🚀',
    description: 'One-click deploys to Vercel, AWS, Cloudflare, and Coolify from inside chat.',
    capabilities: [
      'Connect Vercel / AWS / Cloudflare accounts',
      'Deploy current project with a single message',
      'Roll back to previous deploy instantly',
    ],
  },
  {
    id: 'dev-devops-dashboard',
    suite: 'developer',
    name: 'DevOps Dashboard',
    icon: '📊',
    description: 'Live view of build status, deploy health, error rates, and server metrics.',
    capabilities: [
      'Monitor build pipelines across repos',
      'Surface error spikes before users notice',
      'Alert on degraded endpoints',
    ],
  },
  {
    id: 'dev-code-review',
    suite: 'developer',
    name: 'Code Review',
    icon: '🔍',
    description: 'Senior-engineer-level code review on every PR, with security and perf analysis.',
    capabilities: [
      'Review GitHub PRs automatically on open',
      'Flag security issues, race conditions, anti-patterns',
      'Suggest concrete fixes with code snippets',
    ],
  },
  {
    id: 'dev-sandbox',
    suite: 'developer',
    name: 'Code Sandbox',
    icon: '🏗️',
    description: 'Run JavaScript, Python, and TypeScript in isolated containers with hot reload.',
    capabilities: [
      'Execute untrusted code safely',
      'Hot-reload on edits',
      'Install npm/pip packages on demand',
    ],
  },
  {
    id: 'dev-terminal',
    suite: 'developer',
    name: 'Terminal Access',
    icon: '⌨️',
    description: 'Shell access to your projects with Holly-aware command suggestions.',
    capabilities: [
      'Run shell commands from chat',
      'Smart command completion',
      'Persistent history per project',
    ],
  },
  {
    id: 'dev-github',
    suite: 'developer',
    name: 'GitHub Integration',
    icon: '🐙',
    description: 'Read, write, and manage repos, issues, and PRs from inside chat.',
    capabilities: [
      'Read/write files in any repo',
      'Open issues and PRs',
      'Trigger Actions workflows',
    ],
  },
  {
    id: 'dev-dependency-monitor',
    suite: 'developer',
    name: 'Dependency Monitor',
    icon: '📦',
    description: 'Track npm/pip/cargo dependencies for security advisories and major bumps.',
    capabilities: [
      'Alert on CVEs in your dependency tree',
      'Suggest safe upgrade paths',
      'Auto-bump patch versions',
    ],
  },
  {
    id: 'dev-testing-harness',
    suite: 'developer',
    name: 'Test Harness',
    icon: '🧪',
    description: 'Generate and run unit, integration, and E2E tests for your codebase.',
    capabilities: [
      'Generate Jest/Vitest tests from source',
      'Run test suites and parse failures',
      'Track coverage over time',
    ],
  },

  // ─── S2: MUSIC INDUSTRY SUITE (12 extensions) ──────────────────────────
  {
    id: 'music-distribution',
    suite: 'music',
    name: 'Music Distribution',
    icon: '💿',
    description: 'Distribute to Spotify, Apple Music, TikTok, YouTube Music, and 150+ stores.',
    capabilities: [
      'Upload once, deliver everywhere',
      'Manage release dates per territory',
      'Auto-generate ISRC and UPC codes',
    ],
  },
  {
    id: 'music-royalties',
    suite: 'music',
    name: 'Royalty Tracking',
    icon: '💰',
    description: 'Track royalties across PROs, publishers, and streaming platforms in one dashboard.',
    capabilities: [
      'Sync with ASCAP, BMI, SESAC, SOCAN',
      'Match unmatched royalties automatically',
      'Forecast monthly income per track',
    ],
  },
  {
    id: 'music-tour-planning',
    suite: 'music',
    name: 'Tour Planning',
    icon: '🎤',
    description: 'Plan routes, book venues, and budget tours with real venue data.',
    capabilities: [
      'Route optimization for multi-city tours',
      'Venue contact database with deal terms',
      'Per-show P&L modeling',
    ],
  },
  {
    id: 'music-fan-crm',
    suite: 'music',
    name: 'Fan CRM',
    icon: '💜',
    description: 'Unified fan database with streaming, social, and email data in one place.',
    capabilities: [
      'Merge fan identities across platforms',
      'Segment by engagement tier',
      'Trigger campaigns based on behavior',
    ],
  },
  {
    id: 'music-playlist-pitching',
    suite: 'music',
    name: 'Playlist Pitching',
    icon: '📋',
    description: 'Pitch tracks to Spotify, Apple, and YouTube playlist curators with tracked outreach.',
    capabilities: [
      'Curator database with taste profiles',
      'Auto-personalized pitch emails',
      'Track acceptances and adds',
    ],
  },
  {
    id: 'music-sync-licensing',
    suite: 'music',
    name: 'Sync Licensing',
    icon: '🎬',
    description: 'List your catalog for film/TV/ad placements and manage sync deals.',
    capabilities: [
      'Submit to music supervisors and ad agencies',
      'Manage one-click licensing terms',
      'Track placements and payouts',
    ],
  },
  {
    id: 'music-contract-review',
    suite: 'music',
    name: 'Contract Review',
    icon: '📝',
    description: 'Red-flag review of record deals, publishing contracts, and management agreements.',
    capabilities: [
      'Identify bad clauses (term, territories, reversion)',
      'Compare against industry-standard terms',
      'Suggest negotiation points',
    ],
  },
  {
    id: 'music-ar-discovery',
    suite: 'music',
    name: 'A&R Discovery',
    icon: '🔎',
    description: 'Discover emerging artists by territory, genre, and velocity across TikTok and Spotify.',
    capabilities: [
      'Surface artists trending in your genre',
      'Predict breakthrough artists 3-6 months out',
      'Track velocity week-over-week',
    ],
  },
  {
    id: 'music-studio-sessions',
    suite: 'music',
    name: 'Studio Sessions',
    icon: '🎚️',
    description: 'Book studios, manage session musicians, and track recording expenses.',
    capabilities: [
      'Studio booking with gear specs',
      'Session player marketplace',
      'Per-session cost tracking',
    ],
  },
  {
    id: 'music-publishing-admin',
    suite: 'music',
    name: 'Publishing Admin',
    icon: '📚',
    description: 'Register works with PROs globally and track publishing income.',
    capabilities: [
      'Auto-register songs with PROs worldwide',
      'Track mechanical and performance income',
      'Manage co-writer splits',
    ],
  },
  {
    id: 'music-spotify',
    suite: 'music',
    name: 'Spotify Client',
    icon: '🟢',
    description: 'Direct Spotify API access — playlists, catalog, artist profiles, listening history.',
    capabilities: [
      'Read and manage playlists',
      'Pull artist and track analytics',
      'Search the full Spotify catalog',
    ],
  },
  {
    id: 'music-aura-lab',
    suite: 'music',
    name: 'AURA Lab',
    icon: '🌈',
    description: 'AI-driven song analysis, hit prediction, and stem separation.',
    capabilities: [
      'Billboard Hit Rating on any track',
      'Stem separation (vocals, drums, bass, etc.)',
      'Song-structure mapping',
    ],
  },

  // ─── S3: BUSINESS & FINANCE SUITE (10 extensions) ──────────────────────
  {
    id: 'biz-crypto-trading',
    suite: 'business',
    name: 'Crypto & Trading Tools',
    icon: '₿',
    description: 'Holly can monitor markets and execute trades on your behalf with your approval.',
    capabilities: [
      'Connect to Binance, Coinbase, Kraken',
      'Set trade strategies with risk limits',
      'Auto-execute with explicit approval per trade',
    ],
  },
  {
    id: 'biz-financial-planning',
    suite: 'business',
    name: 'Financial Planning',
    icon: '📈',
    description: 'Build financial models, projections, and runway scenarios for any business.',
    capabilities: [
      'Generate P&L, balance sheet, cash flow',
      'Model growth scenarios',
      'Forecast runway and burn',
    ],
  },
  {
    id: 'biz-invoicing',
    suite: 'business',
    name: 'Invoicing',
    icon: '🧾',
    description: 'Create, send, and track invoices with automatic payment follow-up.',
    capabilities: [
      'Generate branded invoices',
      'Auto-follow-up on overdue payments',
      'Sync with Stripe and bank accounts',
    ],
  },
  {
    id: 'biz-business-plans',
    suite: 'business',
    name: 'Business Plans',
    icon: '📑',
    description: 'Investor-grade business plans and pitch decks generated in minutes.',
    capabilities: [
      'Full business plan from a one-paragraph brief',
      'Generate pitch deck slides',
      'Industry-specific templates',
    ],
  },
  {
    id: 'biz-legal-docs',
    suite: 'business',
    name: 'Legal Documents',
    icon: '⚖️',
    description: 'Generate NDAs, employment contracts, and incorporation docs (with red-flag review).',
    capabilities: [
      'Templates for 50+ common business docs',
      'State/jurisdiction-aware clauses',
      'Flag clauses that need a real lawyer',
    ],
  },
  {
    id: 'biz-accounting',
    suite: 'business',
    name: 'Accounting',
    icon: '📒',
    description: 'Bookkeeping, tax prep, and financial reporting — Holly categorizes transactions automatically.',
    capabilities: [
      'Auto-categorize bank and CC transactions',
      'Generate financial statements',
      'Track deductible expenses',
    ],
  },
  {
    id: 'biz-investment-analysis',
    suite: 'business',
    name: 'Investment Analysis',
    icon: '💎',
    description: 'Analyze stocks, crypto, real estate, and private deals with DCF and comps.',
    capabilities: [
      'DCF valuation models',
      'Comparable company analysis',
      'Risk-adjusted return projections',
    ],
  },
  {
    id: 'biz-revenue-optimization',
    suite: 'business',
    name: 'Revenue Optimization',
    icon: '🎯',
    description: 'Identify pricing gaps, upsell paths, and revenue leaks in your business.',
    capabilities: [
      'Analyze pricing vs. competitors',
      'Surface upsell opportunities per customer',
      'Find churn-leading behaviors',
    ],
  },
  {
    id: 'biz-dashboard',
    suite: 'business',
    name: 'Business Dashboard',
    icon: '📋',
    description: 'Unified view of revenue, expenses, customers, and KPIs across all your tools.',
    capabilities: [
      'Aggregate metrics from Stripe, Bank, CRM',
      'Custom KPI tracking',
      'Daily summary reports',
    ],
  },
  {
    id: 'biz-deal-management',
    suite: 'business',
    name: 'Deal Management',
    icon: '🤝',
    description: 'Pipeline view of every deal in flight — from lead to signed contract.',
    capabilities: [
      'Track deal stages and probabilities',
      'Auto-draft term sheets',
      'Reminder chain for next actions',
    ],
  },

  // ─── S4: SOCIAL MEDIA SUITE (12 extensions) ────────────────────────────
  {
    id: 'social-auto-posting',
    suite: 'social',
    name: 'Auto-Posting',
    icon: '📢',
    description: 'Schedule and auto-post to Instagram, TikTok, X, YouTube, LinkedIn, and Facebook.',
    capabilities: [
      'Cross-post with platform-specific formatting',
      'Optimal-time scheduling',
      'Bulk upload from content calendar',
    ],
  },
  {
    id: 'social-automation',
    suite: 'social',
    name: 'Social Media Automation',
    icon: '🤖',
    description: 'Holly runs your social presence — content, engagement, and DMs — on autopilot.',
    capabilities: [
      'Reply to common DMs automatically',
      'Rotate content themes per platform',
      'Auto-repost UGC with credit',
    ],
  },
  {
    id: 'social-content-calendar',
    suite: 'social',
    name: 'Content Calendar',
    icon: '📅',
    description: 'Visual calendar of every scheduled post across every platform.',
    capabilities: [
      'Drag-and-drop scheduling',
      'Theme and campaign grouping',
      'Draft approval workflows',
    ],
  },
  {
    id: 'social-post-creation',
    suite: 'social',
    name: 'Post Creation',
    icon: '✍️',
    description: 'Generate scroll-stopping posts — caption, hashtags, visual — for any platform.',
    capabilities: [
      'Platform-native voice matching',
      'Auto-generate image and video assets',
      'A/B variant testing',
    ],
  },
  {
    id: 'social-engagement',
    suite: 'social',
    name: 'Engagement Management',
    icon: '💬',
    description: 'Unified inbox for comments, DMs, and mentions across all platforms.',
    capabilities: [
      'One inbox for every platform',
      'Priority sorting by influence and intent',
      'Suggested replies in your voice',
    ],
  },
  {
    id: 'social-analytics',
    suite: 'social',
    name: 'Analytics',
    icon: '📊',
    description: 'Cross-platform performance dashboards — reach, engagement, conversion.',
    capabilities: [
      'Aggregate metrics across platforms',
      'Cohort and content analysis',
      'Weekly performance digests',
    ],
  },
  {
    id: 'social-hashtag-research',
    suite: 'social',
    name: 'Hashtag Research',
    icon: '#️⃣',
    description: 'Find the hashtags actually driving reach in your niche right now.',
    capabilities: [
      'Niche-specific hashtag discovery',
      'Ban/shadowban detection',
      'Track hashtag performance over time',
    ],
  },
  {
    id: 'social-audience-insights',
    suite: 'social',
    name: 'Audience Insights',
    icon: '👥',
    description: 'Who your audience is, where they are, what else they love.',
    capabilities: [
      'Demographics and psychographics',
      'Overlapping interests and brands',
      'Active hours by timezone',
    ],
  },
  {
    id: 'social-content-strategy',
    suite: 'social',
    name: 'Content Strategy',
    icon: '♟️',
    description: '30/60/90-day content strategies tuned to your goals and audience.',
    capabilities: [
      'Generate full content pillars',
      'Map strategy to business objectives',
      'Weekly strategy reviews',
    ],
  },
  {
    id: 'social-influencer-collab',
    suite: 'social',
    name: 'Influencer Collab',
    icon: '⭐',
    description: 'Find, vet, and manage influencer partnerships end-to-end.',
    capabilities: [
      'Discover influencers by audience fit',
      'Auto-draft outreach and contracts',
      'Track deliverables and ROI',
    ],
  },
  {
    id: 'social-listening',
    suite: 'social',
    name: 'Social Listening',
    icon: '👂',
    description: 'Monitor mentions of your brand, competitors, and keywords across the social web.',
    capabilities: [
      'Real-time mention alerts',
      'Competitor content tracking',
      'Sentiment trend over time',
    ],
  },
  {
    id: 'social-community',
    suite: 'social',
    name: 'Community Management',
    icon: '🌿',
    description: 'Moderate, grow, and nurture your community across Discord, Reddit, and groups.',
    capabilities: [
      'Auto-moderate spam and toxicity',
      'Surface high-value community members',
      'Schedule AMAs and events',
    ],
  },

  // ─── S5: WEB & DIGITAL SUITE (9 extensions) ────────────────────────────
  {
    id: 'web-website-builder',
    suite: 'web',
    name: 'Website Builder',
    icon: '🏗️',
    description: 'Build full websites from a brief — Holly writes the code and deploys.',
    capabilities: [
      'Generate Next.js sites from a description',
      'Pre-built section library',
      'One-click deploy to Vercel',
    ],
  },
  {
    id: 'web-store',
    suite: 'web',
    name: 'Store / E-commerce',
    icon: '🛒',
    description: 'Launch a Shopify-class storefront with products, payments, and inventory.',
    capabilities: [
      'Product catalog management',
      'Stripe checkout integration',
      'Inventory and order tracking',
    ],
  },
  {
    id: 'web-blog',
    suite: 'web',
    name: 'Blog Platform',
    icon: '✒️',
    description: 'Full blog with SEO, scheduling, and newsletter integration.',
    capabilities: [
      'MDX blog with syntax highlighting',
      'Auto-generate SEO metadata',
      'Convert posts to newsletter issues',
    ],
  },
  {
    id: 'web-money-tools',
    suite: 'web',
    name: 'Money-Making Tools',
    icon: '💵',
    description: 'Monetization widgets — paywalls, donations, memberships, digital downloads.',
    capabilities: [
      'Stripe paywalls and memberships',
      'Gumroad-style digital downloads',
      'Tip jar and Buy Me a Coffee widgets',
    ],
  },
  {
    id: 'web-landing-pages',
    suite: 'web',
    name: 'Landing Pages',
    icon: '🪧',
    description: 'High-converting landing pages for launches, campaigns, and lead capture.',
    capabilities: [
      'Template library for every campaign type',
      'A/B testing built in',
      'Form and CRM integration',
    ],
  },
  {
    id: 'web-seo',
    suite: 'web',
    name: 'SEO',
    icon: '🔍',
    description: 'Technical SEO, content optimization, and rank tracking.',
    capabilities: [
      'Technical audits and fixes',
      'Keyword research and content briefs',
      'SERP position tracking',
    ],
  },
  {
    id: 'web-domain-dns',
    suite: 'web',
    name: 'Domain / DNS',
    icon: '🌐',
    description: 'Register, transfer, and manage domains and DNS records.',
    capabilities: [
      'Domain registration via Cloudflare/route53',
      'DNS record management',
      'SSL provisioning',
    ],
  },
  {
    id: 'web-email-marketing',
    suite: 'web',
    name: 'Email Marketing',
    icon: '📧',
    description: 'Drip campaigns, newsletters, and broadcasts with deliverability monitoring.',
    capabilities: [
      'Visual email sequence builder',
      'List segmentation and tagging',
      'Deliverability and open-rate tracking',
    ],
  },
  {
    id: 'web-analytics',
    suite: 'web',
    name: 'Web Analytics',
    icon: '📈',
    description: 'Privacy-first analytics with funnel, cohort, and conversion tracking.',
    capabilities: [
      'GA4-class analytics without the bloat',
      'Funnel and retention reports',
      'Event-based tracking',
    ],
  },

  // ─── S6: CREATIVE SUITE (8 extensions) ─────────────────────────────────
  {
    id: 'creative-graphic-design',
    suite: 'creative',
    name: 'Graphic Design',
    icon: '🎨',
    description: 'Logos, social graphics, album covers, and brand assets generated on demand.',
    capabilities: [
      'Logo generation with brand guidelines',
      'Album and single cover art',
      'Social post and story templates',
    ],
  },
  {
    id: 'creative-video-editing',
    suite: 'creative',
    name: 'Video Editing',
    icon: '🎬',
    description: 'Cut, caption, and remix video — Holly handles the tedious parts.',
    capabilities: [
      'Auto-cut long-form into shorts',
      'Add captions and b-roll automatically',
      'Multi-aspect-ratio export',
    ],
  },
  {
    id: 'creative-photo-editing',
    suite: 'creative',
    name: 'Photo Editing',
    icon: '📷',
    description: 'Pro photo retouching, background removal, and color grading.',
    capabilities: [
      'Background removal and replacement',
      'Skin and feature retouching',
      'Color grading presets',
    ],
  },
  {
    id: 'creative-brand-kit',
    suite: 'creative',
    name: 'Brand Identity Kit',
    icon: '🎭',
    description: 'Full visual identity — colors, typography, logo variants, usage rules.',
    capabilities: [
      'Generate color palette from one color',
      'Typography pairing suggestions',
      'Brand book PDF export',
    ],
  },
  {
    id: 'creative-presentations',
    suite: 'creative',
    name: 'Presentations',
    icon: '📽️',
    description: 'Generate pitch decks and slide decks that don\'t look like PowerPoint.',
    capabilities: [
      'Brief-to-deck in minutes',
      'Custom theme generation',
      'Export to PPT, PDF, and web',
    ],
  },
  {
    id: 'creative-animation',
    suite: 'creative',
    name: 'Animation',
    icon: '✨',
    description: '2D and 3D animation — explainers, logos, social stickers.',
    capabilities: [
      'Logo reveal generators',
      'Explainer video templates',
      'Lottie and GIF export',
    ],
  },
  {
    id: 'creative-print-design',
    suite: 'creative',
    name: 'Print Design',
    icon: '🖨️',
    description: 'Flyers, business cards, merch, and packaging with bleed-ready output.',
    capabilities: [
      'Print-ready PDF output',
      'Merch mockup generation',
      'Packaging dieline templates',
    ],
  },
  {
    id: 'creative-music-video',
    suite: 'creative',
    name: 'Music Video Production',
    icon: '🎥',
    description: 'Concept, shot list, and editing for music videos — including AI-generated B-roll.',
    capabilities: [
      'Generate shot list from song mood',
      'AI B-roll generation',
      'Beat-synced editing',
    ],
  },

  // ─── S7: PRODUCTIVITY SUITE (10 extensions) ────────────────────────────
  {
    id: 'prod-crm',
    suite: 'productivity',
    name: 'CRM',
    icon: '🫂',
    description: 'Track contacts, deals, and relationships in one place — built for humans, not enterprises.',
    capabilities: [
      'Contact and company management',
      'Pipeline and deal tracking',
      'Email and meeting history per contact',
    ],
  },
  {
    id: 'prod-tasks',
    suite: 'productivity',
    name: 'Task Management',
    icon: '✅',
    description: 'To-dos, projects, and recurring tasks with smart prioritization.',
    capabilities: [
      'Natural-language task entry',
      'Auto-prioritization by deadline and impact',
      'Recurring task templates',
    ],
  },
  {
    id: 'prod-calendar',
    suite: 'productivity',
    name: 'Calendar',
    icon: '📆',
    description: 'Schedule management with smart scheduling and conflict detection.',
    capabilities: [
      'Two-way Google / Outlook sync',
      'Smart scheduling by energy and timezone',
      'Auto-buffer between meetings',
    ],
  },
  {
    id: 'prod-email',
    suite: 'productivity',
    name: 'Email Management',
    icon: '📨',
    description: 'Inbox triage, draft replies, and follow-up tracking — Holly handles the pile.',
    capabilities: [
      'Auto-triage inbox by importance',
      'Draft replies in your voice',
      'Track awaiting-reply threads',
    ],
  },
  {
    id: 'prod-notes',
    suite: 'productivity',
    name: 'Notes',
    icon: '📝',
    description: 'Linked, searchable notes with backlinks and auto-tagging.',
    capabilities: [
      'Bidirectional linking',
      'Auto-tag and categorize',
      'Full-text + semantic search',
    ],
  },
  {
    id: 'prod-documents',
    suite: 'productivity',
    name: 'Documents',
    icon: '📄',
    description: 'Long-form docs with Holly as co-author — proposals, specs, SOPs.',
    capabilities: [
      'Templates for common doc types',
      'Inline AI rewrite and expand',
      'Version history',
    ],
  },
  {
    id: 'prod-meeting-notes',
    suite: 'productivity',
    name: 'Meeting Notes',
    icon: '🗓️',
    description: 'Auto-transcribe meetings, extract action items, and send follow-ups.',
    capabilities: [
      'Record and transcribe any meeting',
      'Auto-extract action items and decisions',
      'Send follow-up emails automatically',
    ],
  },
  {
    id: 'prod-time-tracking',
    suite: 'productivity',
    name: 'Time Tracking',
    icon: '⏱️',
    description: 'Track time per project, client, and task — with auto-detection from your calendar.',
    capabilities: [
      'Auto-track from calendar events',
      'Per-project rates and billing',
      'Weekly time reports',
    ],
  },
  {
    id: 'prod-goals',
    suite: 'productivity',
    name: 'Goals',
    icon: '🎯',
    description: 'OKRs and personal goals with weekly check-ins and momentum tracking.',
    capabilities: [
      'Cascade org goals to personal goals',
      'Weekly check-in reminders',
      'Momentum and at-risk indicators',
    ],
  },
  {
    id: 'prod-workflow-automation',
    suite: 'productivity',
    name: 'Workflow Automation',
    icon: '⚙️',
    description: 'Connect your tools and automate repetitive work — Holly as your Zapier.',
    capabilities: [
      'No-code automation builder',
      '100+ app integrations',
      'AI-suggested automations from your patterns',
    ],
  },

  // ─── S8: RESEARCH SUITE (10 extensions) ────────────────────────────────
  {
    id: 'research-web-search',
    suite: 'research',
    name: 'Web Search',
    icon: '🌐',
    description: 'Comprehensive web search with source quality scoring and synthesis.',
    capabilities: [
      'Multi-engine search (Google, Bing, DuckDuckGo)',
      'Source credibility scoring',
      'Synthesized answers with citations',
    ],
  },
  {
    id: 'research-academic',
    suite: 'research',
    name: 'Academic Papers',
    icon: '🎓',
    description: 'Search arXiv, PubMed, Semantic Scholar, and Google Scholar — with summaries.',
    capabilities: [
      'Cross-archive paper search',
      'Auto-summarize abstracts',
      'Citation graph exploration',
    ],
  },
  {
    id: 'research-market',
    suite: 'research',
    name: 'Market Research',
    icon: '📈',
    description: 'TAM/SAM/SOM, competitive landscape, and customer interview synthesis.',
    capabilities: [
      'Generate market sizing models',
      'Competitor feature matrices',
      'Interview transcript synthesis',
    ],
  },
  {
    id: 'research-data-analysis',
    suite: 'research',
    name: 'Data Analysis',
    icon: '📊',
    description: 'Clean, analyze, and visualize any dataset — CSV, SQL, or API.',
    capabilities: [
      'Auto-clean messy datasets',
      'Generate charts and dashboards',
      'Statistical analysis in plain English',
    ],
  },
  {
    id: 'research-patent',
    suite: 'research',
    name: 'Patent Research',
    icon: '📜',
    description: 'Search USPTO, EPO, and WIPO — with plain-English patent summaries.',
    capabilities: [
      'Prior-art searches',
      'Patent landscape mapping',
      'Auto-decode legal language',
    ],
  },
  {
    id: 'research-news',
    suite: 'research',
    name: 'News Aggregation',
    icon: '📰',
    description: 'Curated news feeds by topic, with bias detection across sources.',
    capabilities: [
      'Topic-specific feeds',
      'Bias-balanced source selection',
      'Daily digest emails',
    ],
  },
  {
    id: 'research-surveys',
    suite: 'research',
    name: 'Surveys',
    icon: '📋',
    description: 'Design, field, and analyze surveys — with automatic insight extraction.',
    capabilities: [
      'Survey templates for common research questions',
      'Field via email, web, or social',
      'Auto-extract insights from responses',
    ],
  },
  {
    id: 'research-industry-reports',
    suite: 'research',
    name: 'Industry Reports',
    icon: '📌',
    description: 'Generate full industry reports — trends, forecasts, key players.',
    capabilities: [
      'Templated reports per industry',
      'Auto-update with new data',
      'Export to PDF and Notion',
    ],
  },
  {
    id: 'research-swot',
    suite: 'research',
    name: 'SWOT Analysis',
    icon: '🧭',
    description: 'Strengths, weaknesses, opportunities, threats — for any company, product, or idea.',
    capabilities: [
      'Templated SWOT generation',
      'Compare multiple companies side-by-side',
      'Track changes over time',
    ],
  },
  {
    id: 'research-sentiment',
    suite: 'research',
    name: 'Sentiment Analysis',
    icon: '💗',
    description: 'Analyze sentiment in social, reviews, and news for any brand or topic.',
    capabilities: [
      'Real-time sentiment tracking',
      'Aspect-level analysis (price, quality, service)',
      'Alert on sentiment shifts',
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// CATALOG ACCESSORS
// ═══════════════════════════════════════════════════════════════════════════

/** Index the catalog by id for O(1) lookups */
const CATALOG_INDEX: Map<string, ExtensionManifest> = new Map(
  EXTENSION_CATALOG.map((ext) => [ext.id, ext]),
);

/** Get a single extension by id, or undefined if not found. */
export function getExtensionById(id: string): ExtensionManifest | undefined {
  return CATALOG_INDEX.get(id);
}

/** Get all extensions in a given suite, sorted by name. */
export function getExtensionsBySuite(suite: ExtensionSuite): ExtensionManifest[] {
  return EXTENSION_CATALOG
    .filter((ext) => ext.suite === suite)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Count of extensions per suite — useful for marketplace UI headers. */
export function getSuiteCounts(): Record<ExtensionSuite, number> {
  const counts = Object.fromEntries(ALL_SUITES.map((s) => [s, 0])) as Record<ExtensionSuite, number>;
  for (const ext of EXTENSION_CATALOG) {
    counts[ext.suite]++;
  }
  return counts;
}

/** Throws if the catalog has any duplicate IDs — run in tests. */
export function validateCatalogUniqueIds(): void {
  const seen = new Set<string>();
  for (const ext of EXTENSION_CATALOG) {
    if (seen.has(ext.id)) {
      throw new Error(`Duplicate extension id: ${ext.id}`);
    }
    seen.add(ext.id);
  }
}
