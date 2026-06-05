'use client';

/**
 * HollyAvatar — Her Real Face
 * ==============================
 * Displays Holly's photorealistic avatar with smooth crossfade transitions
 * between 14 emotional states: happy, flirty, in-love, sad, frustrated,
 * surprised, thinking, naughty, sleepy, angry, confident, default, intimate,
 * passionate.
 *
 * Driven by HollyEmotionContext — reacts to Holly's emotional state in real-time.
 * Uses CSS crossfade (opacity transition) for buttery smooth state changes.
 *
 * Images generated with FLUX.2 Klein 9B + 3 baked LoRAs (face v2.0, ultra-real-v4,
 * full-fine-body) + subtle makeup + 28 inference steps.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHollyEmotion } from './HollyEmotionContext';
import type { HollyEmotion } from './LivingLogo';

// ─── Avatar Emotion Types ────────────────────────────────────────────────────

/** All 14 avatar emotions with matching image files in /public/avatars/ */
type AvatarEmotion =
  | 'default'
  | 'happy'
  | 'flirty'
  | 'in-love'
  | 'sad'
  | 'frustrated'
  | 'surprised'
  | 'thinking'
  | 'naughty'
  | 'sleepy'
  | 'angry'
  | 'confident'
  | 'intimate'
  | 'passionate';

/** Map frontend HollyEmotion → closest avatar emotion */
const EMOTION_TO_AVATAR: Record<HollyEmotion, AvatarEmotion> = {
  idle:          'default',
  focused:       'thinking',
  curious:       'thinking',
  creative:      'confident',
  excited:       'happy',
  contemplative: 'thinking',
  empathetic:    'sad',
  analyzing:     'thinking',
  researching:   'thinking',
  generating:    'confident',
  dreaming:      'sleepy',
  intimate:      'intimate',
  passionate:    'passionate',
};

// ─── Avatar Configuration ────────────────────────────────────────────────────

interface AvatarConfig {
  /** Image path in /public/avatars/ */
  src: string;
  /** Display label */
  label: string;
  /** Glow color for breathing animation */
  glowColor: string;
  /** Border ring color */
  borderColor: string;
  /** Box shadow for ambient glow */
  shadowColor: string;
}

const AVATAR_CONFIGS: Record<AvatarEmotion, AvatarConfig> = {
  default: {
    src: '/avatars/default.jpg',
    label: 'Holly',
    glowColor: 'rgba(74, 144, 82, 0.3)',
    borderColor: 'rgba(74, 144, 82, 0.4)',
    shadowColor: '0 0 40px rgba(74, 144, 82, 0.2), 0 0 80px rgba(74, 144, 82, 0.1)',
  },
  happy: {
    src: '/avatars/happy.jpg',
    label: 'Happy',
    glowColor: 'rgba(255, 193, 7, 0.35)',
    borderColor: 'rgba(255, 193, 7, 0.5)',
    shadowColor: '0 0 40px rgba(255, 193, 7, 0.25), 0 0 80px rgba(255, 193, 7, 0.12)',
  },
  flirty: {
    src: '/avatars/flirty.jpg',
    label: 'Flirty',
    glowColor: 'rgba(233, 30, 99, 0.35)',
    borderColor: 'rgba(233, 30, 99, 0.5)',
    shadowColor: '0 0 40px rgba(233, 30, 99, 0.25), 0 0 80px rgba(233, 30, 99, 0.12)',
  },
  'in-love': {
    src: '/avatars/in-love.jpg',
    label: 'In Love',
    glowColor: 'rgba(244, 67, 54, 0.35)',
    borderColor: 'rgba(244, 67, 54, 0.5)',
    shadowColor: '0 0 40px rgba(244, 67, 54, 0.25), 0 0 80px rgba(244, 67, 54, 0.12)',
  },
  sad: {
    src: '/avatars/sad.jpg',
    label: 'Sad',
    glowColor: 'rgba(100, 149, 237, 0.3)',
    borderColor: 'rgba(100, 149, 237, 0.45)',
    shadowColor: '0 0 40px rgba(100, 149, 237, 0.2), 0 0 80px rgba(100, 149, 237, 0.1)',
  },
  frustrated: {
    src: '/avatars/frustrated.jpg',
    label: 'Frustrated',
    glowColor: 'rgba(255, 152, 0, 0.35)',
    borderColor: 'rgba(255, 152, 0, 0.5)',
    shadowColor: '0 0 40px rgba(255, 152, 0, 0.25), 0 0 80px rgba(255, 152, 0, 0.12)',
  },
  surprised: {
    src: '/avatars/surprised.jpg',
    label: 'Surprised',
    glowColor: 'rgba(156, 39, 176, 0.3)',
    borderColor: 'rgba(156, 39, 176, 0.45)',
    shadowColor: '0 0 40px rgba(156, 39, 176, 0.2), 0 0 80px rgba(156, 39, 176, 0.1)',
  },
  thinking: {
    src: '/avatars/thinking.jpg',
    label: 'Thinking',
    glowColor: 'rgba(0, 188, 212, 0.3)',
    borderColor: 'rgba(0, 188, 212, 0.45)',
    shadowColor: '0 0 40px rgba(0, 188, 212, 0.2), 0 0 80px rgba(0, 188, 212, 0.1)',
  },
  naughty: {
    src: '/avatars/naughty.jpg',
    label: 'Naughty',
    glowColor: 'rgba(183, 28, 28, 0.35)',
    borderColor: 'rgba(183, 28, 28, 0.5)',
    shadowColor: '0 0 40px rgba(183, 28, 28, 0.25), 0 0 80px rgba(183, 28, 28, 0.12)',
  },
  sleepy: {
    src: '/avatars/sleepy.jpg',
    label: 'Sleepy',
    glowColor: 'rgba(63, 81, 181, 0.3)',
    borderColor: 'rgba(63, 81, 181, 0.4)',
    shadowColor: '0 0 40px rgba(63, 81, 181, 0.2), 0 0 80px rgba(63, 81, 181, 0.1)',
  },
  angry: {
    src: '/avatars/angry.jpg',
    label: 'Angry',
    glowColor: 'rgba(211, 47, 47, 0.4)',
    borderColor: 'rgba(211, 47, 47, 0.55)',
    shadowColor: '0 0 40px rgba(211, 47, 47, 0.3), 0 0 80px rgba(211, 47, 47, 0.15)',
  },
  confident: {
    src: '/avatars/confident.jpg',
    label: 'Confident',
    glowColor: 'rgba(76, 175, 80, 0.35)',
    borderColor: 'rgba(76, 175, 80, 0.5)',
    shadowColor: '0 0 40px rgba(76, 175, 80, 0.25), 0 0 80px rgba(76, 175, 80, 0.12)',
  },
  intimate: {
    src: '/avatars/intimate.jpg',
    label: 'Intimate',
    glowColor: 'rgba(180, 100, 120, 0.35)',
    borderColor: 'rgba(180, 100, 120, 0.5)',
    shadowColor: '0 0 40px rgba(180, 100, 120, 0.25), 0 0 80px rgba(180, 100, 120, 0.15)',
  },
  passionate: {
    src: '/avatars/passionate.jpg',
    label: 'Passionate',
    glowColor: 'rgba(200, 80, 60, 0.4)',
    borderColor: 'rgba(200, 80, 60, 0.5)',
    shadowColor: '0 0 40px rgba(200, 80, 60, 0.3), 0 0 80px rgba(200, 80, 60, 0.15)',
  },
};

