'use client';

import { motion } from 'framer-motion';
import { User, Sparkles, Loader2, Volume2, VolumeX, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { MarkdownRenderer } from './code/MarkdownRenderer';
import HollyVoicePlayer from '@/components/ui/HollyVoicePlayer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotion?: string;
  thinking?: boolean;
  attachments?: {
    type: 'image' | 'audio' | 'video' | 'document' | 'file';
    name: string;
    url: string;
    size?: number;
    mimeType?: string;
    vision?: any;
    music?: any;
  }[];
}

interface MessageBubbleProps {
  message: Message;
  index: number;
  conversationId?: string; // For feedback tracking
  autoPlayVoice?: boolean; // Auto-play voice for this message
}

export default function MessageBubble({ message, index, conversationId, autoPlayVoice = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isThinking = message.thinking;
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<'up' | 'down' | null>(null);
  const [feedbackLoading, setFeedbackLoading] = useState(false);

  // Detect media URLs in message content
  const detectMedia = (content: string) => {
    const imageRegex = /!\[.*?\]\((https?:\/\/.*?\.(?:png|jpg|jpeg|gif|webp))\)/gi;
    const videoRegex = /!\[.*?\]\((https?:\/\/.*?\.(?:mp4|webm|mov))\)/gi;
    const audioRegex = /!\[.*?\]\((https?:\/\/.*?\.(?:mp3|wav|ogg|m4a))\)/gi;
    
    const images = Array.from(content.matchAll(imageRegex)).map(m => m[1]);
    const videos = Array.from(content.matchAll(videoRegex)).map(m => m[1]);
    const audios = Array.from(content.matchAll(audioRegex)).map(m => m[1]);
    
    return { images, videos, audios };
  };

  const media = detectMedia(message.content);
  const hasMedia = media.images.length > 0 || media.videos.length > 0 || media.audios.length > 0;

  // HOLLY's voice with Gemini TTS
  const handleVoicePlayStart = () => {
    console.log('[HOLLY Voice] Playing via Gemini TTS');
  };

  const handleVoicePlayEnd = () => {
    console.log('[HOLLY Voice] Playback completed');
  };
  
  // Phase 1: User Feedback
  const handleFeedback = async (type: 'thumbs_up' | 'thumbs_down') => {
    if (feedbackGiven || feedbackLoading) return;
    
    setFeedbackLoading(true);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          messageId: message.id,
          conversationId: conversationId || 'current',
          context: {
            hollyResponse: message.content,
            timestamp: message.timestamp,
          }
        })
      });
      
      if (response.ok) {
        setFeedbackGiven(type === 'thumbs_up' ? 'up' : 'down');
        console.log(`[Feedback] ${type} recorded for message ${message.id}`);
      }
    } catch (error) {
      console.error('[Feedback] Failed to record:', error);
    } finally {
      setFeedbackLoading(false);
    }
  };

  const getEmotionColor = (emotion?: string) => {
    const colors: Record<string, string> = {
      excited: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
      curious: 'from-blue-500/20 to-purple-500/20 border-blue-500/30',
      focused: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30',
      content: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
      wonder: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
    };
    return emotion ? colors[emotion] || colors.curious : '';
  };

  if (isThinking) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex items-start gap-4"
      >
        {/* HOLLY Avatar */}
        <motion.div
          className="relative w-10 h-10 flex-shrink-0"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-md opacity-50" />
          <div className="relative w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center border border-white/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </motion.div>

        {/* Thinking Indicator */}
        <motion.div className="flex-1 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-2xl px-6 py-4 border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <div className="flex gap-1">
              <motion.div
                className="w-2 h-2 bg-purple-400 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-2 h-2 bg-purple-400 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-2 h-2 bg-purple-400 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              />
            </div>
            <span className="text-sm text-gray-400">HOLLY is thinking...</span>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        type: 'spring',
        stiffness: 200,
        damping: 20
      }}
      className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <motion.div
        className="relative w-10 h-10 flex-shrink-0"
        whileHover={{ scale: 1.1 }}
      >
        {isUser ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full blur-md opacity-50" />
            <div className="relative w-full h-full bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center border border-white/20">
              <User className="w-5 h-5 text-white" />
            </div>
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-md opacity-50" />
            <div className="relative w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </>
        )}
      </motion.div>

      {/* Message Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'flex justify-end' : ''}`}>
        <motion.div
          className={`relative rounded-2xl px-6 py-4 backdrop-blur-sm ${
            isUser
              ? 'bg-gradient-to-br from-blue-600/90 to-cyan-600/90 border border-blue-400/30 shadow-lg shadow-blue-500/20'
              : `bg-gradient-to-br ${getEmotionColor(message.emotion) || 'from-gray-800/50 to-gray-700/50'} border ${getEmotionColor(message.emotion).includes('border') ? '' : 'border-gray-700/50'} shadow-lg`
          }`}
          whileHover={{ scale: 1.01 }}
        >
          {/* Message Header */}
          {!isUser && message.emotion && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700/30">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Feeling: <span className="text-purple-400 capitalize">{message.emotion}</span>
              </div>
            </div>
          )}

          {/* Media Content */}
          {hasMedia && (
            <div className="mb-4 space-y-3">
              {/* Images */}
              {media.images.map((url, i) => (
                <div key={`img-${i}`} className="rounded-lg overflow-hidden border border-gray-700/50">
                  <Image 
                    src={url} 
                    alt={`Generated image ${i + 1}`}
                    width={600}
                    height={400}
                    className="w-full h-auto"
                    unoptimized
                  />
                </div>
              ))}
              
              {/* Videos */}
              {media.videos.map((url, i) => (
                <video 
                  key={`vid-${i}`}
                  src={url} 
                  controls 
                  className="w-full rounded-lg border border-gray-700/50"
                />
              ))}
              
              {/* Audio */}
              {media.audios.map((url, i) => (
                <audio 
                  key={`aud-${i}`}
                  src={url} 
                  controls 
                  className="w-full"
                />
              ))}
            </div>
          )}

          {/* Message Text */}
          <div className={`text-base leading-relaxed ${isUser ? 'text-white' : 'text-gray-100'}`}>
            <MarkdownRenderer content={message.content} />
          </div>

          {/* Footer with Timestamp, Feedback, and Voice Button */}
          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="text-xs text-gray-400">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              
              {/* Phase 1: Feedback Buttons (HOLLY messages only) */}
              {!isUser && !feedbackGiven && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleFeedback('thumbs_up')}
                    disabled={feedbackLoading}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors group/btn disabled:opacity-50"
                    title="This was helpful"
                  >
                    <ThumbsUp className="w-4 h-4 text-gray-400 group-hover/btn:text-green-400 transition-colors" />
                  </button>
                  <button
                    onClick={() => handleFeedback('thumbs_down')}
                    disabled={feedbackLoading}
                    className="p-1.5 rounded-lg hover:bg-white/5 transition-colors group/btn disabled:opacity-50"
                    title="This wasn't helpful"
                  >
                    <ThumbsDown className="w-4 h-4 text-gray-400 group-hover/btn:text-red-400 transition-colors" />
                  </button>
                </div>
              )}
              
              {/* Feedback Confirmation */}
              {feedbackGiven && (
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  {feedbackGiven === 'up' ? (
                    <><ThumbsUp className="w-3.5 h-3.5 text-green-400" /> <span>Thanks!</span></>
                  ) : (
                    <><ThumbsDown className="w-3.5 h-3.5 text-red-400" /> <span>Noted</span></>
                  )}
                </div>
              )}
            </div>
            
            {/* HOLLY Voice Player with Gemini TTS */}
            {!isUser && (
              <HollyVoicePlayer
                text={message.content}
                autoPlay={autoPlayVoice}
                showControls={true}
                onPlayStart={handleVoicePlayStart}
                onPlayEnd={handleVoicePlayEnd}
              />
            )}
          </div>

          {/* Decorative Glow */}
          {!isUser && (
            <div className={`absolute -inset-0.5 bg-gradient-to-r ${getEmotionColor(message.emotion) || 'from-purple-500/20 to-pink-500/20'} rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity -z-10`} />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
