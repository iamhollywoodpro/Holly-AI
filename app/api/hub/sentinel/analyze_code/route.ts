/**
 * POST /api/hub/sentinel/analyze_code
 *
 * Analyze code for errors, performance issues, and security vulnerabilities.
 * Auth: Bearer holly_xxxx | x-api-key: holly_xxxx | x-hub-key: <HOLLY_HUB_API_KEY>
 *
 * Required:  { code, language }
 * Optional:  { filename, context, focusAreas }
 * Limit:     20,000 characters per code submission
 */

import { NextRequest, NextResponse } from 'next/server';
import { guardHubRequest, isAuthSuccess } from '@/lib/hub/auth';
import { writeLog, newRequestId, startTimer } from '@/lib/hub/logger';
import { checkHubRateLimit } from '@/lib/hub/rate-limit';
import { analyzeCode } from '@/lib/hub/tools/sentinel-engine';
import type { AnalyzeCodeInput } from '@/lib/hub/types';

export const runtime    = 'nodejs';
export const dynamic    = 'force-dynamic';
export const maxDuration = 60;

const MAX_CODE_LENGTH = 20_000;

export async function POST(req: NextRequest) {
  const requestId = newRequestId();
  const elapsed   = startTimer();

  const auth = await guardHubRequest(req);
  if (!isAuthSuccess(auth)) return auth.response;

  const rl = checkHubRateLimit(auth.userId, 'sentinel');
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: `Rate limit exceeded. Retry in ${Math.ceil(rl.resetInMs / 1000)}s.`, code: 'RATE_LIMITED', requestId },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetInMs / 1000)) } },
    );
  }

  let body: AnalyzeCodeInput;
  try { body = await req.json() as AnalyzeCodeInput; }
  catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }

  if (!body.code?.trim()) {
    return NextResponse.json({ ok: false, error: '"code" is required' }, { status: 400 });
  }
  if (!body.language?.trim()) {
    return NextResponse.json({ ok: false, error: '"language" is required' }, { status: 400 });
  }
  if (body.code.length > MAX_CODE_LENGTH) {
    return NextResponse.json(
      { ok: false, error: `Code exceeds ${MAX_CODE_LENGTH.toLocaleString()} character limit. Split into smaller snippets.` },
      { status: 400 },
    );
  }

  try {
    const data     = await analyzeCode(body);
    const duration = elapsed();

    writeLog({
      requestId, timestamp: new Date().toISOString(),
      tool: 'sentinel', action: 'analyze_code',
      userId: auth.userId, apiKeyId: auth.keyId,
      duration, status: 'success', statusCode: 200,
      inputSize: body.code.length,
      outputSize: JSON.stringify(data).length,
    });

    return NextResponse.json({
      ok: true, tool: 'sentinel', action: 'analyze_code',
      requestId, timestamp: new Date().toISOString(), duration, data,
    }, {
      headers: {
        'X-RateLimit-Remaining-RPM': String(rl.remainingRpm),
        'X-RateLimit-Remaining-RPD': String(rl.remainingRpd),
        'X-Request-Id':              requestId,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Code analysis failed';
    writeLog({
      requestId, timestamp: new Date().toISOString(),
      tool: 'sentinel', action: 'analyze_code',
      userId: auth.userId, apiKeyId: auth.keyId,
      duration: elapsed(), status: 'error', statusCode: 500, errorMsg: msg,
      inputSize: body.code.length, outputSize: 0,
    });
    return NextResponse.json({ ok: false, error: msg, requestId }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    action:      'analyze_code',
    tool:        'sentinel',
    method:      'POST',
    endpoint:    '/api/hub/sentinel/analyze_code',
    description: 'Analyze a code snippet to identify errors, optimize performance, flag security issues, and suggest improvements.',
    rateLimit:   { rpm: 30, rpd: 300 },
    requiredFields: ['code', 'language'],
    optionalFields: ['filename', 'context', 'focusAreas'],
    limits:      { maxCodeLength: MAX_CODE_LENGTH },
    focusAreasEnum: ['errors', 'performance', 'security', 'style', 'all'],
    supportedLanguages: ['javascript', 'typescript', 'python', 'rust', 'go', 'java', 'c', 'cpp', 'php', 'ruby', 'swift', 'kotlin', 'sql', 'bash'],
    example: {
      request: {
        language: 'javascript',
        filename: 'utils.js',
        focusAreas: ['errors', 'performance', 'security'],
        code: 'function fetchUser(id) {\n  fetch("https://api.example.com/users/" + id)\n    .then(res => res.json())\n    .then(data => { document.innerHTML = data.bio; });\n}',
      },
      response: {
        ok: true, tool: 'sentinel', action: 'analyze_code',
        data: {
          score: 34,
          errors:   [{ line: 4, severity: 'error', code: 'SEC-XSS', message: 'Assigning to document.innerHTML without sanitization enables XSS attacks', fix: 'Use document.textContent = data.bio or DOMPurify.sanitize()' }],
          warnings: [{ line: 2, severity: 'warning', code: 'ERR-001', message: 'Missing .catch() on Promise — unhandled rejection', fix: 'Add .catch(err => console.error(err))' }],
          performance: [{ type: 'network', description: 'String concatenation in URL bypasses URL encoding', impact: 'medium', suggestion: 'Use new URL() or encodeURIComponent()' }],
          security: [{ type: 'xss', description: 'Unsanitized API data written directly to DOM', severity: 'critical', cwe: 'CWE-79', fix: 'Sanitize with DOMPurify or use textContent' }],
          metrics:  { lines: 5, functions: 1, complexity: 2, maintainability: 45, testability: 30, duplicateLines: 0 },
          summary:  'Critical XSS vulnerability found at line 4. The function is missing error handling and uses insecure DOM manipulation. Score: 34/100.',
          fixedCode: 'async function fetchUser(id) {\n  try {\n    const safeId = encodeURIComponent(id);\n    const res = await fetch(`https://api.example.com/users/${safeId}`);\n    if (!res.ok) throw new Error(`HTTP ${res.status}`);\n    const data = await res.json();\n    document.getElementById("bio").textContent = data.bio;\n  } catch (err) {\n    console.error("fetchUser failed:", err);\n  }\n}',
        },
      },
    },
    curlExample: `curl -X POST https://holly.nexamusicgroup.com/api/hub/sentinel/analyze_code \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer holly_xxxx" \\
  -d '{"code":"function add(a,b){return a+b}","language":"javascript","focusAreas":["errors","style"]}'`,
  });
}
