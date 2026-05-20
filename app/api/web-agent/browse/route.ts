/**
 * Web Sense Browse API Route
 *
 * Navigate to any URL and extract content using BrowserController.
 * Two tiers: fetch-based (always works) and Playwright (for JS-heavy sites, if installed).
 */
import { NextRequest, NextResponse } from 'next/server';
import { browserController } from '@/lib/web-agent/browser-controller';
import { taskExecutor } from '@/lib/web-agent/task-executor';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';

// Track active browser sessions (cleaned up after 30 min inactivity)
const sessions = new Map<string, { createdAt: number; lastActivity: number }>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, url, sessionId, selector, attribute, value, script, fullPage, waitUntil, timeout } = body;

    // Create a new browser session
    if (action === 'create_session') {
      const id = sessionId || nanoid();
      await browserController.createSession(id);
      sessions.set(id, { createdAt: Date.now(), lastActivity: Date.now() });
      return NextResponse.json({ success: true, sessionId: id });
    }

    // Close a browser session
    if (action === 'close_session') {
      if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
      await browserController.closeSession(sessionId);
      sessions.delete(sessionId);
      return NextResponse.json({ success: true });
    }

    // Navigate to URL
    if (action === 'navigate') {
      if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
      const id = sessionId || nanoid();
      if (!sessions.has(id)) {
        await browserController.createSession(id);
        sessions.set(id, { createdAt: Date.now(), lastActivity: Date.now() });
      }
      const result = await taskExecutor.executeNavigate(id, url, `Navigate to ${url}`);
      if (result.success) {
        // Also extract text content
        const text = await browserController.extractText(id);
        const links = await browserController.extractLinks(id);
        const title = await browserController.getTitle(id);
        const currentUrl = await browserController.getUrl(id);
        sessions.set(id, { ...sessions.get(id)!, lastActivity: Date.now() });
        return NextResponse.json({
          success: true,
          sessionId: id,
          data: {
            url: currentUrl,
            title,
            text: text.substring(0, 15000), // Cap text output
            textLength: text.length,
            links: links.slice(0, 50),
            linkCount: links.length,
          },
        });
      }
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    // Extract text from current page
    if (action === 'extract_text') {
      if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
      const text = await browserController.extractText(sessionId, selector);
      sessions.set(sessionId, { ...sessions.get(sessionId)!, lastActivity: Date.now() });
      return NextResponse.json({ success: true, text: text.substring(0, 15000), textLength: text.length });
    }

    // Extract links
    if (action === 'extract_links') {
      if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
      const links = await browserController.extractLinks(sessionId);
      return NextResponse.json({ success: true, links: links.slice(0, 100), count: links.length });
    }

    // Click element
    if (action === 'click') {
      if (!sessionId || !selector) return NextResponse.json({ error: 'sessionId and selector required' }, { status: 400 });
      const result = await taskExecutor.executeInteract(sessionId, 'click', selector);
      return NextResponse.json({ success: result.success, error: result.error });
    }

    // Fill form field
    if (action === 'fill') {
      if (!sessionId || !selector || !value) return NextResponse.json({ error: 'sessionId, selector, and value required' }, { status: 400 });
      const result = await taskExecutor.executeInteract(sessionId, 'fill', selector, value);
      return NextResponse.json({ success: result.success, error: result.error });
    }

    // Take screenshot
    if (action === 'screenshot') {
      if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
      const result = await taskExecutor.executeScreenshot(sessionId, 'Screenshot', fullPage || false);
      if (result.success) {
        return NextResponse.json({
          success: true,
          screenshot: result.screenshot,
          mimeType: 'image/png',
        });
      }
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    // Execute JavaScript
    if (action === 'evaluate') {
      if (!sessionId || !script) return NextResponse.json({ error: 'sessionId and script required' }, { status: 400 });
      const result = await taskExecutor.executeCustom(sessionId, script, 'Custom JS execution');
      return NextResponse.json({ success: result.success, data: result.data, error: result.error });
    }

    // Quick fetch — no session needed, just grab page text
    if (action === 'quick_fetch') {
      if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 });
      const id = nanoid();
      await browserController.createSession(id);
      try {
        await browserController.navigate(id, url, { waitUntil: waitUntil || 'domcontentloaded', timeout: timeout || 15000 });
        const text = await browserController.extractText(id);
        const title = await browserController.getTitle(id);
        const links = await browserController.extractLinks(id);
        return NextResponse.json({
          success: true,
          data: { url, title, text: text.substring(0, 15000), textLength: text.length, links: links.slice(0, 30), linkCount: links.length },
        });
      } finally {
        await browserController.closeSession(id);
      }
    }

    return NextResponse.json({ error: `Unknown action: ${action}. Valid: create_session, close_session, navigate, extract_text, extract_links, click, fill, screenshot, evaluate, quick_fetch` }, { status: 400 });
  } catch (error: any) {
    console.error('[Web Browse] Error:', error);
    return NextResponse.json({ error: error.message || 'Browse failed' }, { status: 500 });
  }
}
