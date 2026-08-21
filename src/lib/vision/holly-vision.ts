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
//   1. Cloudflare Workers AI Llama-3.2-11B-Vision — FREE lane (~30 neurons/
//      describe ≈ 330/day inside the 10k daily neurons, shared with images).
//      Aligned model: happily describes SFW images, REFUSES nudity/explicit.
//      (Groq's Llama-4-Scout was the original pick — Groq deprecated ALL its
//      vision models 2026-08; gpt-oss replacement is text-only. Dead end.)
//   2. Modal Qwen2.5-VL (self-hosted) — pennies, sees EVERYTHING uncensored.
//      Used when Cloudflare refuses/errors (i.e. the image was explicit) or
//      when CLOUDFLARE_API_TOKEN is not configured.
// OUTBOUND QA (Holly's own generations) is ALWAYS Modal — QA verdicts on
// explicit anatomy cannot pass through an aligned filter.

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const CLOUDFLARE_API_TOKEN  = process.env.CLOUDFLARE_API_TOKEN  || '';

/** Heuristic: does a completion look like a content refusal? */
function looksLikeRefusal(text: string): boolean {
  return /\b(i can(?:'|no)?t (?:see|view|describe|assist|help|analy[sz]e)|i'm sorry|i am sorry|cannot generate|not able to (?:view|describe|analy[sz]e)|unable to (?:view|describe|analy[sz]e)|content policy|i won't (?:describe|view)|i will not (?:describe|view))/i.test(text);
}

/** FREE LANE: describe via Cloudflare Llama-3.2-11B-Vision. Null on refusal/failure. */
async function describeWithCloudflare(
  images: string[],
  prompt: string,
): Promise<VisionDescription | null> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN || images.length === 0) return null;
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                ...images.slice(0, 3).map((img) => ({
                  type: 'image_url',
                  image_url: { url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}` },
                })),
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(45_000),
      }
    );
    if (!res.ok) {
      console.warn('[HollyVision] Cloudflare vision HTTP', res.status, '— falling back to Modal');
      return null;
    }
    const json = (await res.json()) as {
      result?: { response?: string };
      errors?: { code?: number }[];
    };
    // Llama license gate (code 5016) should be a one-time 'agree' — treat as unavailable
    if (json.errors?.length) {
      console.warn('[HollyVision] Cloudflare vision errors:', JSON.stringify(json.errors).slice(0, 120));
      return null;
    }
    const content = json.result?.response?.trim();
    if (!content) return null;
    if (looksLikeRefusal(content)) {
      console.info('[HollyVision] Cloudflare refused (likely explicit image) — falling back to Modal (uncensored)');
      return null;
    }
    return { description: content };
  } catch (e) {
    console.warn('[HollyVision] Cloudflare describe failed — falling back to Modal:', (e as Error).message);
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

  // FREE LANE FIRST: Cloudflare handles SFW inbound at $0. Null = refused/
  // failed (explicit image, or token missing) → uncensored Modal lane below.
  const freeLane = await describeWithCloudflare(images, prompt);
  if (freeLane) return freeLane;

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
