'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Repeat,
  Shuffle,
  Heart,
  Maximize2,
} from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
  artwork?: string;
  duration: number;
  url: string;
}

interface MusicPlayerProps {
  currentSong?: Song;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  currentTime: number;
}

export function MusicPlayer({
  currentSong,
  isPlaying,
  onPlayPause,
  onNext,
  onPrevious,
  onSeek,
  currentTime = 0,
}: MusicPlayerProps) {
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const progressRef = useRef<HTMLDivElement>(null);

  if (!currentSong) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * currentSong.duration;
    onSeek(newTime);
  };

  const progressPercentage = (currentTime / currentSong.duration) * 100;

  return (
    <div className="player-bar">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-4">
          {/* Song Info */}
          <div className="flex items-center gap-3 w-64 min-w-0">
            <div className="w-12 h-12 rounded-md bg-bg-tertiary flex-shrink-0 overflow-hidden">
              {currentSong.artwork ? (
                <img
                  src={currentSong.artwork}
                  alt={currentSong.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-text-tertiary">
                  🎵
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentSong.title}</p>
              <p className="text-xs text-text-secondary truncate">{currentSong.artist}</p>
            </div>
            <button
              onClick={() => setIsLiked(!isLiked)}
              className={`btn-icon flex-shrink-0 transition-colors ${isLiked ? 'text-holly-crimson' : 'text-holly-gold/40 hover:text-holly-gold'}`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Player Controls */}
          <div className="flex-1 flex flex-col items-center gap-2 min-w-0">
            {/* Control Buttons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsShuffle(!isShuffle)}
                className={`btn-icon transition-colors ${isShuffle ? 'text-holly-gold' : 'text-holly-gold/40 hover:text-holly-gold'}`}
                title="Shuffle"
              >
                <Shuffle className="w-4 h-4" />
              </button>
              
              <button
                onClick={onPrevious}
                className="btn-icon text-holly-gold/60 hover:text-holly-gold transition-colors"
                title="Previous"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button
                onClick={onPlayPause}
                className="w-10 h-10 rounded-full bg-holly-gold hover:bg-holly-gold/90 flex items-center justify-center text-holly-void transition-all hover:scale-105 active:scale-95 shadow-lg shadow-holly-gold/20"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 ml-0.5" />
                )}
              </button>
              
              <button
                onClick={onNext}
                className="btn-icon text-holly-gold/60 hover:text-holly-gold transition-colors"
                title="Next"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setIsRepeat(!isRepeat)}
                className={`btn-icon transition-colors ${isRepeat ? 'text-holly-gold' : 'text-holly-gold/40 hover:text-holly-gold'}`}
                title="Repeat"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="flex items-center gap-2 w-full max-w-2xl">
              <span className="text-xs text-holly-gold/60 tabular-nums">
                {formatTime(currentTime)}
              </span>
              <div
                ref={progressRef}
                className="flex-1 h-1 bg-white/10 rounded-full cursor-pointer group relative"
                onClick={handleProgressClick}
              >
                <div
                  className="h-full bg-holly-gold rounded-full relative transition-all"
                  style={{ width: `${progressPercentage}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-holly-gold rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg shadow-holly-gold/40" />
                </div>
              </div>
              <span className="text-xs text-holly-gold/60 tabular-nums">
                {formatTime(currentSong.duration)}
              </span>
            </div>
          </div>

          {/* Volume & Actions */}
          <div className="flex items-center gap-2 w-48 justify-end">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="btn-icon text-holly-gold/60 hover:text-holly-gold transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            
            <div className="flex-1 max-w-24">
              <input
                type="range"
                min="0"
                max="100"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value));
                  setIsMuted(false);
                }}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-holly-gold [&::-webkit-slider-thumb]:cursor-pointer transition-all"
              />
            </div>

            <button className="btn-icon text-holly-gold/60 hover:text-holly-gold transition-colors" title="Expand player">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