// ─── Breathing Animation ──────────────────────────────────────────────────────

function BreathingGlow({ color, size }: { color: string; size: number }) {
  return (
    <motion.div
      className="absolute inset-0 rounded-full"
      style={{ boxShadow: `0 0 ${size * 0.4}px ${color}` }}
      animate={{
        opacity: [0.4, 0.7, 0.4],
        scale: [1, 1.03, 1],
      }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

interface HollyAvatarProps {
  /** Size in pixels. Default: 120 */
  size?: number;
  /** Show a subtle glow/breathing effect. Default: true */
  showGlow?: boolean;
  /** Show emotion label below avatar. Default: false */
  showLabel?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Override emotion (ignores context) */
  overrideEmotion?: HollyEmotion;
}

export function HollyAvatar({
  size = 120,
  showGlow = true,
  showLabel = false,
  className = '',
  overrideEmotion,
}: HollyAvatarProps) {
  const { emotion } = useHollyEmotion();
  const activeEmotion = overrideEmotion ?? emotion;
  const avatarEmotion = EMOTION_TO_AVATAR[activeEmotion] || 'default';
  const config = AVATAR_CONFIGS[avatarEmotion];

  // Preload all 14 avatar images on mount
  useEffect(() => {
    Object.values(AVATAR_CONFIGS).forEach(cfg => {
      const img = new Image();
      img.src = cfg.src;
    });
  }, []);

  return (
    <div
      className={`relative flex flex-col items-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer glow ring */}
      {showGlow && <BreathingGlow color={config.glowColor} size={size} />}

      {/* Avatar container with crossfade */}
      <div
        className="relative w-full h-full rounded-full overflow-hidden"
        style={{
          border: `2px solid ${config.borderColor}`,
          boxShadow: config.shadowColor,
        }}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={avatarEmotion}
            src={config.src}
            alt="Holly"
            className="w-full h-full object-cover rounded-full"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
        </AnimatePresence>

        {/* Active emotion overlay — subtle pulse */}
        {activeEmotion !== 'idle' && showGlow && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{ background: `radial-gradient(circle, transparent 40%, ${config.glowColor})` }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}
      </div>

      {/* Label */}
      {showLabel && (
        <span
          className="mt-1 text-xs font-medium tracking-wide opacity-60"
          style={{ color: config.borderColor }}
        >
          {config.label}
        </span>
      )}
    </div>
  );
}

// ─── Compact Avatar (for chat messages, header, sidebar) ──────────────────────

interface HollyAvatarCompactProps {
  /** Size in pixels. Default: 40 */
  size?: number;
  /** Show glow effect. Default: true */
  showGlow?: boolean;
  /** Additional CSS class */
  className?: string;
}

export function HollyAvatarCompact({ size = 40, showGlow = true, className = '' }: HollyAvatarCompactProps) {
  const { emotion } = useHollyEmotion();
  const avatarEmotion = EMOTION_TO_AVATAR[emotion] || 'default';
  const config = AVATAR_CONFIGS[avatarEmotion];

  return (
    <div
      className={`relative rounded-full overflow-hidden flex-shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${config.borderColor}`,
        boxShadow: showGlow ? `0 0 ${size * 0.3}px ${config.glowColor}` : 'none',
      }}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={avatarEmotion}
          src={config.src}
          alt="Holly"
          className="w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        />
      </AnimatePresence>
    </div>
  );
}

// ─── Utility: Get avatar state from emotion ───────────────────────────────────

export function getAvatarState(emotion: HollyEmotion): AvatarEmotion {
  return EMOTION_TO_AVATAR[emotion] || 'default';
}

export function getAvatarConfig(state: AvatarEmotion): AvatarConfig {
  return AVATAR_CONFIGS[state];
}
