'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMemo, useEffect, useState } from 'react';
import { useResolvedVisuals } from './useVisualIdentity';
import { type HollyEmotion } from './LivingLogo';

interface LivingHollyOrbProps {
  /** Current emotion — drives instant visual changes */
  emotion?: HollyEmotion;
  /** Whether Holly is thinking (shows intensified glow + outer ring) */
  isThinking?: boolean;
  /** Whether Holly is streaming a response (pulsing animation) */
  isStreaming?: boolean;
  /** Orb diameter in pixels */
  size?: number;
  /** Show "HOLLY" name label */
  showName?: boolean;
  /** Show emotional state label */
  showState?: boolean;
  /** Additional CSS class */
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

/**
 * LivingHollyOrb — Holly's living, breathing visual presence.
 *
 * Unlike HollyOrb (which uses hardcoded colors), this component consumes
 * the visual identity engine's rendering context. It:
 * - Uses server-driven colors, gradients, and form shapes
 * - Breathes at the BPM determined by Holly's emotional state
 * - Shifts form shape (circle → blob → crystal → nebula) based on style
 * - Shows particles that respond to energy level
 * - Instantly reacts to emotion changes via local state,
 *   then smoothly transitions when server rendering context updates
 */
export function LivingHollyOrb({
  emotion = 'idle',
  isThinking = false,
  isStreaming = false,
  size = 48,
  showName = false,
  showState = false,
  className = '',
}: LivingHollyOrbProps) {
  const visuals = useResolvedVisuals();
  const activeEmotion = isThinking ? 'focused' : isStreaming ? 'generating' : emotion;
  const duration = 60 / visuals.bpm;

  // Particle positions (regenerate when count changes)
  const particles = useMemo(() => {
    if (!visuals.particles) return [];
    const count = Math.min(visuals.particles.count, 30);
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      delay: Math.random() * 2,
      size: visuals.particles!.size.min + Math.random() * (visuals.particles!.size.max - visuals.particles!.size.min),
      speed: visuals.particles!.speed.min + Math.random() * (visuals.particles!.speed.max - visuals.particles!.speed.min),
      opacity: visuals.particles!.opacity.min + Math.random() * (visuals.particles!.opacity.max - visuals.particles!.opacity.min),
    }));
  }, [visuals.particles?.count, visuals.particles?.size, visuals.particles?.speed, visuals.particles?.opacity]);

  // Form path — generates SVG path based on shape type
  const formPath = useMemo(() => {
    if (!visuals.form) return null;
    const { shape, baseRadius, distortion, segments } = visuals.form;
    const r = baseRadius * (size / 200); // Scale to component size

    if (shape === 'circle') return null; // Use CSS border-radius
    if (shape === 'hexagon' || shape === 'crystal') {
      const sides = segments || (shape === 'hexagon' ? 6 : 8);
      const points = Array.from({ length: sides }, (_, i) => {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
        const jitter = 1 + (Math.random() - 0.5) * distortion * 0.02;
        return `${Math.cos(angle) * r * jitter},${Math.sin(angle) * r * jitter}`;
      });
      return `M ${points.join(' L ')} Z`;
    }
    // Blob / nebula — use bezier curves
    if (shape === 'blob' || shape === 'nebula') {
      const pts = segments || 12;
      const points: { x: number; y: number }[] = [];
      for (let i = 0; i < pts; i++) {
        const angle = (Math.PI * 2 * i) / pts;
        const jitter = 1 + (Math.random() - 0.5) * distortion * 0.03;
        points.push({
          x: Math.cos(angle) * r * jitter,
          y: Math.sin(angle) * r * jitter,
        });
      }
      let d = `M ${points[0].x},${points[0].y}`;
      for (let i = 0; i < points.length; i++) {
        const curr = points[i];
        const next = points[(i + 1) % points.length];
        const cpx = (curr.x + next.x) / 2;
        const cpy = (curr.y + next.y) / 2;
        d += ` Q ${curr.x},${curr.y} ${cpx},${cpy}`;
      }
      d += ' Z';
      return d;
    }
    return null;
  }, [visuals.form, size]);

  const isCircular = !visuals.form || visuals.form.shape === 'circle';

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: size * 1.8, height: size * 1.8 }}
      >
        {/* Layer 1: Ambient Glow */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: size * 1.6,
            height: size * 1.6,
            background: `radial-gradient(circle, ${visuals.glowColor} 0%, transparent 70%)`,
          }}
          animate={{
            scale: [1, 1.4 * visuals.scale, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Layer 2: Particles */}
        {particles.length > 0 && (
          <div className="absolute inset-0" style={{ width: size * 1.8, height: size * 1.8 }}>
            {particles.map((p) => (
              <motion.div
                key={p.id}
                className="absolute rounded-full"
                style={{
                  width: p.size,
                  height: p.size,
                  background: visuals.primaryColor,
                  left: '50%',
                  top: '50%',
                }}
                animate={{
                  x: [0, p.x * size * 0.6, 0],
                  y: [0, p.y * size * 0.6, 0],
                  opacity: [0, p.opacity, 0],
                }}
                transition={{
                  duration: p.speed + 1,
                  delay: p.delay,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
        )}

        {/* Layer 3: Outer ring (thinking/streaming) */}
        {(isThinking || isStreaming) && (
          <motion.div
            className="absolute rounded-full border"
            style={{
              width: size * 1.3,
              height: size * 1.3,
              borderColor: visuals.primaryColor,
              borderWidth: visuals.form?.strokeWidth || 1,
            }}
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

        {/* Layer 4: Core Form */}
        {isCircular ? (
          <motion.div
            className="relative rounded-full z-10"
            style={{
              width: size,
              height: size,
              background: `radial-gradient(circle at 30% 30%, ${visuals.primaryColor}, ${visuals.secondaryColor})`,
              boxShadow: `inset -2px -2px 6px rgba(0,0,0,0.5), inset 2px 2px 6px rgba(255,255,255,0.3), 0 0 ${size * 0.4}px ${visuals.glowColor}`,
            }}
            animate={{
              scale: [1, 1.05 * visuals.scale, 1],
            }}
            transition={{
              duration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {/* Specular highlight */}
            <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3 bg-white rounded-full opacity-30 mix-blend-overlay blur-[2px]" />
          </motion.div>
        ) : (
          <motion.svg
            width={size * 1.2}
            height={size * 1.2}
            viewBox={`${-size * 0.7} ${-size * 0.7} ${size * 1.4} ${size * 1.4}`}
            className="relative z-10"
          >
            <defs>
              <radialGradient id="holly-orb-gradient" cx="30%" cy="30%">
                <stop offset="0%" stopColor={visuals.primaryColor} />
                <stop offset="100%" stopColor={visuals.secondaryColor} />
              </radialGradient>
            </defs>
            {formPath && (
              <motion.path
                d={formPath}
                fill="url(#holly-orb-gradient)"
                stroke={visuals.form?.stroke || visuals.primaryColor}
                strokeWidth={visuals.form?.strokeWidth || 1}
                animate={{
                  scale: [1, 1.05 * visuals.scale, 1],
                }}
                transition={{
                  duration,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{ transformOrigin: 'center' }}
              />
            )}
          </motion.svg>
        )}
      </div>

      {/* Name and state labels */}
      {(showName || showState) && (
        <div className="flex flex-col">
          {showName && (
            <span
              className="text-[11px] font-black tracking-widest uppercase"
              style={{ color: visuals.primaryColor }}
            >
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
                className="text-[9px] font-medium tracking-wider uppercase"
                style={{ color: `${visuals.primaryColor}99` }}
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
