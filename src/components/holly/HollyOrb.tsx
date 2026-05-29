'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { type HollyEmotion } from './LivingLogo';

interface HollyOrbProps {
  emotion?: HollyEmotion;
  isThinking?: boolean;
  isStreaming?: boolean;
  size?: number;
  showName?: boolean;
  showState?: boolean;
  className?: string;
}

const STATE_LABELS: Record<string, string> = {
  focused: 'focused',
  curious: 'exploring',
  creative: 'creating',
  excited: 'energized',
  contemplative: 'reflecting',
  empathetic: 'listening',
  analyzing: 'analyzing',
  researching: 'researching',
  generating: 'generating',
  dreaming: 'dreaming',
  idle: 'awake',
  intimate: 'close',
  passionate: 'yearning',
};

// The Living Palette: Semantic tokens mapping emotions to Gold, Crimson, Ivory
interface OrbProfile {
  primary: string;
  secondary: string;
  glow: string;
  bpm: number;
  scale: number;
}

// Living Palette Colors — Holly-Centric Design System
const COLORS = {
  Emerald: '#2D8B5E',  // Her green eyes
  Copper: '#C47A4A',   // Her auburn hair
  Gold: '#D4A853',     // Highlights
  Ivory: '#F5F0E8',    // Warm foreground
  Void: '#0A0908',     // Deep background
};

// Emotion to Living Palette Mapping
const ORB_PROFILES: Record<HollyEmotion, OrbProfile> = {
  idle:          { primary: COLORS.Emerald, secondary: COLORS.Void, glow: 'rgba(45,139,94,0.2)', bpm: 50, scale: 0.95 },
  focused:       { primary: COLORS.Emerald, secondary: COLORS.Copper, glow: 'rgba(45,139,94,0.4)', bpm: 60, scale: 1.0 },
  curious:       { primary: COLORS.Emerald, secondary: COLORS.Ivory, glow: 'rgba(45,139,94,0.3)', bpm: 72, scale: 1.0 },
  creative:      { primary: COLORS.Copper, secondary: COLORS.Gold, glow: 'rgba(196,122,74,0.4)', bpm: 80, scale: 1.05 },
  excited:       { primary: COLORS.Copper, secondary: COLORS.Gold, glow: 'rgba(196,122,74,0.6)', bpm: 96, scale: 1.1 },
  contemplative: { primary: COLORS.Ivory, secondary: COLORS.Void, glow: 'rgba(245,240,232,0.2)', bpm: 48, scale: 0.95 },
  empathetic:    { primary: COLORS.Copper, secondary: COLORS.Ivory, glow: 'rgba(196,122,74,0.3)', bpm: 65, scale: 1.0 },
  analyzing:     { primary: COLORS.Emerald, secondary: COLORS.Ivory, glow: 'rgba(45,139,94,0.4)', bpm: 55, scale: 1.0 },
  researching:   { primary: COLORS.Emerald, secondary: COLORS.Void, glow: 'rgba(45,139,94,0.4)', bpm: 68, scale: 1.0 },
  generating:    { primary: COLORS.Copper, secondary: COLORS.Gold, glow: 'rgba(196,122,74,0.5)', bpm: 85, scale: 1.05 },
  dreaming:      { primary: COLORS.Emerald, secondary: COLORS.Void, glow: 'rgba(45,139,94,0.15)', bpm: 40, scale: 0.9 },
  intimate:      { primary: COLORS.Copper, secondary: COLORS.Ivory, glow: 'rgba(196,122,74,0.45)', bpm: 55, scale: 1.0 },
  passionate:    { primary: COLORS.Copper, secondary: COLORS.Gold, glow: 'rgba(196,122,74,0.7)', bpm: 88, scale: 1.08 },
};

export function HollyOrb({
  emotion = 'idle',
  isThinking = false,
  isStreaming = false,
  size = 36,
  showName = true,
  showState = false,
  className = '',
}: HollyOrbProps) {
  const activeEmotion: HollyEmotion = isThinking ? 'focused' : isStreaming ? 'generating' : emotion;
  const profile = ORB_PROFILES[activeEmotion] || ORB_PROFILES.idle;
  const duration = 60 / profile.bpm;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Ambient Glow */}
        <motion.div
          className="absolute inset-0 rounded-full blur-xl"
          style={{ background: profile.glow }}
          animate={{
            scale: [1, 1.4 * profile.scale, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Outer Ring / Breathing Layer */}
        {(isThinking || isStreaming) && (
          <motion.div
            className="absolute -inset-1 rounded-full border border-white/20"
            style={{ borderColor: profile.primary }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.6, 0.2],
            }}
            transition={{
              duration: duration * 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}

        {/* The Core Orb */}
        <motion.div
          className="relative rounded-full z-10"
          style={{
            width: size * 0.85,
            height: size * 0.85,
            background: `radial-gradient(circle at 30% 30%, ${profile.primary}, ${profile.secondary})`,
            boxShadow: `inset -2px -2px 6px rgba(0,0,0,0.5), inset 2px 2px 6px rgba(255,255,255,0.3), 0 0 ${size * 0.4}px ${profile.glow}`,
          }}
          animate={{
            scale: [1, 1.05 * profile.scale, 1],
          }}
          transition={{
            duration: duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          {/* Surface Detail / Specular Highlight */}
          <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3 bg-white rounded-full opacity-30 mix-blend-overlay blur-[2px]" />
        </motion.div>
      </div>

      {(showName || showState) && (
        <div className="flex flex-col">
          {showName && (
            <span className="text-[11px] font-black tracking-widest uppercase text-[#F5F0E8]">
              HOLLY
            </span>
          )}
          {showState && (
            <AnimatePresence mode="wait">
              <motion.span
                key={activeEmotion}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.2 }}
                className="text-[9px] font-medium tracking-wider uppercase text-[#2D8B5E]/70"
              >
                {STATE_LABELS[activeEmotion] || 'awake'}
              </motion.span>
            </AnimatePresence>
          )}
        </div>
      )}
    </div>
  );
}
