/**
 * Holly Code Review Plugin — Automated code review
 *
 * Detects code snippets in conversations and provides automated
 * review feedback covering style, security, performance, and
 * best practices. Uses LLM-powered analysis for depth.
 */

import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

// ============================================================================
// TYPES
// ============================================================================

export interface CodeSnippet {
  language: string;
  code: string;
  startLine?: number;
}

export interface ReviewFinding {
  type: 'style' | 'security' | 'performance' | 'bug' | 'best-practice';
  severity: 'info' | 'warning' | 'critical';
  line?: number;
  message: string;
  suggestion?: string;
}

export interface CodeReviewResult {
  findings: ReviewFinding[];
  overallScore: number;       // 0-100
  summary: string;
  language: string;
}

// ============================================================================
// CODE REVIEW SERVICE
// ============================================================================

export class CodeReviewService {
  /**
   * Detect if a message contains code snippets.
   */
  detectCode(message: string): CodeSnippet[] {
    const snippets: CodeSnippet[] = [];

    // Match fenced code blocks: ```lang\n...\n```
    const fencedRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    while ((match = fencedRegex.exec(message)) !== null) {
      snippets.push({
        language: match[1] || 'unknown',
        code: match[2].trim(),
      });
    }

    // If no fenced blocks, check for inline code that looks like multi-line
    if (snippets.length === 0) {
      const inlineRegex = /`([^`]{50,})`/g;
      while ((match = inlineRegex.exec(message)) !== null) {
        snippets.push({
          language: 'unknown',
          code: match[1].trim(),
        });
      }
    }

    return snippets;
  }

  /**
   * Review a code snippet using LLM analysis.
   */
  async reviewCode(snippet: CodeSnippet): Promise<CodeReviewResult> {
    try {
      const prompt = `You are an expert code reviewer. Analyze this ${snippet.language} code and provide a structured review.

Code:
\`\`\`${snippet.language}
${snippet.code.slice(0, 2000)}
\`\`\`

Review the code for:
1. Security vulnerabilities
2. Performance issues
3. Bugs or logic errors
4. Style and best practices

Respond with ONLY a JSON object:
{
  "findings": [
    {"type": "security|performance|bug|style|best-practice", "severity": "info|warning|critical", "line": 1, "message": "description", "suggestion": "how to fix"}
  ],
  "score": 85,
  "summary": "brief overall assessment"
}`;

      const routing = await smartRoute(prompt, { taskHint: 'speed' });
      const { text } = await cascadeCollect(
        routing.waterfall,
        [{ role: 'user', content: prompt }],
        { temperature: 0.2, maxTokens: 800 },
      );

      const jsonMatch = (text || '').match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          findings: (parsed.findings || []).map((f: any) => ({
            type: ['style', 'security', 'performance', 'bug', 'best-practice'].includes(f.type) ? f.type : 'style',
            severity: ['info', 'warning', 'critical'].includes(f.severity) ? f.severity : 'info',
            line: typeof f.line === 'number' ? f.line : undefined,
            message: String(f.message || ''),
            suggestion: f.suggestion ? String(f.suggestion) : undefined,
          })),
          overallScore: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 70,
          summary: String(parsed.summary || 'Code review complete.'),
          language: snippet.language,
        };
      }
    } catch (err) {
      console.warn('[CodeReview] LLM analysis failed:', (err as Error).message);
    }

    // Fallback: basic static analysis
    return this.staticAnalysis(snippet);
  }

  /**
   * Quick static analysis fallback (no LLM needed).
   */
  private staticAnalysis(snippet: CodeSnippet): CodeReviewResult {
    const findings: ReviewFinding[] = [];
    const code = snippet.code;

    // Security patterns
    if (/\beval\s*\(/.test(code)) {
      findings.push({ type: 'security', severity: 'critical', message: 'eval() usage detected — potential code injection risk', suggestion: 'Use safer alternatives like JSON.parse() or Function constructor with strict input validation' });
    }
    if (/innerHTML\s*=/.test(code)) {
      findings.push({ type: 'security', severity: 'warning', message: 'Direct innerHTML assignment — XSS risk', suggestion: 'Use textContent or a sanitization library' });
    }
    if (/(?:password|secret|api_key|token)\s*[:=]\s*['"]/.test(code)) {
      findings.push({ type: 'security', severity: 'critical', message: 'Hardcoded secret detected', suggestion: 'Use environment variables for sensitive values' });
    }

    // Performance patterns
    if (/\bfor\s*\([^)]*\)\s*\{[^}]*\.\bpush\(/.test(code) && code.length > 1000) {
      findings.push({ type: 'performance', severity: 'info', message: 'Array.push in loop — consider pre-allocating array size for large datasets' });
    }
    if (/\.forEach\(/.test(code) && /await\s/.test(code)) {
      findings.push({ type: 'performance', severity: 'warning', message: 'async/await inside forEach — errors may not propagate', suggestion: 'Use for...of loop or Promise.all() for async iteration' });
    }

    // Bug detection
    if (/===?\s*null/.test(code) && /===?\s*undefined/.test(code) === false) {
      findings.push({ type: 'bug', severity: 'info', message: 'Checking for null but not undefined — consider using == null to check both' });
    }
    if (/\.length\s*[<>=]/.test(code) && !/\?\s*\.length/.test(code)) {
      findings.push({ type: 'bug', severity: 'info', message: 'Array.length check without null guard — potential crash if array is undefined' });
    }

    // Style
    if (/var\s/.test(code)) {
      findings.push({ type: 'style', severity: 'info', message: 'var keyword detected — prefer const or let', suggestion: 'Use const for values that don\'t change, let for those that do' });
    }
    if (/console\.log/.test(code)) {
      findings.push({ type: 'style', severity: 'info', message: 'console.log found — remove before production' });
    }

    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const warningCount = findings.filter(f => f.severity === 'warning').length;
    const score = Math.max(0, 100 - criticalCount * 20 - warningCount * 10 - findings.length * 2);

    return {
      findings,
      overallScore: score,
      summary: findings.length === 0
        ? 'No obvious issues found in static analysis.'
        : `Found ${findings.length} issues: ${criticalCount} critical, ${warningCount} warnings, ${findings.length - criticalCount - warningCount} info.`,
      language: snippet.language,
    };
  }

  /**
   * Format a review result as a readable message.
   */
  formatReviewResult(result: CodeReviewResult): string {
    const parts: string[] = [];
    const scoreEmoji = result.overallScore >= 80 ? '✅' : result.overallScore >= 60 ? '⚠️' : '❌';

    parts.push(`${scoreEmoji} Code Review (${result.language}) — Score: ${result.overallScore}/100`);
    parts.push(result.summary);

    if (result.findings.length > 0) {
      parts.push('');
      for (const finding of result.findings.slice(0, 8)) {
        const icon = finding.severity === 'critical' ? '🔴' : finding.severity === 'warning' ? '🟡' : 'ℹ️';
        const lineStr = finding.line ? `L${finding.line}: ` : '';
        parts.push(`${icon} **${finding.type}** — ${lineStr}${finding.message}`);
        if (finding.suggestion) {
          parts.push(`   → ${finding.suggestion}`);
        }
      }
      if (result.findings.length > 8) {
        parts.push(`... and ${result.findings.length - 8} more findings`);
      }
    }

    return parts.join('\n');
  }
}

// Export singleton
export const codeReviewService = new CodeReviewService();
