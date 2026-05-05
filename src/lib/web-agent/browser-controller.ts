/**
 * Browser Controller — Two-tier web automation
 *
 * Tier 1 (always available): fetch + HTML parsing for static sites
 * Tier 2 (optional):         Playwright for JS-heavy sites, screenshots, clicks
 *
 * Falls back gracefully — Tier 2 only activates if `playwright` is installed.
 */

export interface NavigateOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
}

export interface BrowserSession {
  id: string;
  url: string | null;
  html: string | null;
  title: string | null;
  text: string | null;
  createdAt: Date;
  lastActivity: Date;
  pwBrowser: any | null;
  pwPage: any | null;
}

export class BrowserController {
  private sessions: Map<string, BrowserSession> = new Map();
  private sessionTimeout = 30 * 60 * 1000;
  private playwrightAvailable: boolean | null = null;
  private pwModule: any = null;

  constructor() {
    setInterval(() => this.cleanupInactiveSessions(), 5 * 60 * 1000);
  }

  private async checkPlaywright(): Promise<boolean> {
    if (this.playwrightAvailable !== null) return this.playwrightAvailable;
    try {
      this.pwModule = await new Function('module', `return import(module)`)('playwright');
      this.playwrightAvailable = true;
      console.log('[BrowserController] Playwright available — full automation enabled');
    } catch {
      this.playwrightAvailable = false;
      console.log('[BrowserController] Playwright not installed — using fetch-based mode');
    }
    return this.playwrightAvailable;
  }

  async createSession(sessionId: string): Promise<void> {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`);
    }

    const session: BrowserSession = {
      id: sessionId,
      url: null,
      html: null,
      title: null,
      text: null,
      createdAt: new Date(),
      lastActivity: new Date(),
      pwBrowser: null,
      pwPage: null,
    };

    this.sessions.set(sessionId, session);
  }

  async navigate(
    sessionId: string,
    url: string,
    options: NavigateOptions = {}
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    const hasPlaywright = await this.checkPlaywright();

    if (hasPlaywright && this.pwModule) {
      try {
        if (!session.pwBrowser) {
          session.pwBrowser = await this.pwModule.chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          });
          const context = await session.pwBrowser.newContext({
            viewport: { width: 1920, height: 1080 },
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          });
          session.pwPage = await context.newPage();
        }

        await session.pwPage.goto(url, {
          waitUntil: options.waitUntil || 'domcontentloaded',
          timeout: options.timeout || 30000,
        });

        session.html = await session.pwPage.content();
        session.title = await session.pwPage.title();
        session.text = await session.pwPage.evaluate(() => document.body?.innerText || '');
        session.url = session.pwPage.url();
      } catch (pwErr: any) {
        console.warn(`[BrowserController] Playwright failed, falling back to fetch: ${pwErr.message}`);
        await this.navigateFetch(session, url);
      }
    } else {
      await this.navigateFetch(session, url);
    }

    session.lastActivity = new Date();
  }

  private async navigateFetch(session: BrowserSession, url: string): Promise<void> {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);

    session.html = await res.text();
    session.url = url;

    session.title = session.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';

    const bodyMatch = session.html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    const rawHtml = bodyMatch?.[1] || session.html;
    session.text = rawHtml
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#\d+;/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async extractText(
    sessionId: string,
    selector?: string
  ): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (session.pwPage) {
      if (selector) {
        const el = await session.pwPage.$(selector);
        return el ? (await el.textContent()) || '' : '';
      }
      return session.text || '';
    }

    if (!selector || selector === 'body') return session.text || '';

    const html = session.html || '';
    const re = new RegExp(`<[^>]+(?:class|id)=["'][^"']*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"']*["'][^>]*>([\\s\\S]*?)<`, 'gi');
    const matches = [...html.matchAll(re)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
    return matches.join('\n') || session.text || '';
  }

  async extractAttribute(
    sessionId: string,
    selector: string,
    attribute: string
  ): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (session.pwPage) {
      const el = await session.pwPage.$(selector);
      return el ? await el.getAttribute(attribute) : null;
    }

    const re = new RegExp(`<[^>]+(?:class|id)=["'][^"']*${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^"']*["'][^>]*${attribute}=["']([^"']*)["']`, 'i');
    return session.html?.match(re)?.[1] || null;
  }

  async extractLinks(sessionId: string): Promise<Array<{ text: string; href: string }>> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (session.pwPage) {
      return session.pwPage.evaluate(() =>
        Array.from(document.querySelectorAll('a[href]')).map(a => ({
          text: (a as HTMLAnchorElement).textContent?.trim() || '',
          href: (a as HTMLAnchorElement).href,
        })).filter(l => l.text && l.href)
      );
    }

    const linkRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
    const links: Array<{ text: string; href: string }> = [];
    let match;
    while ((match = linkRegex.exec(session.html || '')) !== null) {
      const text = match[2].replace(/<[^>]+>/g, '').trim();
      if (text) links.push({ text, href: match[1] });
    }
    return links;
  }

  async click(sessionId: string, selector: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (session.pwPage) {
      await session.pwPage.click(selector);
      session.html = await session.pwPage.content();
      session.text = await session.pwPage.evaluate(() => document.body?.innerText || '');
      session.url = session.pwPage.url();
      session.lastActivity = new Date();
      return;
    }

    throw new Error('Click requires Playwright — install with: npm install playwright');
  }

  async fill(sessionId: string, selector: string, value: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (session.pwPage) {
      await session.pwPage.fill(selector, value);
      session.lastActivity = new Date();
      return;
    }

    throw new Error('Form filling requires Playwright — install with: npm install playwright');
  }

  async screenshot(
    sessionId: string,
    fullPage = false
  ): Promise<Buffer> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (session.pwPage) {
      const buffer = await session.pwPage.screenshot({ fullPage, type: 'png' });
      session.lastActivity = new Date();
      return Buffer.from(buffer);
    }

    throw new Error('Screenshots require Playwright — install with: npm install playwright');
  }

  async evaluate<T>(sessionId: string, script: string): Promise<T> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    if (session.pwPage) {
      const result = await session.pwPage.evaluate(script);
      session.lastActivity = new Date();
      return result as T;
    }

    throw new Error('JavaScript evaluation requires Playwright — install with: npm install playwright');
  }

  async getUrl(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    return session.pwPage?.url() || session.url || '';
  }

  async getTitle(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);
    if (session.pwPage) return await session.pwPage.title();
    return session.title || '';
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    if (session.pwBrowser) await session.pwBrowser.close();
    this.sessions.delete(sessionId);
  }

  private async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastActivity.getTime() > this.sessionTimeout) {
        console.log(`[BrowserController] Cleaning up inactive session: ${id}`);
        await this.closeSession(id);
      }
    }
  }

  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}

export const browserController = new BrowserController();
