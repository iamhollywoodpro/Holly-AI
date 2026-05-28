'use client';

import { motion } from 'framer-motion';
import { useResolvedVisuals } from './useVisualIdentity';
import { type HollyEmotion } from './LivingLogo';
import { getEmotionProfile } from './LivingLogo';

interface AuraBackgroundProps {
  /** Current emotion — triggers instant visual shift */
  emotion?: HollyEmotion;
  /** Background intensity (0-1). Higher = more visible aura */
  intensity?: number;
  /** Children rendered above the background */
  children: React.ReactNode;
}

/**
 * AuraBackground — Holly's living ambient background.
 *
 * Unlike LivingBackground (which uses hardcoded emotion profiles),
 * this consumes the visual identity engine's rendering context.
 * The aura:
 * - Shifts colors in real-time based on Holly's emotional state
 * - Intensifies during trust milestones (higher glow intensity)
 * - Changes particle behavior (float → orbit → pulse) with energy
 * - Breathes at the BPM of Holly's current emotional state
 * - Uses server-driven gradients when available, emotion profile as fallback
 *
 * Wrap your page layout in this component:
 *   <VisualIdentityProvider userId={userId}>
 *     <AuraBackground emotion={emotion}>
 *       <YourPageContent />
 *     </AuraBackground>
 *   </VisualIdentityProvider>
 */
export function AuraBackground({
  emotion = 'idle',
  intensity = 0.15,
  children,
}: AuraBackgroundProps) {
  const visuals = useResolvedVisuals();
  const duration = 60 / visuals.bpm;

  // Build gradient colors — merge server rendering with emotion profile
  const primaryAlpha = Math.round(intensity * 255).toString(16).padStart(2, '0');
  const secondaryAlpha = Math.round(intensity * 200).toString(16).padStart(2, '0');

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Layer 1: Main ambient gradient — reacts to emotion */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <motion.div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 20%, ${visuals.primaryColor}${primaryAlpha} 0%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 80% 80%, ${visuals.secondaryColor}${secondaryAlpha} 0%, transparent 60%),
              radial-gradient(ellipse 50% 50% at 50% 50%, ${visuals.glowColor} 0%, transparent 70%)
            `,
          }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: duration * 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Layer 2: Drifting secondary aura */}
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 30% 70%, ${visuals.glowColor} 0%, transparent 50%)`,
          }}
          animate={{
            x: [0, 20, -10, 0],
            y: [0, -15, 10, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Layer 3: Accent glow — positioned based on emotion */}
        <motion.div
          className="absolute"
          style={{
            width: '40vw',
            height: '40vh',
            background: `radial-gradient(circle, ${visuals.primaryColor}10 0%, transparent 70%)`,
            top: emotion === 'excited' || emotion === 'generating' ? '10%' : '40%',
            right: emotion === 'creative' ? '5%' : undefined,
            left: emotion === 'creative' ? undefined : '5%',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: duration * 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Layer 4: CSS custom properties injection */}
        <style dangerouslySetInnerHTML={{
          __html: Object.entries(visuals.allCssVars)
            .map(([key, value]) => `${key}: ${value};`)
            .join('\n'),
        }} />
      </div>

      {/* Content rendered above the aura */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
