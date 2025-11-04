'use client';

import { motion } from 'framer-motion';
import { EmotionType } from '@/store/chat-store';

interface HollyAvatarProps {
  emotion?: EmotionType;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const emotionColors: Record<EmotionType, string> = {
  focused: 'from-holly-purple-600 to-holly-blue-500',
  excited: 'from-holly-purple-500 to-holly-gold-400',
  thoughtful: 'from-holly-blue-600 to-holly-purple-700',
  playful: 'from-holly-gold-400 to-holly-purple-500',
  confident: 'from-holly-purple-600 via-holly-purple-500 to-holly-blue-500',
  curious: 'from-holly-blue-400 to-holly-purple-400',
};

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

export function HollyAvatar({ emotion = 'confident', size = 'md', animated = true }: HollyAvatarProps) {
  const gradientClass = emotionColors[emotion];

  return (
    <motion.div
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center font-bold text-white relative overflow-hidden`}
      animate={animated ? {
        scale: [1, 1.05, 1],
        rotate: [0, 5, -5, 0],
      } : {}}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* Holographic shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-holly-shimmer opacity-30"
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      {/* Letter H */}
      <span className={`relative z-10 ${size === 'sm' ? 'text-sm' : size === 'md' ? 'text-xl' : 'text-3xl'}`}>
        H
      </span>

      {/* Glow effect */}
      <div className="absolute inset-0 glow-purple rounded-full opacity-50" />
    </motion.div>
  );
}
