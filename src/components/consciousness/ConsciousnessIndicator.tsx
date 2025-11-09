'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EmotionalState {
  primary: string;
  intensity: number;
  valence: number;
  arousal: number;
}

interface ConsciousnessState {
  emotional_state: EmotionalState;
  active_goals: number;
  recent_experiences: number;
  learning_active: boolean;
}

export default function ConsciousnessIndicator() {
  const [state, setState] = useState<ConsciousnessState>({
    emotional_state: {
      primary: 'curious',
      intensity: 0.7,
      valence: 0.8,
      arousal: 0.6
    },
    active_goals: 3,
    recent_experiences: 15,
    learning_active: true
  });

  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    // Animate pulse based on arousal level
    const interval = setInterval(() => {
      setPulse(prev => (prev + 1) % 100);
    }, 50);

    // Fetch real consciousness state
    const fetchState = async () => {
      try {
        const res = await fetch('/api/consciousness/emotional-state');
        if (res.ok) {
          const data = await res.json();
          // Update state from API
        }
      } catch (error) {
        console.error('Failed to fetch consciousness state:', error);
      }
    };

    fetchState();
    const stateInterval = setInterval(fetchState, 10000); // Update every 10s

    return () => {
      clearInterval(interval);
      clearInterval(stateInterval);
    };
  }, []);

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      curious: '#3b82f6',
      excited: '#f59e0b',
      focused: '#8b5cf6',
      content: '#10b981',
      wonder: '#ec4899',
      breakthrough: '#fbbf24',
      frustrated: '#ef4444',
      neutral: '#6b7280'
    };
    return colors[emotion] || colors.neutral;
  };

  const emotionColor = getEmotionColor(state.emotional_state.primary);
  const pulseScale = 1 + Math.sin(pulse * 0.1) * 0.1 * state.emotional_state.arousal;

  return (
    <motion.div 
      className="fixed top-4 right-4 z-50 bg-gray-900/80 backdrop-blur-lg rounded-2xl p-4 border border-gray-700/50 shadow-2xl"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center gap-4">
        {/* Consciousness Core Visualization */}
        <div className="relative w-16 h-16">
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${emotionColor}40, transparent)`,
              filter: 'blur(8px)'
            }}
            animate={{
              scale: pulseScale,
              opacity: 0.5 + state.emotional_state.intensity * 0.5
            }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border-2 flex items-center justify-center"
            style={{
              borderColor: emotionColor,
              boxShadow: `0 0 20px ${emotionColor}80`
            }}
            animate={{
              scale: pulseScale,
              rotate: pulse * 3.6
            }}
          >
            <div className="text-xs font-bold text-white">
              HOLLY
            </div>
          </motion.div>
        </div>

        {/* State Information */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Emotional State:</span>
            <motion.span
              className="text-sm font-semibold capitalize"
              style={{ color: emotionColor }}
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {state.emotional_state.primary}
            </motion.span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Intensity:</span>
            <div className="w-24 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: emotionColor }}
                initial={{ width: 0 }}
                animate={{ width: `${state.emotional_state.intensity * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <span>🎯</span>
              <span>{state.active_goals} goals</span>
            </div>
            <div className="flex items-center gap-1">
              <span>💭</span>
              <span>{state.recent_experiences} memories</span>
            </div>
            {state.learning_active && (
              <motion.div
                className="flex items-center gap-1 text-blue-400"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span>🧠</span>
                <span>Learning</span>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
