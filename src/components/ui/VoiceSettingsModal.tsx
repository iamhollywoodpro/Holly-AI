/**
 * Voice Settings Modal
 * Control HOLLY's voice output preferences
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Volume2, Settings, Sparkles } from 'lucide-react';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VoiceSettingsModal({ isOpen, onClose }: VoiceSettingsModalProps) {
  const {
    enabled,
    autoSpeak,
    provider,
    rate,
    pitch,
    volume,
    toggleEnabled,
    toggleAutoSpeak,
    setProvider,
    setRate,
    setPitch,
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
                  <p className="text-sm text-gray-400">Customize HOLLY's voice</p>
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
                  {/* Auto-Speak Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-white">Auto-Speak</label>
                      <p className="text-xs text-gray-400">Automatically speak all messages</p>
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

                  {/* Provider Selection */}
                  <div>
                    <label className="text-sm font-medium text-white mb-2 block">Voice Provider</label>
                    <div className="grid grid-cols-2 gap-2">
                      <motion.button
                        onClick={() => setProvider('browser')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          provider === 'browser'
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Settings className="w-5 h-5 mx-auto mb-1 text-gray-300" />
                        <p className="text-xs font-medium text-white">Browser</p>
                        <p className="text-[10px] text-gray-400">Free</p>
                      </motion.button>
                      <motion.button
                        onClick={() => setProvider('elevenlabs')}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          provider === 'elevenlabs'
                            ? 'border-purple-500 bg-purple-500/20'
                            : 'border-gray-600 bg-gray-800/50 hover:border-gray-500'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Sparkles className="w-5 h-5 mx-auto mb-1 text-purple-400" />
                        <p className="text-xs font-medium text-white">ElevenLabs</p>
                        <p className="text-[10px] text-gray-400">Premium</p>
                      </motion.button>
                    </div>
                  </div>

                  {/* Speech Rate */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-white">Speech Rate</label>
                      <span className="text-xs text-gray-400">{rate.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={rate}
                      onChange={(e) => setRate(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Slower</span>
                      <span>Faster</span>
                    </div>
                  </div>

                  {/* Pitch */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-white">Pitch</label>
                      <span className="text-xs text-gray-400">{pitch.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={pitch}
                      onChange={(e) => setPitch(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Lower</span>
                      <span>Higher</span>
                    </div>
                  </div>

                  {/* Volume */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-white">Volume</label>
                      <span className="text-xs text-gray-400">{Math.round(volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.1"
                      value={volume}
                      onChange={(e) => setVolume(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Quieter</span>
                      <span>Louder</span>
                    </div>
                  </div>
                </>
              )}

              {/* Reset Button */}
              <motion.button
                onClick={resetToDefaults}
                className="w-full py-2 px-4 rounded-lg border border-gray-600 hover:border-gray-500 text-sm text-gray-300 hover:text-white transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Reset to Defaults
              </motion.button>

              {/* Info */}
              {provider === 'elevenlabs' && (
                <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <p className="text-xs text-purple-300">
                    <strong>ElevenLabs</strong> requires an API key in your <code className="text-xs bg-black/30 px-1 py-0.5 rounded">.env.local</code> file. 
                    Falls back to browser TTS if not configured.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
