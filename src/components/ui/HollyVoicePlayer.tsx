/**
 * HOLLY Voice Player Component
 * Uses Fish-Speech-1.5 TTS backend ONLY
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

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
  
  // Generate and play audio using Fish-Speech
  const generateAndPlay = async () => {
    if (!text || text.trim().length === 0) {
      setError('No text to speak');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          voice: 'holly'
        })
      });
      
      if (!response.ok) {
        throw new Error(`TTS generation failed: ${response.status}`);
      }
      
      // Create audio blob
      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
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
        className="group relative w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label={isPlaying ? 'Pause' : 'Play HOLLY voice'}
        title={isPlaying ? 'Pause' : 'Play HOLLY voice'}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-white animate-spin" />
        ) : isPlaying ? (
          <VolumeX className="w-4 h-4 text-white" />
        ) : (
          <Volume2 className="w-4 h-4 text-white" />
        )}
      </button>
      
      {/* Status/Error text */}
      {(isLoading || error) && (
        <span className="text-xs text-gray-500">
          {isLoading && 'Generating...'}
          {error && <span className="text-red-500">{error}</span>}
        </span>
      )}
    </div>
  );
}
