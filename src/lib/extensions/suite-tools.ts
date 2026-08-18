/**
 * Roadmap C2 (2026-08-12): Extension install = real capability activation.
 *
 * Maps each extension suite to the concrete MCP tool names it unlocks in
 * Holly's chat. The chat route unions these into the mode tool filter for
 * every enabled extension the user has installed.
 *
 * Tool names here MUST exist in the MCP hub registry (they are filtered
 * against mcpManager.getAllTools(), so unknown names are silently no-ops —
 * but keep this list accurate so installed extensions genuinely grant power).
 */

import { prisma } from '@/lib/db';
import type { ExtensionSuite } from '@/lib/extensions/catalog';
import { getExtensionById } from '@/lib/extensions/catalog';

// ─── Suite → tool grants ────────────────────────────────────────────────────
//
// Baseline (every user, 'default' mode) already includes GitHub self-edit,
// web sense, code-gen, taste, temporal, collab, project tools. Suites ADD
// the specialized tools that aren't in the default set.

export const SUITE_TOOLS: Record<ExtensionSuite, string[]> = {
  developer: [
    'sentinel_analyze_code',      // deep static analysis
    'sentinel_generate_code',     // AI code generation
    'run_code',                   // execute code
    'start_build',                // builder agent pipeline
    'local_read_file',            // workspace file access
    'local_write_file',
    'run_project_tests',          // run test suite
    'check_build_status',
    'self_code_apply',            // self-code changes
    'trigger_deploy',
  ],
  music: [
    'generate_music',             // music generation chain
    'hybrid_studio',              // Suno + Sonauto hybrid
    'aura_ar_analyze',            // A&R song analysis
    'aura_quick_rate',
    'aura_analyze_song',
  ],
  creative: [
    'generate_image',             // general image gen
    'create_holly_media',         // Holly self-media (gated)
  ],
  web: [
    'web_browse',                 // deep browsing beyond default search
    'web_screenshot',
  ],
  research: [
    'web_deep_search',            // comprehensive multi-source search
    'web_browse',
    'memory_write',               // save findings to memory
  ],
  business: [
    'project_create',             // project lifecycle w/ briefs + roadmaps
    'project_generate_brief',
    'project_generate_roadmap',
    'monitoring_check_uptime',
  ],
  social: [
    'web_deep_search',            // audience/creator research
    'taste_get_profile',
  ],
  productivity: [
    'temporal_start_session',     // session tracking
    'temporal_end_session',
    'temporal_generate_insights',
    'temporal_get_pending_insights',
  ],
};

export interface ActiveExtensionInfo {
  suite: ExtensionSuite;
  extensionId: string;
  name: string;
  capabilities: string[];
}

/**
 * Load the user's enabled installed extensions with manifest data.
 * Returns [] on any failure — extensions must never break chat.
 */
export async function getActiveExtensions(dbUserId: string): Promise<ActiveExtensionInfo[]> {
  try {
    const rows = await prisma.userExtension.findMany({
      where: { userId: dbUserId, enabled: true },
      select: { extensionId: true, suite: true },
    });

    const active: ActiveExtensionInfo[] = [];
    for (const row of rows) {
      const manifest = getExtensionById(row.extensionId);
      if (!manifest) continue; // catalog drifted — skip unknown ids
      active.push({
        suite: manifest.suite,
        extensionId: manifest.id,
        name: manifest.name,
        capabilities: manifest.capabilities,
      });
    }
    return active;
  } catch (err) {
    console.warn('[extensions] failed to load active extensions:', err);
    return [];
  }
}

/**
 * The set of MCP tool names granted by the user's enabled extensions.
 */
export async function getExtensionToolGrants(dbUserId: string): Promise<Set<string>> {
  const active = await getActiveExtensions(dbUserId);
  const grants = new Set<string>();
  for (const ext of active) {
    for (const tool of SUITE_TOOLS[ext.suite] ?? []) {
      grants.add(tool);
    }
  }
  return grants;
}

/**
 * Prompt block telling Holly which extensions are active — so she knows
 * what she can do, not just has the tools registered.
 */
export function buildExtensionPromptBlock(active: ActiveExtensionInfo[]): string {
  if (active.length === 0) return '';

  const lines = active.map(
    (e) => `- ${e.name}: ${e.capabilities.slice(0, 2).join('; ')}`
  );
  return `\n\n[ACTIVE EXTENSIONS — you have these capabilities]\n${lines.join('\n')}`;
}
