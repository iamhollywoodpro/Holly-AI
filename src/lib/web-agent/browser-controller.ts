/**
 * Browser Controller - Manages browser automation with Playwright
 * Provides high-level interface for web scraping and automation
 */

import type { Browser, Page, BrowserContext } from 'playwright';

export interface NavigateOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
}

export interface ScreenshotOptions {
  fullPage?: boolean;
  type?: 'png' | 'jpeg';
  quality?: number;
}

export interface ExtractOptions {
  selector?: string;
  multiple?: boolean;
  attribute?: string;
}

export interface BrowserSession {
  id: string;
  browser: Browser | null;
  context: BrowserContext | null;
  page: Page | null;
  createdAt: Date;
  lastActivity: Date;
}

export class BrowserController {
  private sessions: Map<string, BrowserSession> = new Map();
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  constructor() {
    // Cleanup inactive sessions periodically
    setInterval(() => this.cleanupInactiveSessions(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Create a new browser session
   */
  async createSession(sessionId: string): Promise<void> {
    if (this.sessions.has(sessionId)) {
      throw new Error(`Session ${sessionId} already exists`);
    }

    // Note: Browser initialization will happen on first use
    // This avoids creating browsers during build time
    const session: BrowserSession = {
      id: sessionId,
      browser: null,
      context: null,
      page: null,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.sessions.set(sessionId, session);
  }

  /**
   * Initialize browser for a session (lazy initialization)
   */
  private async initializeBrowser(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.browser) {
      return; // Already initialized
    }

    // Dynamic import to avoid build-time issues
    const { chromium } = await import('playwright');

    session.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    session.context = await session.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    });

    session.page = await session.context.newPage();
    session.lastActivity = new Date();
  }

  /**
   * Navigate to a URL
   */
  async navigate(
    sessionId: string,
    url: string,
    options: NavigateOptions = {}
  ): Promise<void> {
    await this.initializeBrowser(sessionId);
    const session = this.sessions.get(sessionId);
    if (!session?.page) {
      throw new Error(`Session ${sessionId} page not available`);
    }

    await session.page.goto(url, {
      waitUntil: options.waitUntil || 'load',
      timeout: options.timeout || 30000,
    });

    session.lastActivity = new Date();
  }

  /**
   * Extract text content from page
   */
  async extractText(
    sessionId: string,
    options: ExtractOptions = {}
  ): Promise<string | string[]> {
    const session = this.sessions.get(sessionId);
    if (!session?.page) {
      throw new Error(`Session ${sessionId} page not available`);
    }

    const selector = options.selector || 'body';

    if (options.multiple) {
      const elements = await session.page.$$(selector);
      const texts = await Promise.all(
        elements.map((el) => el.textContent())
      );
      session.lastActivity = new Date();
      return texts.filter((t): t is string => t !== null);
    }

    const element = await session.page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    const text = await element.textContent();
    session.lastActivity = new Date();
    return text || '';
  }

  /**
   * Extract attribute value from element
   */
  async extractAttribute(
    sessionId: string,
    selector: string,
    attribute: string
  ): Promise<string | null> {
    const session = this.sessions.get(sessionId);
    if (!session?.page) {
      throw new Error(`Session ${sessionId} page not available`);
    }

    const element = await session.page.$(selector);
    if (!element) {
      throw new Error(`Element not found: ${selector}`);
    }

    const value = await element.getAttribute(attribute);
    session.lastActivity = new Date();
    return value;
  }

  /**
   * Click an element
   */
  async click(sessionId: string, selector: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session?.page) {
      throw new Error(`Session ${sessionId} page not available`);
    }

    await session.page.click(selector);
    session.lastActivity = new Date();
  }

  /**
   * Fill a form field
   */
  async fill(sessionId: string, selector: string, value: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session?.page) {
      throw new Error(`Session ${sessionId} page not available`);
    }

    await session.page.fill(selector, value);
    session.lastActivity = new Date();
  }

  /**
   * Take a screenshot
   */
  async screenshot(
    sessionId: string,
    options: ScreenshotOptions = {}
  ): Promise<Buffer> {
    const session = this.sessions.get(sessionId);
    if (!session?.page) {
      throw new Error(`Session ${sessionId} page not available`);
    }

    const buffer = await session.page.screenshot({
      fullPage: options.fullPage || false,
      type: options.type || 'png',
      quality: options.quality,
    });

    session.lastActivity = new Date();
    return buffer;
  }

  /**
   * Execute JavaScript in page context
   */
  async evaluate<T>(sessionId: string, script: string): Promise<T> {
    const session = this.sessions.get(sessionId);
    if (!session?.page) {
      throw new Error(`Session ${sessionId} page not available`);
    }

    const result = await session.page.evaluate(script);
    session.lastActivity = new Date();
    return result as T;
  }

  /**
   * Wait for a selector to appear
   */
  async waitForSelector(
    sessionId: string,
    selector: string,
    timeout: number = 30000
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session?.page) {
      throw new Error(`Session ${sessionId} page not available`);
    }

    await session.page.waitForSelector(selector, { timeout });
    session.lastActivity = new Date();
  }

  /**
   * Get current page URL
   */
  async getUrl(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session?.page) {
      throw new Error(`Session ${sessionId} page not available`);
    }

    return session.page.url();
  }

  /**
   * Get page title
   */
  async getTitle(sessionId: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session?.page) {
      throw new Error(`Session ${sessionId} page not available`);
    }

    return await session.page.title();
  }

  /**
   * Close a browser session
   */
  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    if (session.browser) {
      await session.browser.close();
    }

    this.sessions.delete(sessionId);
  }

  /**
   * Cleanup inactive sessions
   */
  private async cleanupInactiveSessions(): Promise<void> {
    const now = Date.now();

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactiveTime = now - session.lastActivity.getTime();

      if (inactiveTime > this.sessionTimeout) {
        console.log(`[WebAgent] Cleaning up inactive session: ${sessionId}`);
        await this.closeSession(sessionId);
      }
    }
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }
}

// Singleton instance
export const browserController = new BrowserController();
