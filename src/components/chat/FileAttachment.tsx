'use client';

import { motion } from 'framer-motion';
import { FileText, Music, Video, FileImage, Download, Play, Pause } from 'lucide-react';
import { useState, useRef } from 'react';
import Image from 'next/image';

interface FileAttachmentProps {
  type: 'image' | 'audio' | 'video' | 'document' | 'file';
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  vision?: any;
  music?: any;
}

export function FileAttachment({ type, name, url, size, mimeType, vision, music }: FileAttachmentProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    if (type === 'audio' && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } else if (type === 'video' && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getFileIcon = () => {
    switch (type) {
      case 'image':
        return <FileImage className="w-5 h-5 text-blue-400" />;
      case 'audio':
        return <Music className="w-5 h-5 text-purple-400" />;
      case 'video':
        return <Video className="w-5 h-5 text-pink-400" />;
      case 'document':
        return <FileText className="w-5 h-5 text-green-400" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  // Render image
  if (type === 'image') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative group rounded-xl overflow-hidden border border-gray-700/50 bg-gray-800/30 backdrop-blur-sm"
      >
        <div className="relative w-full max-w-md">
          <Image
            src={url}
            alt={name}
            width={400}
            height={300}
            className="w-full h-auto object-cover rounded-lg"
            unoptimized
          />
          
          {/* Download overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm">View Full Size</span>
            </a>
          </div>
        </div>

        {/* Image info */}
        <div className="p-3 border-t border-gray-700/50">
          <p className="text-xs text-gray-400 truncate">{name}</p>
          {size && <p className="text-xs text-gray-500">{formatSize(size)}</p>}
        </div>
      </motion.div>
    );
  }

  // Render audio
  if (type === 'audio') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-xl border border-gray-700/50 bg-gray-800/30 backdrop-blur-sm overflow-hidden"
      >
        {/* Audio player */}
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={handlePlayPause}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 text-purple-400" />
              ) : (
                <Play className="w-5 h-5 text-purple-400 ml-0.5" />
              )}
            </button>
            
            <div className="flex-1">
              <p className="text-sm font-medium text-white truncate">{name}</p>
              <p className="text-xs text-gray-400">
                {duration > 0 ? `${formatTime(currentTime)} / ${formatTime(duration)}` : 'Loading...'}
              </p>
            </div>

            <a
              href={url}
              download={name}
              className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4 text-gray-400" />
            </a>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-gray-700/50 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
              style={{
                width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%'
              }}
            />
          </div>

          {/* Hidden audio element */}
          <audio
            ref={audioRef}
            src={url}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onDurationChange={(e) => setDuration(e.currentTarget.duration)}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>

        {/* Music analysis (if available) */}
        {music && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-700/50">
            <p className="text-xs font-semibold text-purple-400 mb-2">🎵 HOLLY's A&R Analysis</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-500">Hit Score:</span>
                <span className="text-white ml-1 font-semibold">{music.hitScore}/10</span>
              </div>
              <div>
                <span className="text-gray-500">BPM:</span>
                <span className="text-white ml-1">{Math.round(music.bpm)}</span>
              </div>
              <div>
                <span className="text-gray-500">Key:</span>
                <span className="text-white ml-1">{music.key}</span>
              </div>
              <div>
                <span className="text-gray-500">Billboard:</span>
                <span className="text-white ml-1">{music.chartPotential}</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  }

  // Render video
  if (type === 'video') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-xl border border-gray-700/50 bg-gray-800/30 backdrop-blur-sm overflow-hidden"
      >
        <video
          ref={videoRef}
          src={url}
          controls
          className="w-full"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        <div className="p-3 border-t border-gray-700/50">
          <p className="text-xs text-gray-400 truncate">{name}</p>
          {size && <p className="text-xs text-gray-500">{formatSize(size)}</p>}
        </div>
      </motion.div>
    );
  }

  // Render document/file
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-3 p-4 rounded-xl border border-gray-700/50 bg-gray-800/30 backdrop-blur-sm hover:bg-gray-800/50 transition-colors group"
    >
      <div className="flex-shrink-0">{getFileIcon()}</div>
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{name}</p>
        <p className="text-xs text-gray-400">
          {mimeType} {size && `• ${formatSize(size)}`}
        </p>
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 p-2 hover:bg-gray-700/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
      >
        <Download className="w-4 h-4 text-gray-400" />
      </a>
    </motion.div>
  );
}
