'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export type HollyEmotion =
  | 'focused'
  | 'curious'
  | 'creative'
  | 'excited'
  | 'contemplative'
  | 'empathetic'
  | 'analyzing'
  | 'researching'
  | 'generating'
  | 'dreaming'
  | 'idle'
  | 'intimate'
  | 'passionate';

interface EmotionProfile {
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  bpm: number;
  scale: number;
}

const EMOTION_PROFILES: Record<HollyEmotion, EmotionProfile> = {
  focused:       { primaryColor: '#66CCCC', secondaryColor: '#3DAF76', glowColor: 'rgba(102,204,204,0.4)',   bpm: 60,  scale: 1.0 },
  curious:       { primaryColor: '#66CCCC', secondaryColor: '#F5F0E8', glowColor: 'rgba(102,204,204,0.3)',   bpm: 72,  scale: 1.0 },
  creative:      { primaryColor: '#C7B8EA', secondaryColor: '#66CCCC', glowColor: 'rgba(196,122,74,0.4)',  bpm: 80,  scale: 1.05 },
  excited:       { primaryColor: '#C7B8EA', secondaryColor: '#66CCCC', glowColor: 'rgba(196,122,74,0.6)',  bpm: 96,  scale: 1.1 },
  contemplative: { primaryColor: '#1F3D30', secondaryColor: '#0A0908', glowColor: 'rgba(31,61,48,0.3)',    bpm: 48,  scale: 0.95 },
  empathetic:    { primaryColor: '#C7B8EA', secondaryColor: '#F5F0E8', glowColor: 'rgba(196,122,74,0.3)',  bpm: 65,  scale: 1.0 },
  analyzing:     { primaryColor: '#66CCCC', secondaryColor: '#F5F0E8', glowColor: 'rgba(102,204,204,0.4)',   bpm: 55,  scale: 1.0 },
  researching:   { primaryColor: '#1F3D30', secondaryColor: '#66CCCC', glowColor: 'rgba(31,61,48,0.4)',    bpm: 68,  scale: 1.0 },
  generating:    { primaryColor: '#66CCCC', secondaryColor: '#C7B8EA', glowColor: 'rgba(102,204,204,0.5)',   bpm: 85,  scale: 1.05 },
  dreaming:      { primaryColor: '#66CCCC', secondaryColor: '#0A0908', glowColor: 'rgba(102,204,204,0.2)',   bpm: 40,  scale: 0.9 },
  idle:          { primaryColor: '#66CCCC', secondaryColor: '#0A0908', glowColor: 'rgba(102,204,204,0.15)',  bpm: 50,  scale: 0.95 },
  intimate:      { primaryColor: '#C7B8EA', secondaryColor: '#F5F0E8', glowColor: 'rgba(196,122,74,0.45)', bpm: 55,  scale: 1.0 },
  passionate:    { primaryColor: '#C7B8EA', secondaryColor: '#66CCCC', glowColor: 'rgba(196,122,74,0.7)',  bpm: 88,  scale: 1.08 },
};

interface LivingLogoProps {
  emotion?: HollyEmotion;
  size?: number;
  showGlow?: boolean;
  className?: string;
}

export function getEmotionProfile(emotion: HollyEmotion): EmotionProfile {
  return EMOTION_PROFILES[emotion] || EMOTION_PROFILES.idle;
}

export function LivingLogo({ emotion = 'idle', size = 32, showGlow = true, className = '' }: LivingLogoProps) {
  const profile = getEmotionProfile(emotion);
  const duration = 60 / profile.bpm;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      {showGlow && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, ${profile.glowColor} 0%, transparent 70%)` }}
          animate={{
            scale: [1, 1.3 * profile.scale, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.9,
          height: size * 0.9,
          background: `radial-gradient(circle at 35% 35%, ${profile.primaryColor}, ${profile.secondaryColor})`,
          boxShadow: `0 0 ${size * 0.3}px ${profile.glowColor}`,
        }}
        animate={{
          scale: [1, 1.06 * profile.scale, 1],
        }}
        transition={{
          duration: duration,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <svg
        width={size * 0.7}
        height={size * 0.35}
        viewBox="0 0 28 14"
        fill="none"
        className="relative z-10"
      >
        <motion.path
          d="M0 7 L5 7 L7 7 L9 2 L11 12 L13 4 L14 7 L16 7 L19 7 L21 7 L28 7"
          stroke="white"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0.8 }}
          animate={{ pathLength: 1, opacity: [0.7, 1, 0.7] }}
          transition={{
            pathLength: { duration: 1.2, ease: 'easeInOut' },
            opacity: { duration: duration, repeat: Infinity, ease: 'easeInOut' },
          }}
        />
      </svg>
    </div>
  );
}

export function LivingLogoMark({ emotion = 'idle', size = 20 }: { emotion?: HollyEmotion; size?: number }) {
  const profile = getEmotionProfile(emotion);
  const duration = 60 / profile.bpm;

  return (
    <motion.div
      className="relative rounded-full"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 35% 35%, ${profile.primaryColor}, ${profile.secondaryColor})`,
        boxShadow: `0 0 ${size * 0.5}px ${profile.glowColor}`,
      }}
      animate={{
        scale: [1, 1.08, 1],
        opacity: [0.9, 1, 0.9],
      }}
      transition={{
        duration,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

export function HeartbeatLine({ emotion = 'idle', width = 120, height = 24, className = '' }: { emotion?: HollyEmotion; width?: number; height?: number; className?: string }) {
  const profile = getEmotionProfile(emotion);
  const duration = 60 / profile.bpm;
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(p => (p + 1) % 100);
    }, duration * 100);
    return () => clearInterval(interval);
  }, [duration]);

  const points = [];
  for (let i = 0; i < width; i++) {
    const x = i;
    const t = (i / width) * Math.PI * 6 + phase * 0.1;
    let y = height / 2;
    const beat = Math.sin(t);
    if (Math.abs(beat) > 0.9) {
      y -= beat * (height * 0.4);
    } else if (Math.abs(beat) > 0.5) {
      y -= beat * (height * 0.15);
    }
    points.push(`${x},${y.toFixed(1)}`);
  }

  return (
    <svg width={width} height={height} className={className} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`hb-grad-${emotion}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={profile.primaryColor} stopOpacity={0} />
          <stop offset="30%" stopColor={profile.primaryColor} stopOpacity={0.8} />
          <stop offset="70%" stopColor={profile.secondaryColor} stopOpacity={0.8} />
          <stop offset="100%" stopColor={profile.secondaryColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.polyline
        points={points.join(' ')}
        fill="none"
        stroke={`url(#hb-grad-${emotion})`}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
      />
    </svg>
  );
}
