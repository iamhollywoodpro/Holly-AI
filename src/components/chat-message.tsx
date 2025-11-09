'use client';

import { motion } from 'framer-motion';
import { Message } from '@/store/chat-store';
import { HollyAvatar } from './holly-avatar';
import { ModelBadge } from './model-badge';
import { User, Volume2, VolumeX, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import { speakText, stopSpeaking, isSpeaking } from '@/lib/voice/enhanced-voice-output';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  const [isSpeakingThis, setIsSpeakingThis] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const voiceSettings = useVoiceSettings();

  const handleSpeak = async () => {
    if (isSpeakingThis) {
      // Stop speaking this message
      stopSpeaking();
      setIsSpeakingThis(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsSpeakingThis(true);
      
      await speakText(message.content, {
        rate: voiceSettings.rate,
        pitch: voiceSettings.pitch,
        volume: voiceSettings.volume,
        provider: voiceSettings.provider,
        elevenLabsVoiceId: voiceSettings.elevenLabsVoiceId,
      });
      
      setIsSpeakingThis(false);
    } catch (error) {
      console.error('Failed to speak:', error);
      setIsSpeakingThis(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 mb-6 ${isAssistant ? '' : 'flex-row-reverse'}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isAssistant ? (
          <HollyAvatar emotion={message.emotion} size="md" animated={message.isStreaming} />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
            <User className="w-6 h-6 text-gray-300" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 ${isAssistant ? '' : 'flex justify-end'}`}>
        <div
          className={`
            inline-block max-w-[85%] px-5 py-3 rounded-2xl
            ${
              isAssistant
                ? 'glass text-white rounded-tl-none'
                : 'bg-gradient-to-br from-holly-purple-600 to-holly-blue-600 text-white rounded-tr-none'
            }
          `}
        >
          {/* Message text with markdown support */}
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ node, inline, className, children, ...props }: any) => {
                  return inline ? (
                    <code
                      className="bg-black/30 px-2 py-1 rounded text-holly-purple-300 font-mono text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto border border-white/10">
                      <code className="text-sm font-mono text-gray-100" {...props}>
                        {children}
                      </code>
                    </pre>
                  );
                },
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="text-holly-purple-300 font-bold">{children}</strong>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Timestamp, Model, and Voice Controls */}
          <div className={`flex items-center gap-2 mt-2 text-xs ${isAssistant ? 'text-gray-500' : 'text-white/60'}`}>
            <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isAssistant && message.model && <ModelBadge model={message.model} />}
            
            {/* Voice Button (only for assistant messages) */}
            {isAssistant && voiceSettings.enabled && (
              <motion.button
                onClick={handleSpeak}
                disabled={isLoading}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title={isSpeakingThis ? 'Stop speaking' : 'Speak message'}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                ) : isSpeakingThis ? (
                  <VolumeX className="w-4 h-4 text-purple-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-gray-400 hover:text-purple-400" />
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
