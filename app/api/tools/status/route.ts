/**
 * GET /api/tools/status
 *
 * Returns the list of currently-loaded MCP tools, grouped by category.
 * Useful for dashboards, debugging, and verifying Phase 4A deployment.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { mcpManager } from '@/lib/mcp/mcp-client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOOL_GROUPS: Record<string, string[]> = {
  'GitHub': ['github_read_file', 'github_list_files', 'github_create_or_update_file', 'github_create_pr', 'github_create_issue', 'github_list_prs'],
  'Web Intelligence': ['web_search', 'web_scrape'],
  'Code Execution': ['run_code', 'run_code_judge0'],
  'Memory / Knowledge': ['memory_write', 'memory_read', 'memory_list_keys'],
  'Creative / Utility': ['generate_image', 'get_weather'],
};

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Ensure MCP is connected
    await mcpManager.ensureHollyTools();
    const tools = await mcpManager.getAllTools();
    const isConnected = tools.length > 0;

    // Group tools
    const grouped: Record<string, any[]> = {};
    for (const [group, names] of Object.entries(TOOL_GROUPS)) {
      grouped[group] = names.map(name => {
        const live = tools.find(t => t.name === name);
        return {
          name,
          available: !!live,
          description: live?.description || 'Not loaded',
        };
      });
    }

    return NextResponse.json({
      connected: isConnected,
      totalTools: tools.length,
      phase: '4A',
      groups: grouped,
      raw: tools.map(t => ({ name: t.name, serverId: t.serverId })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch tool status', detail: String(error) },
      { status: 500 }
    );
  }
}
