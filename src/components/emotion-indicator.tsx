'use client';

import { motion } from 'framer-motion';
import { Brain, Sparkles, Zap, Heart, Target, Eye } from 'lucide-react';
import { EmotionType } from '@/store/chat-store';

interface EmotionIndicatorProps {
  emotion: EmotionType;
}

const emotionConfig: Record<EmotionType, { icon: any; label: string; color: string }> = {
  focused: { icon: Target, label: 'Focused', color: 'text-holly-blue-500' },
  excited: { icon: Sparkles, label: 'Excited', color: 'text-holly-gold-400' },
  thoughtful: { icon: Brain, label: 'Thinking', color: 'text-holly-purple-400' },
  playful: { icon: Heart, label: 'Playful', color: 'text-pink-400' },
  confident: { icon: Zap, label: 'Confident', color: 'text-holly-purple-500' },
  curious: { icon: Eye, label: 'Curious', color: 'text-holly-blue-400' },
};

export function EmotionIndicator({ emotion }: EmotionIndicatorProps) {
  const config = emotionConfig[emotion];
  const Icon = config.icon;

  return (
    <motion.div
      className="flex items-center gap-2 glass px-4 py-2 rounded-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 10, -10, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <Icon className={`w-4 h-4 ${config.color}`} />
      </motion.div>
      <span className="text-sm text-gray-300">
        {config.label}
      </span>
      <motion.div
        className="w-2 h-2 rounded-full bg-holly-purple-500"
        animate={{
          opacity: [0.3, 1, 0.3],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
    </motion.div>
  );
}
