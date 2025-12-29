/**
 * Voice Settings Modal
 * Control HOLLY's voice output preferences (Gemini TTS only)
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, Sparkles } from 'lucide-react';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceSettingsModal({ isOpen, onClose }: VoiceSettingsModalProps) {
  const {
    enabled,
    autoSpeak,
    volume,
    toggleEnabled,
    toggleAutoSpeak,
    setVolume,
    resetToDefaults,
  } = useVoiceSettings();

  if (!isOpen) return null;

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

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md glass rounded-2xl p-6 z-50 shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                  <Volume2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Voice Settings</h2>
                  <p className="text-sm text-gray-400">HOLLY's Gemini TTS voice</p>
                </div>
              </div>
              <motion.button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <X className="w-5 h-5 text-gray-400" />
              </motion.button>
            </div>

            {/* Settings */}
            <div className="space-y-6">
              {/* Enable/Disable Voice */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-white">Voice Output</label>
                  <p className="text-xs text-gray-400">Enable HOLLY's voice responses</p>
                </div>
                <motion.button
                  onClick={toggleEnabled}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    enabled ? 'bg-purple-500' : 'bg-gray-600'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                    animate={{ x: enabled ? 24 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </motion.button>
              </div>

              {enabled && (
                <>
                  {/* Auto-Speak */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-white">Auto-Speak Messages</label>
                      <p className="text-xs text-gray-400">Automatically read all responses</p>
                    </div>
                    <motion.button
                      onClick={toggleAutoSpeak}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        autoSpeak ? 'bg-purple-500' : 'bg-gray-600'
                      }`}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                        animate={{ x: autoSpeak ? 24 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </motion.button>
                  </div>

                  {/* Volume Control */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-white">Volume</label>
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

                  {/* Voice Info */}
                  <div className="glass-card rounded-lg p-4 border border-purple-500/20">
                    <div className="flex items-start gap-3">
                      <Sparkles className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-white mb-1">Gemini TTS TTS</p>
                        <p className="text-xs text-gray-400">
                          Self-hosted, high-quality neural voice synthesis with HOLLY's custom voice profile.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-white/10">
              <motion.button
                onClick={resetToDefaults}
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm font-medium text-white transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Reset to Defaults
              </motion.button>
              <motion.button
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-sm font-medium text-white transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Done
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
