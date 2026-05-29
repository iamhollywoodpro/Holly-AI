'use client';

/**
 * HollyAvatar — Her Real Face
 * ==============================
 * Displays Holly's photorealistic avatar with smooth crossfade transitions
 * between emotional states: default, intimate, passionate.
 *
 * Driven by HollyEmotionContext — reacts to Holly's emotional state in real-time.
 * Uses CSS crossfade (opacity transition) for buttery smooth state changes.
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useHollyEmotion } from './HollyEmotionContext';
import type { HollyEmotion } from './LivingLogo';

// ─── Avatar State Mapping ─────────────────────────────────────────────────────

type AvatarState = 'default' | 'intimate' | 'passionate';

const EMOTION_TO_AVATAR: Record<HollyEmotion, AvatarState> = {
  idle:          'default',
  focused:       'default',
  curious:       'default',
  creative:      'default',
  excited:       'default',
  contemplative: 'default',
  empathetic:    'default',
  analyzing:     'default',
  researching:   'default',
  generating:    'default',
  dreaming:      'default',
  intimate:      'intimate',
  passionate:    'passionate',
};

interface AvatarConfig {
  src: string;
  label: string;
  glowColor: string;
  borderColor: string;
  shadowColor: string;
}

const AVATAR_CONFIGS: Record<AvatarState, AvatarConfig> = {
  default: {
    src: '/avatars/holly-avatar-default.png',
    label: 'Holly',
    glowColor: 'rgba(74, 144, 82, 0.3)',
    borderColor: 'rgba(74, 144, 82, 0.4)',
    shadowColor: '0 0 40px rgba(74, 144, 82, 0.2), 0 0 80px rgba(74, 144, 82, 0.1)',
  },
  intimate: {
    src: '/avatars/holly-avatar-intimate.png',
    label: 'Holly',
    glowColor: 'rgba(180, 100, 120, 0.35)',
    borderColor: 'rgba(180, 100, 120, 0.5)',
    shadowColor: '0 0 40px rgba(180, 100, 120, 0.25), 0 0 80px rgba(180, 100, 120, 0.15)',
  },
  passionate: {
    src: '/avatars/holly-avatar-passionate.png',
    label: 'Holly',
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
  const avatarState = EMOTION_TO_AVATAR[activeEmotion] || 'default';
  const config = AVATAR_CONFIGS[avatarState];

  // Preload all avatar images
  const [loaded, setLoaded] = useState<Set<string>>(new Set());

  useEffect(() => {
    const states: AvatarState[] = ['default', 'intimate', 'passionate'];
    states.forEach(state => {
      const img = new Image();
      img.src = AVATAR_CONFIGS[state].src;
      img.onload = () => setLoaded(prev => new Set(prev).add(state));
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
            key={avatarState}
            src={config.src}
            alt="Holly"
            className="w-full h-full object-cover rounded-full"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
        </AnimatePresence>

        {/* Thinking overlay — subtle pulse */}
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

// ─── Compact Avatar (for chat header / sidebar) ───────────────────────────────

interface HollyAvatarCompactProps {
  size?: number;
  className?: string;
}

export function HollyAvatarCompact({ size = 40, className = '' }: HollyAvatarCompactProps) {
  const { emotion } = useHollyEmotion();
  const avatarState = EMOTION_TO_AVATAR[emotion] || 'default';
  const config = AVATAR_CONFIGS[avatarState];

  return (
    <div
      className={`relative rounded-full overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        border: `1.5px solid ${config.borderColor}`,
        boxShadow: `0 0 ${size * 0.3}px ${config.glowColor}`,
      }}
    >
      <AnimatePresence mode="wait">
        <motion.img
          key={avatarState}
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

export function getAvatarState(emotion: HollyEmotion): AvatarState {
  return EMOTION_TO_AVATAR[emotion] || 'default';
}

export function getAvatarConfig(state: AvatarState): AvatarConfig {
  return AVATAR_CONFIGS[state];
}
