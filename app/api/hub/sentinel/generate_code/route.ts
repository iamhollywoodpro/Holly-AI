/**
 * POST /api/hub/sentinel/generate_code
 *
 * Generate clean, production-ready code from a natural language description.
 * Auth: Bearer holly_xxxx | x-api-key: holly_xxxx | x-hub-key: <HOLLY_HUB_API_KEY>
 *
 * Required:  { description, language }
 * Optional:  { framework, style, context, requirements, examples }
 */

import { NextRequest, NextResponse } from 'next/server';
import { guardHubRequest, isAuthSuccess } from '@/lib/hub/auth';
import { writeLog, newRequestId, startTimer } from '@/lib/hub/logger';
import { checkHubRateLimit } from '@/lib/hub/rate-limit';
import { generateCode } from '@/lib/hub/tools/sentinel-engine';
import type { GenerateCodeInput } from '@/lib/hub/types';

export const runtime    = 'nodejs';
export const dynamic    = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby cap — use Dokploy for unlimited

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

  let body: GenerateCodeInput;
  try { body = await req.json() as GenerateCodeInput; }
  catch { return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 }); }

  if (!body.description?.trim()) {
    return NextResponse.json({ ok: false, error: '"description" is required' }, { status: 400 });
  }
  if (!body.language?.trim()) {
    return NextResponse.json({ ok: false, error: '"language" is required' }, { status: 400 });
  }
  if (body.description.length > 4000) {
    return NextResponse.json({ ok: false, error: 'Description exceeds 4,000 character limit.' }, { status: 400 });
  }

  try {
    const data     = await generateCode(body);
    const duration = elapsed();

    writeLog({
      requestId, timestamp: new Date().toISOString(),
      tool: 'sentinel', action: 'generate_code',
      userId: auth.userId, apiKeyId: auth.keyId,
      duration, status: 'success', statusCode: 200,
      inputSize: JSON.stringify(body).length,
      outputSize: JSON.stringify(data).length,
    });

    return NextResponse.json({
      ok: true, tool: 'sentinel', action: 'generate_code',
      requestId, timestamp: new Date().toISOString(), duration, data,
    }, {
      headers: {
        'X-RateLimit-Remaining-RPM': String(rl.remainingRpm),
        'X-RateLimit-Remaining-RPD': String(rl.remainingRpd),
        'X-Request-Id':              requestId,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Code generation failed';
    writeLog({
      requestId, timestamp: new Date().toISOString(),
      tool: 'sentinel', action: 'generate_code',
      userId: auth.userId, apiKeyId: auth.keyId,
      duration: elapsed(), status: 'error', statusCode: 500, errorMsg: msg,
      inputSize: JSON.stringify(body).length, outputSize: 0,
    });
    return NextResponse.json({ ok: false, error: msg, requestId }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    action:      'generate_code',
    tool:        'sentinel',
    method:      'POST',
    endpoint:    '/api/hub/sentinel/generate_code',
    description: 'Generate clean, production-ready code from a natural language description.',
    rateLimit:   { rpm: 30, rpd: 300 },
    requiredFields: ['description', 'language'],
    optionalFields: ['framework', 'style', 'context', 'requirements', 'examples'],
    limits:      { maxDescriptionLength: 4000 },
    styleOptions: ['functional', 'OOP', 'hooks', 'async/await', 'class-based', 'modular'],
    example: {
      request: {
        description: 'A React hook that fetches user data from an API with loading, error, and retry states',
        language:    'typescript',
        framework:   'React',
        style:       'functional hooks',
        requirements: [
          'Auto-retry on failure up to 3 times',
          'Exponential backoff between retries',
          'TypeScript generics for flexible data type',
          'AbortController for cleanup on unmount',
        ],
      },
      response: {
        ok: true, tool: 'sentinel', action: 'generate_code',
        data: {
          language:    'typescript',
          explanation: 'useFetch is a generic React hook that handles data fetching with automatic retry logic using exponential backoff. It manages loading, error, and data states, and cleans up with AbortController on unmount.',
          usage:       'const { data, loading, error, retry } = useFetch<User>("/api/users/1");',
          dependencies: ['react'],
          notes:       ['Pass the full URL or a relative path', 'Generic type T determines the shape of data returned', 'Call retry() to manually trigger a new fetch'],
          code:        'import { useState, useEffect, useCallback, useRef } from "react";\n\ninterface FetchState<T> {\n  data: T | null;\n  loading: boolean;\n  error: Error | null;\n}\n\nexport function useFetch<T>(url: string, maxRetries = 3) {\n  const [state, setState] = useState<FetchState<T>>({ data: null, loading: true, error: null });\n  const retryCount = useRef(0);\n  const abortRef   = useRef<AbortController | null>(null);\n\n  const execute = useCallback(async () => {\n    abortRef.current?.abort();\n    const controller = new AbortController();\n    abortRef.current = controller;\n\n    setState(s => ({ ...s, loading: true, error: null }));\n\n    for (let attempt = 0; attempt <= maxRetries; attempt++) {\n      try {\n        const res = await fetch(url, { signal: controller.signal });\n        if (!res.ok) throw new Error(`HTTP ${res.status}`);\n        const data: T = await res.json();\n        setState({ data, loading: false, error: null });\n        retryCount.current = 0;\n        return;\n      } catch (err) {\n        if ((err as Error).name === "AbortError") return;\n        if (attempt < maxRetries) {\n          await new Promise(r => setTimeout(r, 2 ** attempt * 500));\n        } else {\n          setState({ data: null, loading: false, error: err as Error });\n        }\n      }\n    }\n  }, [url, maxRetries]);\n\n  useEffect(() => { execute(); return () => abortRef.current?.abort(); }, [execute]);\n  return { ...state, retry: execute };\n}',
        },
      },
    },
    curlExample: `curl -X POST https://holly.nexamusicgroup.com/api/hub/sentinel/generate_code \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer holly_xxxx" \\
  -d '{"description":"A debounce utility function","language":"typescript"}'`,
  });
}
