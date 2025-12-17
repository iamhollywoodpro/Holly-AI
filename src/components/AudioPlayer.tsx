'use client';
import * as React from 'react';
import { useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';

export default function AudioPlayer({ text, emotion }: { text: string; emotion?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const playVoice = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, emotion }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => setIsPlaying(false);
      setIsPlaying(true);
      await audio.play();
    } catch (e) {
      console.error("Audio failed", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button onClick={playVoice} className="p-2 rounded-full bg-purple-600 text-white">
      {isLoading ? <Loader2 className="animate-spin size-4" /> : isPlaying ? <VolumeX size={4} /> : <Volume2 size={4} />}
    </button>
  );
}
