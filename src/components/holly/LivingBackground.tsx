'use client';

import { motion } from 'framer-motion';
import { getEmotionProfile, type HollyEmotion } from './LivingLogo';

interface LivingBackgroundProps {
  emotion?: HollyEmotion;
  intensity?: number;
  children: React.ReactNode;
}

export function LivingBackground({ emotion = 'idle', intensity = 0.15, children }: LivingBackgroundProps) {
  const profile = getEmotionProfile(emotion);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <motion.div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 20%, ${profile.primaryColor}${Math.round(intensity * 255).toString(16).padStart(2, '0')} 0%, transparent 60%),
              radial-gradient(ellipse 60% 80% at 80% 80%, ${profile.secondaryColor}${Math.round(intensity * 200).toString(16).padStart(2, '0')} 0%, transparent 60%),
              radial-gradient(ellipse 50% 50% at 50% 50%, ${profile.glowColor} 0%, transparent 70%)
            `,
          }}
          animate={{
            opacity: [0.4, 0.7, 0.4],
          }}
          transition={{
            duration: 60 / profile.bpm * 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 30% 70%, ${profile.glowColor} 0%, transparent 50%)`,
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
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
