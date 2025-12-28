/**
 * HOLLY Voice Player Component
 * Uses Microsoft Edge TTS for high-quality, free multilingual voice generation
 * Supports 140+ languages including Malayalam with proper dialects
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
import { generateVoice } from '@/lib/edge-tts';

interface HollyVoicePlayerProps {
  text: string;
  autoPlay?: boolean;
  showControls?: boolean;
  onPlayStart?: () => void;
  onPlayEnd?: () => void;
  onError?: (error: Error) => void;
}

export default function HollyVoicePlayer({
  text,
  autoPlay = false,
  showControls = true,
  onPlayStart,
  onPlayEnd,
  onError
}: HollyVoicePlayerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Clean text for TTS: strip markdown, emojis, and format properly
  const cleanTextForTTS = (text: string): string => {
    return text
      // Remove markdown formatting
      .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
      .replace(/\*(.+?)\*/g, '$1') // Italic
      .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Links
      .replace(/`{1,3}[^`]+`{1,3}/g, '') // Code blocks
      .replace(/^#{1,6}\s+/gm, '') // Headers
      .replace(/^[-*+]\s+/gm, '') // List items
      .replace(/^\d+\.\s+/gm, '') // Numbered lists
      .replace(/^>\s+/gm, '') // Blockquotes
      .replace(/---+/g, '') // Horizontal rules
      // Remove emojis
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols and Pictographs
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
      .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation Selectors
      .replace(/[\u{200D}]/gu, '')            // Zero Width Joiner
      // Clean up whitespace
      .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
      .replace(/\s{2,}/g, ' ') // Multiple spaces to single
      .trim();
  };

  // Generate and play audio using Kokoro TTS
  const generateAndPlay = async () => {
    if (!text || text.trim().length === 0) {
      setError('No text to speak');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Clean text for TTS (remove markdown, emojis, etc.)
      const cleanText = cleanTextForTTS(text);
      console.log('[HOLLY Voice] Generating voice with Edge TTS...');
      console.log('[HOLLY Voice] Original text:', text);
      console.log('[HOLLY Voice] Clean text:', cleanText);
      
      // Generate voice using Edge TTS (auto-detects language)
      const audioBlob = await generateVoice(cleanText, undefined, 1.0);
      
      // Create audio URL
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      console.log('[HOLLY Voice] Voice generated successfully');
      
      // Play audio
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
        setIsPlaying(true);
        
        if (onPlayStart) {
          onPlayStart();
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[HOLLY Voice] Error:', errorMessage);
      setError(errorMessage);
      
      if (onError && err instanceof Error) {
        onError(err);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle audio end
  const handleAudioEnd = () => {
    setIsPlaying(false);
    
    if (onPlayEnd) {
      onPlayEnd();
    }
  };
  
  // Handle play button click
  const handlePlayClick = () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else if (audioUrl) {
      audioRef.current?.play();
      setIsPlaying(true);
    } else {
      generateAndPlay();
    }
  };
  
  // Auto-play if requested
  useEffect(() => {
    if (autoPlay && text) {
      console.log('[HOLLY Voice] Auto-playing voice...');
      generateAndPlay();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, text]);
  
  // Cleanup audio URL
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);
  
  if (!showControls) {
    return (
      <audio
        ref={audioRef}
        onEnded={handleAudioEnd}
        onError={(e) => {
          console.error('[HOLLY Voice] Audio playback error:', e);
          setError('Audio playback failed');
          setIsPlaying(false);
        }}
      />
    );
  }
  
  return (
    <div className="flex items-center gap-2">
      {/* Audio element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnd}
        onError={(e) => {
          console.error('[HOLLY Voice] Audio playback error:', e);
          setError('Audio playback failed');
          setIsPlaying(false);
        }}
      />
      
      {/* Play/Pause Button */}
      <button
        onClick={handlePlayClick}
        disabled={isLoading || (!text && !audioUrl)}
        className="group relative w-6 h-6 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500/80 to-indigo-500/80 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110 active:scale-95 shadow-sm"
        aria-label={isPlaying ? 'Pause' : 'Play HOLLY voice'}
        title={isPlaying ? 'Pause' : 'Play HOLLY voice'}
      >
        {isLoading ? (
          <Loader2 className="w-3 h-3 text-white animate-spin" />
        ) : isPlaying ? (
          <VolumeX className="w-3 h-3 text-white" />
        ) : (
          <Volume2 className="w-3 h-3 text-white" />
        )}
      </button>
      
      {/* Status/Error text */}
      {(isLoading || error) && (
        <span className="text-xs text-gray-500">
          {isLoading && 'Generating voice...'}
          {error && <span className="text-red-500">{error}</span>}
        </span>
      )}
    </div>
  );
}
