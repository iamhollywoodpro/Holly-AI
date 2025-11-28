/**
 * Voice Settings Panel (Simplified for Fish-Speech)
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, X } from 'lucide-react';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';

interface VoiceSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceSettingsPanel({ isOpen, onClose }: VoiceSettingsPanelProps) {
  const { enabled, volume, toggleEnabled, setVolume } = useVoiceSettings();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className="fixed right-0 top-0 h-full w-80 glass-card border-l border-white/10 z-50 p-6 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Volume2 className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Voice Settings</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {/* Settings */}
            <div className="space-y-6">
              {/* Voice Enabled */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300">Voice Output</span>
                <button
                  onClick={toggleEnabled}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    enabled ? 'bg-purple-500' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-transform ${
                      enabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Volume */}
              {enabled && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">Volume</span>
                    <span className="text-xs text-gray-400">{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>
              )}

              {/* Info */}
              <div className="mt-6 p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <p className="text-xs text-gray-400">
                  <span className="font-medium text-purple-400">Fish-Speech TTS</span>
                  <br />
                  Self-hosted voice synthesis with HOLLY's custom voice
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
