'use client';

import { motion } from 'framer-motion';
import { HollyAvatar } from './holly-avatar';

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
      className="flex gap-4 mb-6"
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <HollyAvatar emotion="thoughtful" size="md" animated={true} />
      </div>

      {/* Typing animation */}
      <div className="glass px-5 py-3 rounded-2xl rounded-tl-none">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-holly-purple-500 rounded-full"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
