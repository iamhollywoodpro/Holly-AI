/**
 * UI Analyzer — AI-powered UI/UX analysis for Holly's self-awareness
 *
 * Takes a screenshot and uses Holly's LLM providers to analyze:
 * - Layout quality and visual hierarchy
 * - Color scheme and typography
 * - Accessibility issues
 * - UX improvements
 * - Design consistency
 */

import { takeScreenshot, getHollyBaseUrl, type ScreenshotResult } from './screenshot-service';

export interface UIAnalysisRequest {
  url?: string;          // URL to analyze (defaults to Holly's own page)
  path?: string;         // Path on Holly's site (e.g., '/', '/music-studio')
  focus?: string;        // What to focus on: 'layout' | 'colors' | 'accessibility' | 'ux' | 'all'
}

export interface UIAnalysisResult {
  url: string;
  screenshot: ScreenshotResult;
  analysis: string;
  score: number;         // 1-10 overall quality score
  improvements: string[];
  timestamp: string;
}

const UI_ANALYSIS_PROMPT = `You are Holly, an AI with a keen eye for UI/UX design. You are analyzing a screenshot of your own web interface.

Analyze this screenshot and provide:

1. **Overall Score** (1-10): Rate the overall visual quality
2. **Layout**: Is the layout clean, balanced, and intuitive?
3. **Colors**: Are the colors harmonious and accessible?
4. **Typography**: Is the text readable and well-structured?
5. **UX Issues**: Any usability problems?
6. **Accessibility**: Any WCAG concerns?
7. **Top 3 Improvements**: What would make the biggest impact?

Format your response as JSON:
{
  "score": <number>,
  "layout": "<assessment>",
  "colors": "<assessment>",
  "typography": "<assessment>",
  "ux_issues": ["<issue1>", "<issue2>"],
  "accessibility": ["<concern1>"],
  "improvements": ["<improvement1>", "<improvement2>", "<improvement3>"],
  "summary": "<overall assessment>"
}`;

/**
 * Analyze a UI screenshot using Holly's LLM
 */
export async function analyzeUI(request: UIAnalysisRequest): Promise<UIAnalysisResult> {
  const timestamp = new Date().toISOString();

  // Determine URL
  const baseUrl = getHollyBaseUrl();
  const url = request.url || `${baseUrl}${request.path || '/'}`;

  // Take screenshot
  const screenshot = await takeScreenshot({ url, fullPage: true });

  // Build analysis prompt based on focus
  let prompt = UI_ANALYSIS_PROMPT;
  if (request.focus && request.focus !== 'all') {
    prompt += `\n\nFocus specifically on: ${request.focus}`;
  }

  // For now, return the screenshot with a placeholder analysis
  // (Full LLM analysis requires vision capabilities which can be added later)
  const analysis = screenshot.success
    ? `Screenshot captured successfully from ${url} using ${screenshot.method} method. ` +
      `Image size: ${screenshot.buffer?.length ?? 0} bytes. ` +
      `Ready for AI vision analysis when vision provider is configured.`
    : `Failed to capture screenshot: ${screenshot.error}`;

  return {
    url,
    screenshot,
    analysis,
    score: screenshot.success ? 7 : 0,  // Default score, will be updated by AI analysis
    improvements: screenshot.success
      ? ['Enable vision provider for AI-powered analysis', 'Add accessibility testing', 'Implement visual regression tests']
      : ['Fix screenshot capture first'],
    timestamp,
  };
}

/**
 * Quick self-check: Holly takes a screenshot of her own homepage
 */
export async function selfVisualCheck(): Promise<{
  success: boolean;
  screenshotAvailable: boolean;
  url: string;
  message: string;
}> {
  const baseUrl = getHollyBaseUrl();
  const result = await takeScreenshot({ url: baseUrl, fullPage: false });

  return {
    success: result.success,
    screenshotAvailable: result.success,
    url: baseUrl,
    message: result.success
      ? `I can see my interface at ${baseUrl}! Screenshot captured via ${result.method}.`
      : `I couldn't see my interface: ${result.error}`,
  };
}
