'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX, Mic, Settings, X } from 'lucide-react';
import { voiceService, VoiceSettings, VoiceModel } from '@/lib/voice/voice-service';

interface VoiceSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VoiceSettingsPanel({ isOpen, onClose }: VoiceSettingsPanelProps) {
  const [settings, setSettings] = useState<VoiceSettings>(voiceService.getState().settings);

  useEffect(() => {
    const unsubscribe = voiceService.subscribe((state) => {
      setSettings(state.settings);
    });
    return unsubscribe;
  }, []);

  const updateSetting = <K extends keyof VoiceSettings>(
    key: K,
    value: VoiceSettings[K]
  ) => {
    voiceService.updateSettings({ [key]: value });
  };

  const voiceModels: { id: VoiceModel; name: string; description: string }[] = [
    { id: 'rachel', name: 'Rachel', description: 'Professional, warm (Recommended)' },
    { id: 'bella', name: 'Bella', description: 'Young, friendly' },
    { id: 'elli', name: 'Elli', description: 'Energetic, engaging' },
    { id: 'grace', name: 'Grace', description: 'Calm, soothing' },
  ];

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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md z-50"
          >
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Voice Settings</h2>
                    <p className="text-sm text-gray-400">Customize HOLLY's voice</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Voice Output Toggle */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {settings.outputEnabled ? (
                        <Volume2 className="w-5 h-5 text-purple-400" />
                      ) : (
                        <VolumeX className="w-5 h-5 text-gray-500" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-white">Voice Output</div>
                        <div className="text-xs text-gray-400">Enable HOLLY's voice responses</div>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSetting('outputEnabled', !settings.outputEnabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.outputEnabled ? 'bg-purple-500' : 'bg-gray-700'
                      }`}
                    >
                      <motion.div
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full"
                        animate={{ x: settings.outputEnabled ? 24 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </label>
                </div>

                {/* Auto-Play Toggle */}
                <div className="space-y-2">
                  <label className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mic className={`w-5 h-5 ${settings.autoPlay ? 'text-purple-400' : 'text-gray-500'}`} />
                      <div>
                        <div className="text-sm font-medium text-white">Smart Auto-Play</div>
                        <div className="text-xs text-gray-400">Only speak when you speak</div>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSetting('autoPlay', !settings.autoPlay)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        settings.autoPlay ? 'bg-purple-500' : 'bg-gray-700'
                      }`}
                    >
                      <motion.div
                        className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full"
                        animate={{ x: settings.autoPlay ? 24 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </label>
                  {settings.autoPlay && (
                    <p className="text-xs text-purple-400 ml-8">
                      ✓ HOLLY will speak automatically when you use voice input
                    </p>
                  )}
                  {!settings.autoPlay && (
                    <p className="text-xs text-gray-500 ml-8">
                      Use the speaker button to hear responses
                    </p>
                  )}
                </div>

                {/* Voice Model Selection */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-purple-400" />
                    Voice Model
                  </label>
                  <div className="space-y-2">
                    {voiceModels.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => updateSetting('voiceModel', model.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                          settings.voiceModel === model.id
                            ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/20'
                            : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-white">{model.name}</div>
                            <div className="text-xs text-gray-400">{model.description}</div>
                          </div>
                          {settings.voiceModel === model.id && (
                            <div className="w-2 h-2 bg-purple-400 rounded-full" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume Control */}
                <div className="space-y-3">
                  <label className="text-sm font-medium text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-purple-400" />
                      Volume
                    </span>
                    <span className="text-sm text-gray-400">{Math.round(settings.volume * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.volume}
                    onChange={(e) => updateSetting('volume', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer 
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 
                             [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-purple-500 
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                             [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-purple-500/50"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-800/50 border-t border-gray-700">
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    <span>ElevenLabs • Premium Voice</span>
                  </div>
                  <span>Settings auto-saved</span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
