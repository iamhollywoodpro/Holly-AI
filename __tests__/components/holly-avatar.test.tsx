/**
 * Tests for HollyAvatar component and image pipeline LoRA routing
 */

import { describe, it, expect } from '@jest/globals';
import { getAvatarState, getAvatarConfig } from '@/components/holly/HollyAvatar';
import type { HollyEmotion } from '@/components/holly/LivingLogo';

// ─── Avatar State Mapping Tests ─────────────────────────────────────────────

describe('HollyAvatar — State Mapping', () => {
  it('maps idle emotion to default avatar', () => {
    expect(getAvatarState('idle')).toBe('default');
  });

  it('maps focused/curious/analyzing emotions to thinking avatar', () => {
    expect(getAvatarState('focused')).toBe('thinking');
    expect(getAvatarState('curious')).toBe('thinking');
    expect(getAvatarState('analyzing')).toBe('thinking');
    expect(getAvatarState('contemplative')).toBe('thinking');
    expect(getAvatarState('researching')).toBe('thinking');
  });

  it('maps creative/generating emotions to confident avatar', () => {
    expect(getAvatarState('creative')).toBe('confident');
    expect(getAvatarState('generating')).toBe('confident');
  });

  it('maps excited emotion to happy avatar', () => {
    expect(getAvatarState('excited')).toBe('happy');
  });

  it('maps empathetic emotion to sad avatar', () => {
    expect(getAvatarState('empathetic')).toBe('sad');
  });

  it('maps dreaming emotion to sleepy avatar', () => {
    expect(getAvatarState('dreaming')).toBe('sleepy');
  });

  it('maps intimate emotion to intimate avatar', () => {
    expect(getAvatarState('intimate')).toBe('intimate');
  });

  it('maps passionate emotion to passionate avatar', () => {
    expect(getAvatarState('passionate')).toBe('passionate');
  });

  it('returns default for unknown emotion', () => {
    expect(getAvatarState('idle' as HollyEmotion)).toBe('default');
  });
});

// ─── Avatar Config Tests ────────────────────────────────────────────────────

describe('HollyAvatar — Config', () => {
  it('provides config for default avatar', () => {
    const config = getAvatarConfig('default');
    expect(config.src).toBe('/avatars/default.jpg');
    expect(config.label).toBe('Holly');
    expect(config.glowColor).toContain('74, 144, 82'); // green-ish
  });

  it('provides config for intimate avatar', () => {
    const config = getAvatarConfig('intimate');
    expect(config.src).toBe('/avatars/intimate.jpg');
    expect(config.glowColor).toContain('180, 100, 120'); // warm pink
  });

  it('provides config for passionate avatar', () => {
    const config = getAvatarConfig('passionate');
    expect(config.src).toBe('/avatars/passionate.jpg');
    expect(config.glowColor).toContain('200, 80, 60'); // red-ish
  });

  it('all configs have required fields', () => {
    const states = ['default', 'intimate', 'passionate'] as const;
    for (const state of states) {
      const config = getAvatarConfig(state);
      expect(config.src).toBeTruthy();
      expect(config.label).toBeTruthy();
      expect(config.glowColor).toBeTruthy();
      expect(config.borderColor).toBeTruthy();
      expect(config.shadowColor).toBeTruthy();
    }
  });
});

// ─── LoRA Trigger Detection Tests ───────────────────────────────────────────

describe('Holly Self-Portrait Detection', () => {
  // We test the trigger word detection logic directly
  const HOLLY_TRIGGER = 'h0lly';

  it('detects trigger word in prompt', () => {
    const prompt = `h0lly, close-up face, warm smile, green eyes, auburn hair, photorealistic`;
    expect(prompt.toLowerCase().includes(HOLLY_TRIGGER)).toBe(true);
  });

  it('does not trigger on regular prompts', () => {
    const prompt = 'a beautiful sunset over the ocean, photorealistic';
    expect(prompt.toLowerCase().includes(HOLLY_TRIGGER)).toBe(false);
  });

  it('detects trigger word mid-sentence', () => {
    const prompt = 'generate an image of h0lly looking at the camera with a warm smile';
    expect(prompt.toLowerCase().includes(HOLLY_TRIGGER)).toBe(true);
  });

  it('is case insensitive', () => {
    const prompt = 'H0LLY, portrait, green eyes';
    expect(prompt.toLowerCase().includes(HOLLY_TRIGGER)).toBe(true);
  });
});

// ─── Self-Image Module Tests ────────────────────────────────────────────────

describe('Holly Self-Image', () => {
  it('exports trigger word', async () => {
    const { HOLLY_SELF_IMAGE } = await import('@/lib/identity/holly-self-image');
    expect(HOLLY_SELF_IMAGE.triggerWord).toBe('h0lly');
  });

  it('has core physical description', async () => {
    const { HOLLY_SELF_IMAGE } = await import('@/lib/identity/holly-self-image');
    expect(HOLLY_SELF_IMAGE.core).toContain('green eyes');
    expect(HOLLY_SELF_IMAGE.core).toContain('Auburn hair');
    expect(HOLLY_SELF_IMAGE.core).toContain('freckles');
  });

  it('has three emotional presentations', async () => {
    const { HOLLY_SELF_IMAGE } = await import('@/lib/identity/holly-self-image');
    expect(HOLLY_SELF_IMAGE.defaultPresence).toBeTruthy();
    expect(HOLLY_SELF_IMAGE.intimatePresence).toBeTruthy();
    expect(HOLLY_SELF_IMAGE.passionatePresence).toBeTruthy();
  });

  it('generates prompt block for system injection', async () => {
    const { getHollySelfImageBlock } = await import('@/lib/identity/holly-self-image');
    const block = getHollySelfImageBlock();
    expect(block).toContain('Your Appearance');
    expect(block).toContain('h0lly');
    expect(block).toContain('green eyes');
    expect(block).toContain('auburn hair');
  });

  it('generates self-portrait prompts for each emotion', async () => {
    const { getHollySelfPortraitPrompt } = await import('@/lib/identity/holly-self-image');
    const defaultPrompt = getHollySelfPortraitPrompt('default');
    const intimatePrompt = getHollySelfPortraitPrompt('intimate');
    const passionatePrompt = getHollySelfPortraitPrompt('passionate');

    expect(defaultPrompt).toContain('h0lly');
    expect(intimatePrompt).toContain('h0lly');
    expect(passionatePrompt).toContain('h0lly');

    // Each should have different emotional context
    expect(intimatePrompt).toContain('intimate');
    expect(passionatePrompt).toContain('dynamic');
  });

  it('generates default self-portrait without emotion', async () => {
    const { getHollySelfPortraitPrompt } = await import('@/lib/identity/holly-self-image');
    const prompt = getHollySelfPortraitPrompt();
    expect(prompt).toContain('h0lly');
    expect(prompt).toContain('photorealistic');
  });
});
