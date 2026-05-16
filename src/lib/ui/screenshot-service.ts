/**
 * Screenshot Service — Two-tier screenshot capture
 *
 * Tier 1 (always available): Cloud screenshot API (thum.io — free, no key)
 * Tier 2 (optional):         Playwright for local/headless screenshots
 *
 * Holly uses this to "see" her own UI and analyze it for improvements.
 */

export interface ScreenshotResult {
  success: boolean;
  buffer?: Buffer;        // PNG image data
  base64?: string;        // Base64-encoded PNG
  url: string;
  method: 'cloud' | 'playwright' | 'fetch';
  error?: string;
  timestamp: string;
}

export interface ScreenshotOptions {
  url: string;
  width?: number;         // Viewport width (default: 1280)
  height?: number;        // Viewport height (default: 800)
  fullPage?: boolean;     // Capture full scrollable page
  format?: 'png' | 'jpeg';
  quality?: number;       // JPEG quality (1-100)
}

/**
 * Take a screenshot using the best available method.
 */
export async function takeScreenshot(opts: ScreenshotOptions): Promise<ScreenshotResult> {
  const timestamp = new Date().toISOString();

  // Try Playwright first (highest quality, no network dependency)
  const pwResult = await tryPlaywrightScreenshot(opts);
  if (pwResult.success) return pwResult;

  // Fall back to cloud API
  const cloudResult = await tryCloudScreenshot(opts);
  if (cloudResult.success) return cloudResult;

  // Last resort: fetch HTML (no screenshot, but Holly can read the page)
  return {
    success: false,
    url: opts.url,
    method: 'fetch',
    error: 'All screenshot methods failed',
    timestamp,
  };
}

/**
 * Tier 2: Playwright screenshot (if installed)
 */
async function tryPlaywrightScreenshot(opts: ScreenshotOptions): Promise<ScreenshotResult> {
  const timestamp = new Date().toISOString();
  try {
    // Dynamic import — Playwright is optional, may not be installed
    const pw = await new Function('module', 'return import(module)')('playwright');
    const browser = await pw.chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    });

    const page = await browser.newPage({
      viewport: {
        width: opts.width ?? 1280,
        height: opts.height ?? 800,
      },
    });

    await page.goto(opts.url, { waitUntil: 'networkidle', timeout: 30000 });
    const buffer = await page.screenshot({
      fullPage: opts.fullPage ?? false,
      type: opts.format ?? 'png',
      quality: opts.format === 'jpeg' ? (opts.quality ?? 80) : undefined,
    });

    await browser.close();

    return {
      success: true,
      buffer: Buffer.from(buffer),
      base64: Buffer.from(buffer).toString('base64'),
      url: opts.url,
      method: 'playwright',
      timestamp,
    };
  } catch (err: any) {
    return {
      success: false,
      url: opts.url,
      method: 'playwright',
      error: err.message || 'Playwright not available',
      timestamp,
    };
  }
}

/**
 * Tier 1: Cloud screenshot API (thum.io — free, no API key)
 */
async function tryCloudScreenshot(opts: ScreenshotOptions): Promise<ScreenshotResult> {
  const timestamp = new Date().toISOString();
  try {
    // thum.io — free screenshot API, no key needed
    const width = opts.width ?? 1280;
    const params: string[] = [`width/${width}`];
    if (opts.fullPage) params.push('allowJSErrors');
    if (opts.height) params.push(`crop/${opts.height}`);

    const screenshotUrl = `https://image.thum.io/get/${params.join('/')}/${opts.url}`;

    const res = await fetch(screenshotUrl, {
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      return {
        success: false,
        url: opts.url,
        method: 'cloud',
        error: `Cloud API returned ${res.status}`,
        timestamp,
      };
    }

    const buffer = Buffer.from(await res.arrayBuffer());

    return {
      success: true,
      buffer,
      base64: buffer.toString('base64'),
      url: opts.url,
      method: 'cloud',
      timestamp,
    };
  } catch (err: any) {
    return {
      success: false,
      url: opts.url,
      method: 'cloud',
      error: err.message || 'Cloud screenshot failed',
      timestamp,
    };
  }
}

/**
 * Get Holly's own base URL from environment or default
 */
export function getHollyBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ||
         process.env.NEXT_PUBLIC_BASE_URL ||
         'https://holly.nexamusicgroup.com';
}

/**
 * Take a screenshot of Holly's own page
 */
export async function screenshotSelfPage(path: string = '/'): Promise<ScreenshotResult> {
  const baseUrl = getHollyBaseUrl();
  const url = `${baseUrl}${path}`;
  return takeScreenshot({ url, fullPage: true });
}
