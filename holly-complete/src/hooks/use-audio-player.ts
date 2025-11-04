// ============================================
// AUDIO PLAYER HOOK
// ============================================

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Song, MusicPlayerState, UseAudioPlayerReturn } from '@/types/music';

export function useAudioPlayer(): UseAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const [state, setState] = useState<MusicPlayerState>({
    currentSong: undefined,
    isPlaying: false,
    currentTime: 0,
    volume: 80,
    isMuted: false,
    isRepeat: false,
    isShuffle: false,
    queue: [],
    queuePosition: -1,
  });

  // Initialize audio element
  useEffect(() => {
    audioRef.current = new Audio();
    
    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      setState(prev => ({ ...prev, currentTime: audio.currentTime }));
    };

    const handleEnded = () => {
      if (state.isRepeat) {
        audio.currentTime = 0;
        audio.play();
      } else {
        next();
      }
    };

    const handleLoadedMetadata = () => {
      console.log('Audio loaded:', audio.duration);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.pause();
    };
  }, [state.isRepeat]);

  // Update volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.isMuted ? 0 : state.volume / 100;
    }
  }, [state.volume, state.isMuted]);

  const play = useCallback((song?: Song) => {
    const audio = audioRef.current;
    if (!audio) return;

    if (song) {
      // Play new song
      if (song.audio_url) {
        audio.src = song.audio_url;
        audio.load();
        audio.play().catch(err => console.error('Playback error:', err));
        setState(prev => ({ ...prev, currentSong: song, isPlaying: true }));
      }
    } else {
      // Resume current song
      audio.play().catch(err => console.error('Playback error:', err));
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, []);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setState(prev => ({ ...prev, isPlaying: false }));
  }, []);

  const next = useCallback(() => {
    const { queue, queuePosition, isShuffle } = state;
    
    if (queue.length === 0) return;

    let nextPosition = queuePosition + 1;

    if (isShuffle) {
      nextPosition = Math.floor(Math.random() * queue.length);
    } else if (nextPosition >= queue.length) {
      nextPosition = 0; // Loop back to start
    }

    const nextSong = queue[nextPosition];
    if (nextSong) {
      setState(prev => ({ ...prev, queuePosition: nextPosition }));
      play(nextSong);
    }
  }, [state, play]);

  const previous = useCallback(() => {
    const { queue, queuePosition, currentTime } = state;
    const audio = audioRef.current;
    
    if (!audio) return;

    // If more than 3 seconds into song, restart it
    if (currentTime > 3) {
      audio.currentTime = 0;
      return;
    }

    // Otherwise go to previous track
    if (queue.length === 0) return;

    let prevPosition = queuePosition - 1;
    if (prevPosition < 0) {
      prevPosition = queue.length - 1; // Loop to end
    }

    const prevSong = queue[prevPosition];
    if (prevSong) {
      setState(prev => ({ ...prev, queuePosition: prevPosition }));
      play(prevSong);
    }
  }, [state, play]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = time;
    setState(prev => ({ ...prev, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume: Math.max(0, Math.min(100, volume)) }));
  }, []);

  const toggleMute = useCallback(() => {
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState(prev => ({ ...prev, isRepeat: !prev.isRepeat }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setState(prev => ({ ...prev, isShuffle: !prev.isShuffle }));
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setState(prev => ({
      ...prev,
      queue: [...prev.queue, song],
    }));
  }, []);

  const clearQueue = useCallback(() => {
    setState(prev => ({
      ...prev,
      queue: [],
      queuePosition: -1,
    }));
  }, []);

  return {
    state,
    play,
    pause,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    toggleRepeat,
    toggleShuffle,
    addToQueue,
    clearQueue,
  };
}
