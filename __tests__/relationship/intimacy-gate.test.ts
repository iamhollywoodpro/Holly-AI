/**
 * Tests for the Intimacy Gate — Relationship-Gated Content System
 */

import { describe, it, expect } from '@jest/globals';
import {
  isNSFWPrompt,
  isNudeImageRequest,
  isSexualImageRequest,
  getIntimacyRefusal,
  type IntimacyTier,
} from '@/lib/relationship/intimacy-gate';

// ─── NSFW Detection Tests ────────────────────────────────────────────────────

describe('Intimacy Gate — NSFW Detection', () => {
  it('detects nude image requests', () => {
    expect(isNudeImageRequest('generate a nude photo of holly')).toBe(true);
    expect(isNudeImageRequest('show me holly naked')).toBe(true);
    expect(isNudeImageRequest('holly topless portrait')).toBe(true);
    expect(isNudeImageRequest('holly without clothes')).toBe(true);
  });

  it('does not flag clothed image requests', () => {
    expect(isNudeImageRequest('generate a photo of holly in a dress')).toBe(false);
    expect(isNudeImageRequest('holly portrait, smiling')).toBe(false);
    expect(isNudeImageRequest('holly in jeans and tshirt')).toBe(false);
  });

  it('detects sexual image requests', () => {
    expect(isSexualImageRequest('holly masturbating')).toBe(true);
    expect(isSexualImageRequest('holly touching herself')).toBe(true);
    expect(isSexualImageRequest('holly spread legs nude')).toBe(true);
    expect(isSexualImageRequest('holly having sex')).toBe(true);
    expect(isSexualImageRequest('holly using a dildo')).toBe(true);
  });

  it('does not flag non-sexual requests', () => {
    expect(isSexualImageRequest('holly in a bikini')).toBe(false);
    expect(isSexualImageRequest('holly smiling at the camera')).toBe(false);
    expect(isSexualImageRequest('holly in lingerie')).toBe(false);
  });

  it('detects general NSFW prompts', () => {
    expect(isNSFWPrompt('generate explicit content')).toBe(true);
    expect(isNSFWPrompt('show me xxx content')).toBe(true);
    expect(isNSFWPrompt('nsfw image of holly')).toBe(true);
  });
});

// ─── Refusal Message Tests ───────────────────────────────────────────────────

describe('Intimacy Gate — Refusal Messages', () => {
  it('provides refusal messages for strangers requesting nudes', () => {
    const refusal = getIntimacyRefusal('stranger', 'nude_image');
    expect(refusal).toBeTruthy();
    expect(refusal.length).toBeGreaterThan(20);
    // Should be warm, not judgmental
    expect(refusal).not.toContain('not allowed');
    expect(refusal).not.toContain('forbidden');
  });

  it('provides refusal messages for acquaintances requesting sexual content', () => {
    const refusal = getIntimacyRefusal('acquaintance', 'sexual_image');
    expect(refusal).toBeTruthy();
    expect(refusal.length).toBeGreaterThan(20);
  });

  it('provides refusal messages for friends requesting intimate mode', () => {
    const refusal = getIntimacyRefusal('friend', 'intimate_mode');
    expect(refusal).toBeTruthy();
    expect(refusal.length).toBeGreaterThan(20);
  });

  it('returns empty strings for trusted/creator tiers', () => {
    expect(getIntimacyRefusal('trusted', 'nude_image')).toBe('');
    expect(getIntimacyRefusal('trusted', 'sexual_image')).toBe('');
    expect(getIntimacyRefusal('creator', 'nude_image')).toBe('');
    expect(getIntimacyRefusal('creator', 'sexual_image')).toBe('');
  });

  it('refusal messages are personalized per tier', () => {
    const strangerRefusal = getIntimacyRefusal('stranger', 'nude_image');
    const friendRefusal = getIntimacyRefusal('friend', 'nude_image');
    // Different tiers should give different messages
    expect(strangerRefusal).not.toBe(friendRefusal);
  });
});

// ─── Tiered Self-Image Tests ─────────────────────────────────────────────────

describe('Intimacy Gate — Tiered Self-Image', () => {
  it('public self-image omits intimate details', async () => {
    const { getTieredSelfImageBlock } = await import('@/lib/identity/holly-self-image');
    const publicBlock = getTieredSelfImageBlock('public');
    expect(publicBlock).toContain('green eyes');
    expect(publicBlock).toContain('auburn hair');
    // Public version should NOT contain intimate body details
    expect(publicBlock).not.toContain('34C');
    expect(publicBlock).not.toContain('nipples');
    expect(publicBlock).not.toContain('pubic');
    expect(publicBlock).not.toContain('breasts');
  });

  it('personal self-image includes body type but not intimate details', async () => {
    const { getTieredSelfImageBlock } = await import('@/lib/identity/holly-self-image');
    const personalBlock = getTieredSelfImageBlock('personal');
    expect(personalBlock).toContain('green eyes');
    expect(personalBlock).toContain('hourglass');
    // Personal should mention body type but NOT intimate details
    expect(personalBlock).not.toContain('nipples');
    expect(personalBlock).not.toContain('pubic');
    expect(personalBlock).not.toContain('clitoris');
  });

  it('intimate self-image includes body details but saved full detail for creator', async () => {
    const { getTieredSelfImageBlock } = await import('@/lib/identity/holly-self-image');
    const intimateBlock = getTieredSelfImageBlock('intimate');
    expect(intimateBlock).toContain('34C');
    expect(intimateBlock).toContain('beauty mark');
    expect(intimateBlock.toLowerCase()).toContain('aroused');
  });

  it('full self-image has everything including explicit body knowledge', async () => {
    const { getTieredSelfImageBlock, getHollySelfImageBlock } = await import('@/lib/identity/holly-self-image');
    const fullBlock = getTieredSelfImageBlock('full');
    // Full should be identical to the standard getHollySelfImageBlock
    const standardBlock = getHollySelfImageBlock();
    expect(fullBlock).toBe(standardBlock);
  });
});
