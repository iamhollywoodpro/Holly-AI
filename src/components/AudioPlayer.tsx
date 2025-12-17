'use client';
import React, { useState } from 'react';
import { Volume2, VolumeX, Loader2 } from 'lucide-react';
export default function AudioPlayer({ text, emotion }: { text: string; emotion?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const playVoice = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tts', { method: 'POST', body: JSON.stringify({ text, emotion }) });
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audio.onended = () => setIsPlaying(false);
      setIsPlaying(true);
      audio.play();
    } finally { setIsLoading(false); }
  };
  return (
    <button onClick={playVoice} className="p-2 rounded-full bg-purple-600 text-white">
      {isLoading ? <Loader2 className="animate-spin" /> : isPlaying ? <VolumeX /> : <Volume2 />}
    </button>
  );
}
