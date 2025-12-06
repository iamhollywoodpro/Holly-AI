/**
 * PHASE 8: Web Browser Module
 * Provides web page browsing, scraping, and content extraction
 */

import { prisma } from '@/lib/db';

// ===========================
// TypeScript Interfaces
// ===========================

export interface BrowseOptions {
  timeout?: number; // milliseconds
  headers?: Record<string, string>;
  followRedirects?: boolean;
}

export interface BrowseResult {
  success: boolean;
  url: string;
  status?: number;
  html?: string;
  text?: string;
  title?: string;
  meta?: Record<string, string>;
  error?: string;
  duration: number; // milliseconds
}

export interface ScrapeSelector {
  selector: string;
  attribute?: string; // If specified, extract attribute instead of text
  multiple?: boolean; // Return array if true
}

export interface ScrapeOptions {
  selectors: Record<string, ScrapeSelector>;
  timeout?: number;
}

export interface ScrapedData {
  success: boolean;
  url: string;
  data: Record<string, any>;
  error?: string;
  duration: number;
}

export interface ExtractOptions {
  contentType?: 'text' | 'html' | 'markdown' | 'json';
  timeout?: number;
}

export interface ExtractedContent {
  success: boolean;
  url: string;
  content: string;
  contentType: string;
  error?: string;
  duration: number;
}

// ===========================
// Core Functions
// ===========================

/**
 * Browse a web page and return its content
 */
export async function browseWeb(
  url: string,
  options?: BrowseOptions
): Promise<BrowseResult> {
  const startTime = Date.now();
  
  try {
    // Validate URL
    const parsedUrl = new URL(url);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Only HTTP and HTTPS protocols are supported');
    }

    // Set default options
    const timeout = options?.timeout || 30000; // 30 seconds default
    const headers = {
      'User-Agent': 'Mozilla/5.0 (compatible; HOLLY-AI/1.0)',
      ...options?.headers
    };

    // Fetch the page
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: 'GET',
      headers,
      redirect: options?.followRedirects !== false ? 'follow' : 'manual',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Get HTML content
    const html = await response.text();
    
    // Extract basic meta information
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    // Extract meta tags
    const meta: Record<string, string> = {};
    const metaRegex = /<meta\s+[^>]*name=["']([^"']+)["'][^>]*content=["']([^"']+)["']/gi;
    let metaMatch;
    while ((metaMatch = metaRegex.exec(html)) !== null) {
      meta[metaMatch[1]] = metaMatch[2];
    }

    const duration = Date.now() - startTime;

    // Log the browse operation
    await prisma.webBrowseLog.create({
      data: {
        url,
        action: 'browse',
        success: true,
        duration
      }
    });

    return {
      success: true,
      url,
      status: response.status,
      html,
      text: html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
      title,
      meta,
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failed operation
    await prisma.webBrowseLog.create({
      data: {
        url,
        action: 'browse',
        success: false,
        duration,
        error: errorMessage
      }
    });

    return {
      success: false,
      url,
      error: errorMessage,
      duration
    };
  }
}

/**
 * Scrape specific data from a web page using selectors
 */
export async function scrapeData(
  url: string,
  options: ScrapeOptions
): Promise<ScrapedData> {
  const startTime = Date.now();

  try {
    // First, browse the page
    const browseResult = await browseWeb(url, { timeout: options.timeout });
    
    if (!browseResult.success || !browseResult.html) {
      throw new Error(browseResult.error || 'Failed to fetch page');
    }

    const html = browseResult.html;
    const data: Record<string, any> = {};

    // Parse each selector
    for (const [key, selector] of Object.entries(options.selectors)) {
      try {
        // Simple regex-based selector parsing (basic implementation)
        // For production, consider using a proper HTML parser like cheerio
        const pattern = selector.selector.replace(/\./g, '\\.').replace(/\[/g, '\\[');
        
        if (selector.multiple) {
          // Find all matches
          const matches: string[] = [];
          const regex = new RegExp(`<[^>]*class=["\']([^"']*${pattern}[^"']*)["'][^>]*>([^<]*)</`, 'gi');
          let match;
          while ((match = regex.exec(html)) !== null) {
            matches.push(match[2].trim());
          }
          data[key] = matches;
        } else {
          // Find first match
          const regex = new RegExp(`<[^>]*class=["\']([^"']*${pattern}[^"']*)["'][^>]*>([^<]*)</`, 'i');
          const match = html.match(regex);
          data[key] = match ? match[2].trim() : null;
        }
      } catch (selectorError) {
        data[key] = null;
      }
    }

    const duration = Date.now() - startTime;

    // Log scrape operation
    await prisma.webBrowseLog.create({
      data: {
        url,
        action: 'scrape',
        success: true,
        duration
      }
    });

    return {
      success: true,
      url,
      data,
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failed operation
    await prisma.webBrowseLog.create({
      data: {
        url,
        action: 'scrape',
        success: false,
        duration,
        error: errorMessage
      }
    });

    return {
      success: false,
      url,
      data: {},
      error: errorMessage,
      duration
    };
  }
}

/**
 * Extract clean content from a web page
 */
export async function extractContent(
  url: string,
  options?: ExtractOptions
): Promise<ExtractedContent> {
  const startTime = Date.now();

  try {
    // Browse the page
    const browseResult = await browseWeb(url, { timeout: options?.timeout });
    
    if (!browseResult.success || !browseResult.html) {
      throw new Error(browseResult.error || 'Failed to fetch page');
    }

    const html = browseResult.html;
    const contentType = options?.contentType || 'text';
    let content: string;

    switch (contentType) {
      case 'html':
        content = html;
        break;
      
      case 'text':
        // Remove scripts, styles, and HTML tags
        content = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        break;
      
      case 'markdown':
        // Basic HTML to Markdown conversion
        content = html
          .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
          .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
          .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
          .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
          .replace(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
          .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
          .replace(/<[^>]*>/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        break;
      
      case 'json':
        // Return structured data
        content = JSON.stringify({
          title: browseResult.title,
          url,
          text: browseResult.text,
          meta: browseResult.meta
        }, null, 2);
        break;
      
      default:
        content = browseResult.text || '';
    }

    const duration = Date.now() - startTime;

    // Log extract operation
    await prisma.webBrowseLog.create({
      data: {
        url,
        action: 'extract',
        success: true,
        duration
      }
    });

    return {
      success: true,
      url,
      content,
      contentType,
      duration
    };

  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log failed operation
    await prisma.webBrowseLog.create({
      data: {
        url,
        action: 'extract',
        success: false,
        duration,
        error: errorMessage
      }
    });

    return {
      success: false,
      url,
      content: '',
      contentType: options?.contentType || 'text',
      error: errorMessage,
      duration
    };
  }
}
