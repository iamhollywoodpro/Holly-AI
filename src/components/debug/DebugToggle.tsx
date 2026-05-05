'use client';

import { Bug } from 'lucide-react';
import { useDebug } from '@/contexts/DebugContext';
import { motion } from 'framer-motion';

export default function DebugToggle() {
  const { isEnabled, toggleDebug, logs } = useDebug();

  return (
    <motion.button
      onClick={toggleDebug}
      className={`relative p-2 rounded-lg transition-all ${
        isEnabled
          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/50'
          : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={isEnabled ? 'Debug mode: ON' : 'Debug mode: OFF'}
    >
      <Bug className="w-5 h-5" />
      
      {/* Notification Badge */}
      {isEnabled && logs.length > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
        >
          {logs.length > 9 ? '9+' : logs.length}
        </motion.span>
      )}
      
      {/* Pulse Animation when enabled */}
      {isEnabled && (
        <motion.span
          className="absolute inset-0 rounded-lg bg-purple-600"
          animate={{
            opacity: [0.5, 0, 0.5],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </motion.button>
  );
}
