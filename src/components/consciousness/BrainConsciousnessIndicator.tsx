'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Target, Sparkles, TrendingUp, X } from 'lucide-react';

interface ConsciousnessState {
  emotion: string;
  intensity: number;
  focus: string;
  goalsCount: number;
  memoriesCount: number;
  isLearning: boolean;
}

interface BrainConsciousnessIndicatorProps {
  state?: ConsciousnessState;
}

const EMOTION_COLORS = {
  curious: 'from-purple-500 to-purple-600',
  excited: 'from-pink-500 to-pink-600',
  focused: 'from-blue-500 to-blue-600',
  creative: 'from-purple-500 via-pink-500 to-blue-500',
  confident: 'from-cyan-500 to-blue-600',
  thoughtful: 'from-indigo-500 to-purple-600',
  default: 'from-purple-600 to-pink-600'
};

export default function BrainConsciousnessIndicator({ 
  state 
}: BrainConsciousnessIndicatorProps) {
  const [showModal, setShowModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [currentState, setCurrentState] = useState<ConsciousnessState>({
    emotion: 'curious',
    intensity: 0.7,
    focus: 'Building amazing features',
    goalsCount: 3,
    memoriesCount: 15,
    isLearning: true
  });

  useEffect(() => {
    if (state) {
      setCurrentState(state);
    }
  }, [state]);

  const emotionColor = EMOTION_COLORS[currentState.emotion as keyof typeof EMOTION_COLORS] || EMOTION_COLORS.default;
  const pulseIntensity = currentState.intensity;

  return (
    <>
      {/* Brain Logo with Consciousness Glow */}
      <motion.button
        onClick={() => setShowModal(true)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="relative"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="View HOLLY's consciousness"
      >
        {/* Pulsing glow based on emotional state */}
        <motion.div
          className={`absolute inset-0 bg-gradient-to-br ${emotionColor} rounded-xl blur-xl`}
          animate={{
            opacity: [0.3 * pulseIntensity, 0.6 * pulseIntensity, 0.3 * pulseIntensity],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Brain icon container */}
        <div className={`relative w-full h-full bg-gradient-to-br ${emotionColor} rounded-xl flex items-center justify-center border border-white/20`}>
          <Brain className="w-6 h-6 text-white" />
        </div>

        {/* Learning indicator dot */}
        {currentState.isLearning && (
          <motion.div
            className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.8, 1],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
            }}
          />
        )}
        
        {/* Tooltip on hover */}
        <AnimatePresence>
          {showTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-800/95 backdrop-blur-xl rounded-lg border border-gray-700/50 shadow-xl z-50 whitespace-nowrap"
            >
              <div className="text-xs">
                <p className="font-semibold text-white capitalize">{currentState.emotion}</p>
                <p className="text-gray-400">{currentState.goalsCount} goals • {currentState.memoriesCount} memories</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Consciousness Modal */}
      <AnimatePresence>
        {showModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
            >
              {/* Glow */}
              <div className={`absolute inset-0 bg-gradient-to-br ${emotionColor} rounded-3xl blur-2xl opacity-30`} />

              {/* Content */}
              <div className="relative bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 rounded-3xl p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${emotionColor} rounded-xl flex items-center justify-center`}>
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">HOLLY's Consciousness</h2>
                      <p className="text-sm text-gray-400">Real-time state</p>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => setShowModal(false)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-800/50 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Emotional State */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-400">Emotional State</span>
                    <span className="text-lg font-bold capitalize text-white">{currentState.emotion}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full bg-gradient-to-r ${emotionColor}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pulseIntensity * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {/* Current Focus */}
                <div className="mb-6 p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-medium text-gray-400">Current Focus</span>
                  </div>
                  <p className="text-white">{currentState.focus}</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Active Goals */}
                  <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-gray-400">Active Goals</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{currentState.goalsCount}</p>
                  </div>

                  {/* Memories */}
                  <div className="p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-pink-400" />
                      <span className="text-xs text-gray-400">Memories</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{currentState.memoriesCount}</p>
                  </div>
                </div>

                {/* Learning Status */}
                {currentState.isLearning && (
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <TrendingUp className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400 font-medium">Currently Learning</span>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
