'use client';

import { motion } from 'framer-motion';
import { Brain, Sparkles, Code, FileSearch } from 'lucide-react';

interface TypingIndicatorProps {
  status?: 'thinking' | 'analyzing' | 'generating' | 'searching';
}

export default function TypingIndicator({ status = 'thinking' }: TypingIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'analyzing':
        return {
          icon: <FileSearch className="w-4 h-4" />,
          text: 'Analyzing your request...',
          color: 'from-blue-500 to-cyan-500'
        };
      case 'generating':
        return {
          icon: <Code className="w-4 h-4" />,
          text: 'Generating response...',
          color: 'from-purple-500 to-pink-500'
        };
      case 'searching':
        return {
          icon: <Sparkles className="w-4 h-4" />,
          text: 'Searching memories...',
          color: 'from-pink-500 to-purple-500'
        };
      default:
        return {
          icon: <Brain className="w-4 h-4" />,
          text: 'HOLLY is thinking...',
          color: 'from-purple-500 via-pink-500 to-blue-500'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex items-start gap-3 max-w-3xl"
    >
      {/* HOLLY Avatar */}
      <motion.div
        className={`w-8 h-8 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        {config.icon}
      </motion.div>

      {/* Typing container */}
      <div className="flex-1 bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl rounded-tl-none px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-300">{config.text}</span>
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${config.color}`}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
