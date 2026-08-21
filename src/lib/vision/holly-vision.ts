/**
 * HOLLY VISION — her own eyes (Steve, 2026-08-12).
 *
 * Self-hosted Qwen2.5-VL-7B on Modal. Every hosted vision API content-filters
 * nudity; Holly must see everything Steve sends her AND QA her own explicit
 * generations. Weights run in our container — no third-party filter, private
 * images never leave our infrastructure.
 *
 * Modal service: services/modal-media/vision_qwen25vl.py
 * Env: MODAL_VISION_URL=https://iamdoregosteve--vision-qa.modal.run
 *      (describe/qa endpoints derive their URLs from the same label prefix)
 *
 * When MODAL_VISION_URL is unset, all functions no-op (return null/false) —
 * vision is an enhancement, never a hard dependency.
 */

const VISION_URL = process.env.MODAL_VISION_URL || '';

// ─── Vision routing (Steve, 2026-08-12): free-first, uncensored-second ───────
//
// INBOUND descriptions (what Steve sends Holly) split by content:
//   1. Groq Llama-4-Scout — FREE (~30 RPM, 14.4k req/day). Aligned model:
//      happily describes SFW images, REFUSES nudity/explicit.
//   2. Modal Qwen2.5-VL (self-hosted) — pennies, sees EVERYTHING uncensored.
//      Used when Groq refuses/errors (i.e. the image was explicit) or when
//      GROQ_API_KEY is not configured.
// OUTBOUND QA (Holly's own generations) is ALWAYS Modal — QA verdicts on
// explicit anatomy cannot pass through an aligned filter.
//
// GROQ_API_KEY: free at console.groq.com (no card). Until it exists, all
// inbound descriptions go straight to Modal (current behaviour, unchanged).

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

/** Heuristic: does a Groq completion look like a content refusal? */
function looksLikeRefusal(text: string): boolean {
  return /\b(i can(?:'|no)?t (?:see|view|describe|assist|help|analy[sz]e)|i'm sorry|i am sorry|cannot generate|not able to (?:view|describe|analy[sz]e)|unable to (?:view|describe|analy[sz]e)|content policy|inappropriate content)\b/i.test(text);
}

/** FREE LANE: describe via Groq Llama-4-Scout. Returns null on refusal/failure. */
async function describeWithGroq(
  images: string[],
  prompt: string,
): Promise<VisionDescription | null> {
  if (!GROQ_API_KEY || images.length === 0) return null;
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_VISION_MODEL,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...images.slice(0, 5).map((img) => ({
                type: 'image_url',
                image_url: { url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}` },
              })),
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.warn('[HollyVision] Groq HTTP', res.status, '— falling back to Modal');
      return null;
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    if (looksLikeRefusal(content)) {
      console.info('[HollyVision] Groq refused (likely explicit image) — falling back to Modal (uncensored)');
      return null;
    }
    return { description: content };
  } catch (e) {
    console.warn('[HollyVision] Groq describe failed — falling back to Modal:', (e as Error).message);
    return null;
  }
}

/** Strip a data-URI prefix, returning raw base64. */
function toB64(input: string): string {
  return input.startsWith('data:') ? input.split(',', 2)[1] : input;
}

/**
 * POST with one cold-start retry. Modal's web proxy times out ~60s while a
 * cold container is booting (returns 5xx/timeout); by the time the retry
 * fires (75s later) the container is up and the request runs in seconds.
 * Pairs with the vision-warmup GET the chat route fires on message send.
 */
async function postWithColdRetry(
  url: string,
  body: unknown,
  timeoutMs: number,
  retryOnCold: boolean,
): Promise<Response | null> {
  const doFetch = () => fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  try {
    const first = await doFetch();
    if (first.ok) return first;
    console.warn('[HollyVision] HTTP', first.status, retryOnCold ? '— retrying once for cold boot' : '— failing fast');
    if (!retryOnCold) return null;
  } catch (e) {
    console.warn('[HollyVision] request timed out (cold boot?)', retryOnCold ? '— retrying once:' : '— failing fast:', (e as Error).message);
    if (!retryOnCold) return null;
  }
  await new Promise((r) => setTimeout(r, 75_000));
  try {
    const second = await doFetch();
    return second.ok ? second : null;
  } catch {
    return null;
  }
}

export interface VisionDescription {
  description: string;
}

/**
 * INBOUND: describe images Steve sent Holly. No content filter — describe
 * exactly what's asked (including explicit content).
 */
export async function describeImages(
  images: string[],
  prompt: string,
  timeoutMs = 120_000,
): Promise<VisionDescription | null> {
  if (images.length === 0) return null;

  // FREE LANE FIRST: Groq handles SFW inbound at $0. Null = refused/failed
  // (explicit image, or key missing) → uncensored Modal lane below.
  const groq = await describeWithGroq(images, prompt);
  if (groq) return groq;

  if (!VISION_URL) return null;
  const url = VISION_URL.replace(/--vision-qa\./, '--vision-describe.');
  try {
    const res = await postWithColdRetry(url, { images: images.map(toB64), prompt }, timeoutMs, /* retryOnCold */ true);
    if (!res) return null;
    const json = (await res.json()) as VisionDescription & { error?: string };
    if (json.error || !json.description) {
      console.warn('[HollyVision] describe error:', json.error);
      return null;
    }
    return json;
  } catch (e) {
    console.warn('[HollyVision] describe failed (cold start?):', (e as Error).message);
    return null;
  }
}

export interface QaVerdict {
  is_single_person?: boolean;
  identity_consistent?: boolean;
  anatomy_ok?: boolean;
  issues?: string[];
  qa_passed?: boolean;
  parse_error?: boolean;
  raw?: string;
  error?: string;
}

/**
 * OUTBOUND: QA an image Holly generated BEFORE it is sent to Steve.
 * Returns null when vision is unavailable — callers must treat that as
 * "pass through" (vision enhances, never blocks, the pipeline).
 */
export async function qaImage(
  imageDataUri: string,
  context: string,
  timeoutMs = 120_000,
): Promise<QaVerdict | null> {
  if (!VISION_URL) return null;
  try {
    const res = await postWithColdRetry(VISION_URL, { image: toB64(imageDataUri), context }, timeoutMs, /* retryOnCold */ false);
    if (!res) return null;
    const verdict = (await res.json()) as QaVerdict;
    if (verdict.error) {
      console.warn('[HollyVision] qa error:', verdict.error);
      return null;
    }
    return verdict;
  } catch (e) {
    console.warn('[HollyVision] qa failed (cold start?) — passing through:', (e as Error).message);
    return null;
  }
}

/**
 * OUTBOUND: QA a generated video by sampled frames.
 */
export async function qaVideo(
  videoDataUri: string,
  context: string,
  timeoutMs = 150_000,
): Promise<QaVerdict | null> {
  if (!VISION_URL) return null;
  const url = VISION_URL.replace(/--vision-qa\./, '--vision-qa-video.');
  try {
    const res = await postWithColdRetry(url, { video: toB64(videoDataUri), context }, timeoutMs, /* retryOnCold */ false);
    if (!res) return null;
    const verdict = (await res.json()) as QaVerdict;
    if (verdict.error) {
      console.warn('[HollyVision] qa-video error:', verdict.error);
      return null;
    }
    return verdict;
  } catch (e) {
    console.warn('[HollyVision] qa-video failed — passing through:', (e as Error).message);
    return null;
  }
}

/** Convenience: did QA explicitly FAIL (not "unavailable")? */
export function qaFailed(v: QaVerdict | null): boolean {
  return v !== null && v.qa_passed === false;
}
