'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, Settings } from 'lucide-react';
import { voiceService, VoiceServiceState } from '@/lib/voice/voice-service';

interface VoiceInputButtonProps {
  onTranscript: (text: string, isFinal: boolean) => void;
  onOpenSettings: () => void;
  disabled?: boolean;
}

export default function VoiceInputButton({ 
  onTranscript, 
  onOpenSettings,
  disabled = false 
}: VoiceInputButtonProps) {
  const [voiceState, setVoiceState] = useState<VoiceServiceState>(voiceService.getState());
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    const unsubscribe = voiceService.subscribe(setVoiceState);
    return unsubscribe;
  }, []);

  // Simulate audio level animation when listening
  useEffect(() => {
    if (voiceState.isListening) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [voiceState.isListening]);

  const toggleListening = async () => {
    if (disabled) return;

    if (voiceState.isListening) {
      voiceService.stopListening();
    } else {
      const success = await voiceService.startListening(onTranscript);
      if (!success) {
        alert('Voice input is not available in your browser. Please use Chrome, Edge, or Safari.');
      }
    }
  };

  const toggleVoiceOutput = () => {
    voiceService.updateSettings({ 
      outputEnabled: !voiceState.settings.outputEnabled 
    });
  };

  const isAvailable = voiceService.isRecognitionAvailable();

  if (!isAvailable) {
    return (
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <MicOff className="w-4 h-4" />
        <span>Voice input not available</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 md:gap-2">
      {/* Voice Input Button */}
      <div className="relative">
        <motion.button
          onClick={toggleListening}
          disabled={disabled}
          className={`relative w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all ${
            voiceState.isListening
              ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50'
              : 'bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/30'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          whileHover={{ scale: disabled ? 1 : 1.05 }}
          whileTap={{ scale: disabled ? 1 : 0.95 }}
          title={voiceState.isListening ? 'Stop listening' : 'Start voice input'}
        >
          <AnimatePresence mode="wait">
            {voiceState.isListening ? (
              <motion.div
                key="mic-on"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
              >
                <Mic className="w-5 h-5 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="mic-off"
                initial={{ scale: 0, rotate: 180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: -180 }}
              >
                <MicOff className="w-5 h-5 text-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Audio Level Visualization */}
          {voiceState.isListening && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-red-400"
                animate={{
                  scale: [1, 1.2 + (audioLevel / 100) * 0.3, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity
                }}
              />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-red-300"
                animate={{
                  scale: [1, 1.4 + (audioLevel / 100) * 0.3, 1],
                  opacity: [0.3, 0.5, 0.3]
                }}
                transition={{
                  duration: 0.5,
                  repeat: Infinity,
                  delay: 0.1
                }}
              />
            </>
          )}
        </motion.button>

        {/* Listening indicator */}
        {voiceState.isListening && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-500 text-white text-xs px-2 py-1 rounded"
          >
            Listening...
          </motion.div>
        )}
      </div>

      {/* Voice Output Toggle */}
      <motion.button
        onClick={toggleVoiceOutput}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          voiceState.settings.outputEnabled
            ? 'bg-purple-500 hover:bg-purple-600 shadow-lg shadow-purple-500/30'
            : 'bg-gray-600 hover:bg-gray-700'
        }`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title={voiceState.settings.outputEnabled ? 'Voice output ON' : 'Voice output OFF'}
      >
        <AnimatePresence mode="wait">
          {voiceState.settings.outputEnabled ? (
            <motion.div
              key="volume-on"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Volume2 className="w-5 h-5 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="volume-off"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <VolumeX className="w-5 h-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Speaking indicator - removed (TTS is handled separately) */}
        {false && voiceState.isListening && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-purple-400"
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{
                duration: 1,
                repeat: Infinity
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-purple-400"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0, 0.3]
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: 0.3
              }}
            />
          </>
        )}
      </motion.button>

      {/* Settings Button */}
      <motion.button
        onClick={onOpenSettings}
        className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-700 hover:bg-gray-600 transition-all"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        title="Voice settings"
      >
        <Settings className="w-4 h-4 text-gray-300" />
      </motion.button>

      {/* Status indicator */}
      {voiceState.settings.autoPlay && (
        <div className="flex items-center gap-1 text-xs text-purple-400">
          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
          <span>Smart voice</span>
        </div>
      )}
    </div>
  );
}
