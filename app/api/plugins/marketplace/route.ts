/**
 * GET /api/plugins/marketplace — Browse available plugins
 */
import { NextResponse } from 'next/server';
import { pluginManager } from '@/lib/plugins/plugin-manager';

export async function GET() {
  try {
    const marketplace = pluginManager.getMarketplace();

    // Group by category
    const byCategory: Record<string, typeof marketplace> = {};
    for (const entry of marketplace) {
      if (!byCategory[entry.category]) {
        byCategory[entry.category] = [];
      }
      byCategory[entry.category].push(entry);
    }

    return NextResponse.json({
      plugins: marketplace,
      categories: byCategory,
      total: marketplace.length,
    });
  } catch (error) {
    console.error('[Plugins Marketplace] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
