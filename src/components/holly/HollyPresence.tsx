'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { LivingLogo, type HollyEmotion, getEmotionProfile } from './LivingLogo';

interface HollyPresenceProps {
  emotion?: HollyEmotion;
  isThinking?: boolean;
  isStreaming?: boolean;
  size?: number;
  showName?: boolean;
  showState?: boolean;
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
};

export function HollyPresence({
  emotion = 'idle',
  isThinking = false,
  isStreaming = false,
  size = 36,
  showName = true,
  showState = false,
}: HollyPresenceProps) {
  const activeEmotion: HollyEmotion = isThinking ? 'focused' : isStreaming ? 'generating' : emotion;
  const profile = getEmotionProfile(activeEmotion);
  const duration = 60 / profile.bpm;

  return (
    <div className="flex items-center gap-2.5">
      <div className="relative">
        {isThinking && (
          <motion.div
            className="absolute -inset-1 rounded-full"
            style={{
              background: `radial-gradient(circle, ${profile.glowColor} 0%, transparent 70%)`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: duration * 0.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
        <LivingLogo emotion={activeEmotion} size={size} showGlow={!isThinking} />
      </div>

      <div className="flex flex-col">
        {showName && (
          <span className="text-xs font-semibold tracking-wide" style={{ color: profile.primaryColor }}>
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
              className="text-[10px] text-gray-500 capitalize"
            >
              {STATE_LABELS[activeEmotion] || 'awake'}
            </motion.span>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
