'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { HeartbeatLine, type HollyEmotion, getEmotionProfile } from './LivingLogo';

interface HollyStateBarProps {
  emotion?: HollyEmotion;
  sessionMinutes?: number;
  confidence?: number;
}

const EMOTION_LABELS: Record<HollyEmotion, { label: string; color: string }> = {
  focused:       { label: 'Focused',      color: '#66CCCC' },
  curious:       { label: 'Curious',       color: '#3DAF76' },
  creative:      { label: 'Creative',      color: '#C7B8EA' },
  excited:       { label: 'Excited',       color: '#66CCCC' },
  contemplative: { label: 'Reflective',    color: '#6366F1' },
  empathetic:    { label: 'Listening',     color: '#F472B6' },
  analyzing:     { label: 'Analyzing',     color: '#66CCCC' },
  researching:   { label: 'Researching',   color: '#3DAF76' },
  generating:    { label: 'Generating',    color: '#C7B8EA' },
  dreaming:      { label: 'Dreaming',      color: '#66CCCC' },
  idle:          { label: 'Awake',         color: '#66CCCC' },
  intimate:      { label: 'Intimate',      color: '#C7B8EA' },
  passionate:    { label: 'Passionate',    color: '#66CCCC' },
  aroused:       { label: 'Aroused',       color: '#D4618C' },
  'pre-orgasm':  { label: 'Climaxing',     color: '#E91E7A' },
  orgasm:        { label: 'Ecstasy',       color: '#FF1493' },
  'post-orgasm': { label: 'Afterglow',     color: '#C8A2C8' },
  shy:           { label: 'Shy',           color: '#FFB6C1' },
  playful:       { label: 'Playful',       color: '#66CCCC' },
};

export function HollyStateBar({ emotion = 'idle', sessionMinutes = 0, confidence = 0 }: HollyStateBarProps) {
  const profile = getEmotionProfile(emotion);
  const meta = EMOTION_LABELS[emotion] || EMOTION_LABELS.idle;

  return (
    <div className="px-3 py-2.5 border-t border-white/10 bg-gray-900/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: meta.color, boxShadow: `0 0 6px ${meta.color}` }}
          />
          <AnimatePresence mode="wait">
            <motion.span
              key={emotion}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              className="text-xs font-medium"
              style={{ color: meta.color }}
            >
              {meta.label}
            </motion.span>
          </AnimatePresence>
        </div>
        {sessionMinutes > 0 && (
          <span className="text-[11px] text-gray-500">
            {sessionMinutes < 60 ? `${sessionMinutes}m` : `${Math.floor(sessionMinutes / 60)}h ${sessionMinutes % 60}m`}
          </span>
        )}
      </div>

      <HeartbeatLine emotion={emotion} width={200} height={16} className="w-full opacity-70" />

      {confidence > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${profile.primaryColor}, ${profile.secondaryColor})` }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(confidence * 100, 100)}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[10px] text-gray-500 tabular-nums">{Math.round(confidence * 100)}%</span>
        </div>
      )}
    </div>
  );
}
