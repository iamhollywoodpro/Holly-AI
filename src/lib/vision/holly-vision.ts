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
  if (!VISION_URL || images.length === 0) return null;
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
