/**
 * HOLLY Media Message Component
 * 
 * Displays generated images, videos, and audio in the chat
 */

'use client';

import Image from 'next/image';
import { useState } from 'react';

export interface MediaContent {
  type: 'image' | 'video' | 'audio';
  url: string;
  prompt?: string;
  model?: string;
}

interface MediaMessageProps {
  content: MediaContent;
  className?: string;
}

export function MediaMessage({ content, className = '' }: MediaMessageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleLoad = () => setLoading(false);
  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  if (error) {
    return (
      <div className={`rounded-lg border border-red-500/20 bg-red-500/10 p-4 ${className}`}>
        <p className="text-sm text-red-400">Failed to load {content.type}</p>
        {content.prompt && (
          <p className="text-xs text-gray-500 mt-1">Prompt: {content.prompt}</p>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg overflow-hidden ${className}`}>
      {/* Image */}
      {content.type === 'image' && (
        <div className="relative">
          {loading && (
            <div className="absolute inset-0 bg-gray-800 animate-pulse flex items-center justify-center">
              <div className="text-sm text-gray-400">Loading image...</div>
            </div>
          )}
          <Image
            src={content.url}
            alt={content.prompt || 'Generated image'}
            width={800}
            height={600}
            className="w-full h-auto"
            onLoad={handleLoad}
            onError={handleError}
            unoptimized // Vercel Blob URLs don't need Next.js optimization
          />
          {content.prompt && (
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 backdrop-blur-sm p-2">
              <p className="text-xs text-white/80 truncate">{content.prompt}</p>
              {content.model && (
                <p className="text-xs text-white/60">Model: {content.model}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Video */}
      {content.type === 'video' && (
        <div>
          <video
            src={content.url}
            controls
            className="w-full h-auto"
            onLoadedData={handleLoad}
            onError={handleError}
          >
            Your browser does not support video playback.
          </video>
          {content.prompt && (
            <div className="bg-gray-800 p-2">
              <p className="text-xs text-gray-300">{content.prompt}</p>
              {content.model && (
                <p className="text-xs text-gray-500">Model: {content.model}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Audio */}
      {content.type === 'audio' && (
        <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-4">
          <audio
            src={content.url}
            controls
            className="w-full"
            onLoadedData={handleLoad}
            onError={handleError}
          >
            Your browser does not support audio playback.
          </audio>
          {content.prompt && (
            <div className="mt-2">
              <p className="text-sm text-gray-300">{content.prompt}</p>
              {content.model && (
                <p className="text-xs text-gray-500">Model: {content.model}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Helper: Detect if a message contains media content
 */
export function parseMediaFromMessage(message: string): MediaContent | null {
  try {
    // Try to parse as JSON
    const parsed = JSON.parse(message);
    
    if (parsed.type && parsed.url && ['image', 'video', 'audio'].includes(parsed.type)) {
      return {
        type: parsed.type,
        url: parsed.url,
        prompt: parsed.prompt,
        model: parsed.model,
      };
    }
  } catch {
    // Not JSON, return null
  }
  
  return null;
}
