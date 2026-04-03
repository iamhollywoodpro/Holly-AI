"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Music2, Play, Pause, Download, Loader2, Sparkles, Mic2, FileText,
  Wand2, RefreshCw, X, CheckCircle, AlertCircle, Plus, ChevronRight,
  SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Heart,
  Share2, MoreHorizontal, Scissors, Zap, Radio, Headphones,
  Clock, TrendingUp, Star, Lock, Unlock, ArrowLeft, Settings,
  Sliders, Music, ImageIcon, ChevronDown, ChevronUp, RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ──────────────────────────────────────────────────────────────────────

type GenerationMode = 'describe' | 'custom';

interface GeneratedTrack {
  id:             string;
  clipId?:        string;
  title:          string;
  audioUrl:       string;
  imageUrl?:      string;
  duration?:      number;
  status:         'generating' | 'complete' | 'error';
  isExtension?:   boolean;
  parentTitle?:   string;
  model?:         string;
  style?:         string;
  liked?:         boolean;
  plays?:         number;
  createdAt:      Date;
}

interface Toast {
  id:   string;
  msg:  string;
  type: 'success' | 'error' | 'info';
}

// ── Constants ──────────────────────────────────────────────────────────────────

const STYLE_PRESETS = [
  { label: 'Pop',         color: 'from-pink-500 to-rose-500' },
  { label: 'Hip-Hop',     color: 'from-yellow-500 to-orange-500' },
  { label: 'R&B',         color: 'from-purple-500 to-violet-500' },
  { label: 'Trap',        color: 'from-gray-600 to-zinc-700' },
  { label: 'Afrobeats',   color: 'from-green-500 to-emerald-500' },
  { label: 'Drill',       color: 'from-blue-600 to-indigo-700' },
  { label: 'Soul',        color: 'from-amber-500 to-yellow-600' },
  { label: 'Jazz',        color: 'from-teal-500 to-cyan-600' },
  { label: 'Lo-Fi',       color: 'from-slate-500 to-gray-600' },
  { label: 'Electronic',  color: 'from-cyan-400 to-blue-500' },
  { label: 'Rock',        color: 'from-red-600 to-rose-700' },
  { label: 'Cinematic',   color: 'from-indigo-500 to-purple-600' },
  { label: 'Gospel',      color: 'from-yellow-400 to-amber-500' },
  { label: 'Latin',       color: 'from-red-500 to-pink-500' },
  { label: 'Country',     color: 'from-orange-400 to-amber-400' },
  { label: 'K-Pop',       color: 'from-fuchsia-500 to-pink-500' },
];

const MODEL_OPTIONS = [
  { value: 'V5_5', label: 'V5.5',  badge: 'Best',    desc: 'Latest · voice-customised · highest quality' },
  { value: 'V5',   label: 'V5',    badge: 'Fast',    desc: 'Superior expression · quick generation' },
  { value: 'V4_5ALL', label: 'V4.5', badge: 'Long', desc: 'Best song structure · up to 8 min' },
];

const LYRIC_SECTION_TAGS = [
  '[Intro]', '[Verse 1]', '[Pre-Chorus]', '[Chorus]',
  '[Verse 2]', '[Bridge]', '[Outro]', '[Hook]',
];

const PROMPT_EXAMPLES = [
  "A melancholy R&B ballad about long distance love, female vocals, piano and strings",
  "Upbeat Afrobeats banger, celebration vibes, tropical percussion, male vocals",
  "Dark trap anthem with 808s, cinematic synths, about rising from nothing",
  "Lo-fi jazz hip-hop, late night studio session, nostalgic and warm",
  "Euphoric pop anthem, female vocals soaring, big chorus, festival energy",
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDur(sec?: number) {
  if (!sec) return '0:00';
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

// ── Waveform visualizer ────────────────────────────────────────────────────────

function Waveform({ isPlaying, bars = 32 }: { isPlaying: boolean; bars?: number }) {
  return (
    <div className="flex items-center gap-[2px] h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full bg-gradient-to-t from-purple-500 to-pink-400 transition-all ${
            isPlaying ? 'animate-pulse' : 'opacity-40'
          }`}
          style={{
            height: `${20 + Math.sin(i * 0.8) * 12 + Math.cos(i * 1.3) * 8}px`,
            animationDelay: `${(i * 0.05) % 0.8}s`,
            animationDuration: `${0.6 + (i % 5) * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Mini player bar at bottom ──────────────────────────────────────────────────

function MiniPlayer({
  track,
  isPlaying,
  progress,
  volume,
  onPlayPause,
  onSeek,
  onVolume,
  onClose,
}: {
  track: GeneratedTrack;
  isPlaying: boolean;
  progress: number;
  volume: number;
  onPlayPause: () => void;
  onSeek: (v: number) => void;
  onVolume: (v: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center gap-4">
        {/* Cover + info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-600 to-pink-600">
            {track.imageUrl ? (
              <img src={track.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music2 className="w-5 h-5 text-white/60" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{track.title}</p>
            <p className="text-white/50 text-xs">{track.style || 'AI Generated'}</p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-1 flex-1">
          <div className="flex items-center gap-4">
            <button className="text-white/40 hover:text-white transition-colors">
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={onPlayPause}
              className="w-8 h-8 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-black fill-black" />
              ) : (
                <Play className="w-4 h-4 text-black fill-black ml-0.5" />
              )}
            </button>
            <button className="text-white/40 hover:text-white transition-colors">
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 w-full max-w-xs">
            <span className="text-white/40 text-xs w-8 text-right">{fmtDur((progress / 100) * (track.duration || 0))}</span>
            <input
              type="range" min="0" max="100" value={progress}
              onChange={e => onSeek(Number(e.target.value))}
              className="flex-1 h-1 accent-purple-500 cursor-pointer"
            />
            <span className="text-white/40 text-xs w-8">{fmtDur(track.duration)}</span>
          </div>
        </div>

        {/* Volume + close */}
        <div className="flex items-center gap-3 flex-1 justify-end">
          <div className="flex items-center gap-2">
            <button onClick={() => onVolume(volume > 0 ? 0 : 0.8)} className="text-white/40 hover:text-white">
              {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range" min="0" max="1" step="0.01" value={volume}
              onChange={e => onVolume(Number(e.target.value))}
              className="w-20 h-1 accent-purple-500 cursor-pointer"
            />
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Track Card ─────────────────────────────────────────────────────────────────

function TrackCard({
  track,
  isActive,
  isPlaying,
  onPlay,
  onDownload,
  onExtend,
  onLike,
}: {
  track: GeneratedTrack;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onDownload: () => void;
  onExtend: () => void;
  onLike: () => void;
}) {
  if (track.status === 'generating') {
    return (
      <div className="group relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 p-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-600/40 to-pink-600/40 flex items-center justify-center flex-shrink-0 animate-pulse">
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium">{track.title}</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <p className="text-white/50 text-sm">Composing your track…</p>
            </div>
            <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full animate-progress" style={{ width: '60%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (track.status === 'error') {
    return (
      <div className="rounded-2xl overflow-hidden bg-red-500/10 border border-red-500/20 p-4">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-white font-medium">{track.title}</p>
            <p className="text-red-400/80 text-sm">Generation failed — please try again</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 ${
      isActive
        ? 'bg-white/10 border-purple-500/50 shadow-lg shadow-purple-500/10'
        : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
    }`}>
      <div className="flex items-center gap-4 p-4">
        {/* Cover art */}
        <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer" onClick={onPlay}>
          {track.imageUrl ? (
            <img src={track.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <Music2 className="w-6 h-6 text-white/60" />
            </div>
          )}
          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${
            isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}>
            {isActive && isPlaying ? (
              <Pause className="w-6 h-6 text-white fill-white" />
            ) : (
              <Play className="w-6 h-6 text-white fill-white ml-1" />
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-white font-semibold truncate">{track.title}</p>
              <p className="text-white/50 text-sm truncate">{track.style || 'AI Generated'} · {fmtDur(track.duration)}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {track.model && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs">
                  {track.model}
                </span>
              )}
            </div>
          </div>

          {/* Waveform when playing */}
          {isActive && (
            <div className="mt-2">
              <Waveform isPlaying={isPlaying} bars={24} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onLike}
            className={`p-2 rounded-lg transition-colors ${
              track.liked ? 'text-pink-400' : 'text-white/40 hover:text-pink-400'
            }`}
            title="Like"
          >
            <Heart className={`w-4 h-4 ${track.liked ? 'fill-pink-400' : ''}`} />
          </button>
          <button
            onClick={onExtend}
            className="p-2 rounded-lg text-white/40 hover:text-purple-400 transition-colors"
            title="Extend song"
          >
            <Zap className="w-4 h-4" />
          </button>
          <button
            onClick={onDownload}
            className="p-2 rounded-lg text-white/40 hover:text-green-400 transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────

export default function MusicStudio() {
  // Mode & form state
  const [mode, setMode]                         = useState<GenerationMode>('describe');
  const [prompt, setPrompt]                     = useState('');
  const [lyrics, setLyrics]                     = useState('');
  const [title, setTitle]                       = useState('');
  const [style, setStyle]                       = useState('');
  const [instrumental, setInstrumental]         = useState(false);
  const [model, setModel]                       = useState('V5_5');
  const [vocalGender, setVocalGender]           = useState<'male' | 'female' | ''>('');
  const [showAdvanced, setShowAdvanced]         = useState(false);

  // Generation state
  const [tracks, setTracks]                     = useState<GeneratedTrack[]>([]);
  const [isGenerating, setIsGenerating]         = useState(false);
  const [isGenLyrics, setIsGenLyrics]           = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [toasts, setToasts]                     = useState<Toast[]>([]);

  // Playback state
  const [activeTrackId, setActiveTrackId]       = useState<string | null>(null);
  const [isPlaying, setIsPlaying]               = useState(false);
  const [progress, setProgress]                 = useState(0);
  const [volume, setVolume]                     = useState(0.8);
  const audioRef                                = useRef<HTMLAudioElement | null>(null);
  const progressInterval                        = useRef<NodeJS.Timeout | null>(null);

  // Extend modal
  const [extendModal, setExtendModal]           = useState<GeneratedTrack | null>(null);
  const [extendPrompt, setExtendPrompt]         = useState('');
  const [isExtending, setIsExtending]           = useState(false);

  const activeTrack = tracks.find(t => t.id === activeTrackId) ?? null;

  // ── Toast helpers ────────────────────────────────────────────────────────────

  const addToast = useCallback((msg: string, type: Toast['type'] = 'info') => {
    const id = uid();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  // ── Audio playback ───────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const playTrack = useCallback((track: GeneratedTrack) => {
    if (!track.audioUrl) return;

    // Same track — toggle play/pause
    if (activeTrackId === track.id) {
      if (isPlaying) {
        audioRef.current?.pause();
        setIsPlaying(false);
      } else {
        audioRef.current?.play();
        setIsPlaying(true);
      }
      return;
    }

    // New track
    audioRef.current?.pause();
    if (progressInterval.current) clearInterval(progressInterval.current);

    const audio = new Audio(track.audioUrl);
    audio.volume = volume;
    audioRef.current = audio;
    setActiveTrackId(track.id);
    setProgress(0);

    audio.play().catch(() => addToast('Could not play audio', 'error'));
    setIsPlaying(true);

    progressInterval.current = setInterval(() => {
      if (!audio.paused && audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
      if (audio.ended) {
        setIsPlaying(false);
        setProgress(0);
        if (progressInterval.current) clearInterval(progressInterval.current);
      }
    }, 250);
  }, [activeTrackId, isPlaying, volume, addToast]);

  const handleSeek = useCallback((v: number) => {
    if (audioRef.current && audioRef.current.duration) {
      audioRef.current.currentTime = (v / 100) * audioRef.current.duration;
      setProgress(v);
    }
  }, []);

  const handleVolume = useCallback((v: number) => {
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  }, []);

  // ── Poll task status ─────────────────────────────────────────────────────────

  const pollStatus = useCallback(async (taskId: string, trackId: string) => {
    let attempts = 0;
    const MAX = 120; // 10 min max

    const tick = async () => {
      if (attempts++ > MAX) {
        setTracks(prev => prev.map(t => t.id === trackId ? { ...t, status: 'error' } : t));
        return;
      }

      try {
        const res  = await fetch(`/api/music/status?taskId=${taskId}`);
        const json = await res.json();

        if (!json.success) {
          setTimeout(tick, 5000);
          return;
        }

        const d = json.data;
        // sunoapi returns an array of clips when complete
        const clips: any[] = Array.isArray(d) ? d : (d.clips ?? d.data ?? [d]);
        const firstClip    = clips[0];

        if (!firstClip) { setTimeout(tick, 5000); return; }

        const sunoStatus = firstClip.status ?? firstClip.state ?? '';

        if (sunoStatus === 'complete' || sunoStatus === 'streaming') {
          const audioUrl = firstClip.audio_url ?? firstClip.audioUrl ?? '';
          const imageUrl = firstClip.image_url ?? firstClip.imageUrl ?? '';
          const dur      = firstClip.duration ?? undefined;
          const clipId   = firstClip.id ?? firstClip.clip_id ?? undefined;
          const songTitle = firstClip.title ?? firstClip.display_name ?? '';

          setTracks(prev => prev.map(t =>
            t.id === trackId
              ? { ...t, status: 'complete', audioUrl, imageUrl, duration: dur, clipId,
                  title: songTitle || t.title }
              : t
          ));
          addToast('🎵 Track ready!', 'success');
        } else if (sunoStatus === 'error' || sunoStatus === 'failed') {
          setTracks(prev => prev.map(t => t.id === trackId ? { ...t, status: 'error' } : t));
          addToast('Generation failed', 'error');
        } else {
          // still processing
          setTimeout(tick, 5000);
        }
      } catch {
        setTimeout(tick, 6000);
      }
    };

    setTimeout(tick, 5000);
  }, [addToast]);

  // ── Generate song ────────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    const isCustom = mode === 'custom';

    if (!isCustom && !prompt.trim()) {
      setError('Describe the song you want to create');
      return;
    }
    if (isCustom && !instrumental && !lyrics.trim()) {
      setError('Add lyrics or switch to instrumental');
      return;
    }
    if (isCustom && !style.trim()) {
      setError('Add a music style (e.g. "dark trap, 808s")');
      return;
    }

    setError(null);
    setIsGenerating(true);

    const trackId    = uid();
    const trackTitle = title.trim() || (isCustom ? 'Custom Track' : prompt.slice(0, 40) + '…');

    // Optimistic track card
    setTracks(prev => [{
      id:        trackId,
      title:     trackTitle,
      audioUrl:  '',
      status:    'generating',
      model,
      style:     style || prompt.slice(0, 30),
      createdAt: new Date(),
    }, ...prev]);

    try {
      const body: Record<string, unknown> = {
        model,
        instrumental,
        ...(isCustom
          ? { customMode: true, prompt: lyrics, style, title: trackTitle,
              ...(vocalGender ? { vocalGender } : {}) }
          : { customMode: false, prompt }),
      };

      const res  = await fetch('/api/music/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      const json = await res.json();

      if (!json.success) {
        throw new Error(json.error || 'Generation failed');
      }

      const taskId = json.data?.taskId ?? json.data?.task_id ?? json.data?.id;
      if (!taskId) throw new Error('No task ID returned');

      pollStatus(taskId, trackId);
    } catch (err: any) {
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, status: 'error' } : t));
      setError(err.message || 'Something went wrong');
      addToast(err.message || 'Generation failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [mode, prompt, lyrics, style, title, instrumental, model, vocalGender, pollStatus, addToast]);

  // ── Generate lyrics ──────────────────────────────────────────────────────────

  const handleGenLyrics = useCallback(async () => {
    const theme = prompt || title || 'love and loss';
    setIsGenLyrics(true);
    try {
      const res  = await fetch('/api/music/generate-lyrics', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ theme, style, mood: '' }),
      });
      const json = await res.json();
      if (json.success) {
        setLyrics(json.data.lyrics);
        setMode('custom');
        addToast('Lyrics generated!', 'success');
      }
    } catch {
      addToast('Failed to generate lyrics', 'error');
    } finally {
      setIsGenLyrics(false);
    }
  }, [prompt, title, style, addToast]);

  // ── Extend song ──────────────────────────────────────────────────────────────

  const handleExtend = useCallback(async () => {
    if (!extendModal?.clipId) return;
    setIsExtending(true);

    const trackId = uid();
    setTracks(prev => [{
      id:        trackId,
      title:     `${extendModal.title} (Extended)`,
      audioUrl:  '',
      status:    'generating',
      model:     extendModal.model,
      style:     extendModal.style,
      isExtension: true,
      parentTitle: extendModal.title,
      createdAt: new Date(),
    }, ...prev]);

    try {
      const res  = await fetch('/api/music/extend', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ clipId: extendModal.clipId, prompt: extendPrompt }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const taskId = json.data?.taskId ?? json.data?.task_id;
      if (taskId) pollStatus(taskId, trackId);
    } catch (err: any) {
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, status: 'error' } : t));
      addToast(err.message || 'Extend failed', 'error');
    } finally {
      setIsExtending(false);
      setExtendModal(null);
      setExtendPrompt('');
    }
  }, [extendModal, extendPrompt, pollStatus, addToast]);

  // ── Download ─────────────────────────────────────────────────────────────────

  const handleDownload = useCallback((track: GeneratedTrack) => {
    if (!track.audioUrl) return;
    const a = document.createElement('a');
    a.href     = track.audioUrl;
    a.download = `${track.title.replace(/[^a-z0-9]/gi, '_')}.mp3`;
    a.click();
    addToast('Downloading…', 'success');
  }, [addToast]);

  // ── Toggle like ───────────────────────────────────────────────────────────────

  const handleLike = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, liked: !t.liked } : t));
  }, []);

  // ── Insert lyric tag ─────────────────────────────────────────────────────────

  const insertTag = (tag: string) => {
    setLyrics(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : '\n') + tag + '\n');
  };

  const charCount  = (mode === 'describe' ? prompt : lyrics).length;
  const charLimit  = mode === 'describe' ? 200 : 3000;
  const charPct    = Math.min(charCount / charLimit, 1);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-purple-600/8 blur-[120px]" />
        <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-pink-600/6 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[80px]" />
      </div>

      <div className={`relative max-w-6xl mx-auto px-4 py-8 ${activeTrack ? 'pb-28' : ''}`}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/chat"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
              title="Back to Chat"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                Music Studio
              </h1>
              <p className="text-white/40 text-sm mt-0.5">Create professional tracks with AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 text-xs font-medium flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              Suno V5.5
            </span>
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[520px_1fr] gap-6">

          {/* LEFT — Creation panel */}
          <div className="space-y-4">

            {/* Mode toggle */}
            <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
              <button
                onClick={() => setMode('describe')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  mode === 'describe'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Describe
                </span>
              </button>
              <button
                onClick={() => setMode('custom')}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  mode === 'custom'
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-white/50 hover:text-white/80'
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Mic2 className="w-4 h-4" />
                  Custom
                </span>
              </button>
            </div>

            {/* Instrumental toggle */}
            <button
              onClick={() => setInstrumental(p => !p)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                instrumental
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                  : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20 hover:text-white/80'
              }`}
            >
              <span className="flex items-center gap-2 text-sm font-medium">
                <Headphones className="w-4 h-4" />
                Instrumental (no vocals)
              </span>
              <div className={`w-10 h-5 rounded-full transition-all relative ${
                instrumental ? 'bg-purple-500' : 'bg-white/10'
              }`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-sm ${
                  instrumental ? 'left-[calc(100%-18px)]' : 'left-0.5'
                }`} />
              </div>
            </button>

            {/* DESCRIBE MODE */}
            {mode === 'describe' && (
              <div className="space-y-3">
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value.slice(0, charLimit))}
                    placeholder="Describe the song you want to create…"
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 resize-none focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all text-sm"
                  />
                  {/* Char counter */}
                  <div className="absolute bottom-3 right-3 flex items-center gap-2">
                    <div className="relative w-6 h-6">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 -rotate-90">
                        <circle cx="12" cy="12" r="10" strokeWidth="2" className="stroke-white/10 fill-none" />
                        <circle cx="12" cy="12" r="10" strokeWidth="2"
                          className={`fill-none transition-all ${charPct > 0.9 ? 'stroke-red-400' : 'stroke-purple-500'}`}
                          strokeDasharray={`${charPct * 62.8} 62.8`}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Example prompts */}
                <div>
                  <p className="text-white/30 text-xs mb-2 uppercase tracking-wider">Examples</p>
                  <div className="space-y-1.5">
                    {PROMPT_EXAMPLES.slice(0, 3).map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => setPrompt(ex)}
                        className="w-full text-left text-white/50 text-xs px-3 py-2 rounded-xl bg-white/3 border border-white/5 hover:bg-white/8 hover:text-white/80 hover:border-white/15 transition-all line-clamp-1"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CUSTOM MODE */}
            {mode === 'custom' && (
              <div className="space-y-3">
                {/* Title */}
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Song title (optional)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all text-sm"
                />

                {/* Style */}
                <div>
                  <input
                    value={style}
                    onChange={e => setStyle(e.target.value)}
                    placeholder="Style tags: genre, mood, instruments… e.g. dark trap, 808s, melodic"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all text-sm"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {STYLE_PRESETS.slice(0, 8).map(p => (
                      <button
                        key={p.label}
                        onClick={() => setStyle(prev => prev ? `${prev}, ${p.label}` : p.label)}
                        className="px-2.5 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lyrics */}
                {!instrumental && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/40 text-xs uppercase tracking-wider">Lyrics</p>
                      <button
                        onClick={handleGenLyrics}
                        disabled={isGenLyrics}
                        className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                      >
                        {isGenLyrics ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Wand2 className="w-3 h-3" />
                        )}
                        AI Write
                      </button>
                    </div>
                    {/* Section tags */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {LYRIC_SECTION_TAGS.map(tag => (
                        <button
                          key={tag}
                          onClick={() => insertTag(tag)}
                          className="px-2 py-0.5 rounded-md text-xs bg-white/5 border border-white/10 text-white/50 hover:bg-purple-500/20 hover:text-purple-300 hover:border-purple-500/30 transition-all"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={lyrics}
                      onChange={e => setLyrics(e.target.value.slice(0, charLimit))}
                      placeholder={"[Verse 1]\nWrite your lyrics here…\n\n[Chorus]\n…"}
                      rows={8}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-white/30 resize-none focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all text-sm font-mono"
                    />
                    <p className="text-white/30 text-xs mt-1 text-right">{lyrics.length}/{charLimit}</p>
                  </div>
                )}
              </div>
            )}

            {/* Style grid (always visible) */}
            {mode === 'describe' && (
              <div>
                <p className="text-white/30 text-xs uppercase tracking-wider mb-2">Style</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {STYLE_PRESETS.map(p => (
                    <button
                      key={p.label}
                      onClick={() => setStyle(prev => prev === p.label ? '' : p.label)}
                      className={`px-2 py-2 rounded-xl text-xs font-medium transition-all border ${
                        style === p.label
                          ? `bg-gradient-to-r ${p.color} text-white border-transparent`
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Model selector */}
            <div>
              <p className="text-white/30 text-xs uppercase tracking-wider mb-2">AI Model</p>
              <div className="flex gap-2">
                {MODEL_OPTIONS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setModel(m.value)}
                    className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all relative ${
                      model === m.value
                        ? 'bg-purple-500/20 border-purple-500/50 text-white'
                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
                    }`}
                  >
                    {m.badge && (
                      <span className={`absolute -top-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0 rounded-full text-[9px] font-semibold ${
                        model === m.value ? 'bg-purple-500 text-white' : 'bg-white/20 text-white/60'
                      }`}>
                        {m.badge}
                      </span>
                    )}
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced options */}
            <button
              onClick={() => setShowAdvanced(p => !p)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/3 border border-white/8 text-white/40 hover:text-white/60 text-sm transition-all"
            >
              <span className="flex items-center gap-2">
                <Sliders className="w-4 h-4" />
                Advanced options
              </span>
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvanced && (
              <div className="bg-white/3 rounded-2xl border border-white/8 p-4 space-y-4">
                {/* Vocal gender */}
                <div>
                  <p className="text-white/50 text-xs mb-2">Vocal Style</p>
                  <div className="flex gap-2">
                    {(['', 'female', 'male'] as const).map(g => (
                      <button
                        key={g}
                        onClick={() => setVocalGender(g)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                          vocalGender === g
                            ? 'bg-purple-500/20 border-purple-500/50 text-white'
                            : 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                        }`}
                      >
                        {g === '' ? 'Auto' : g === 'female' ? 'Female' : 'Male'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-4 rounded-2xl font-semibold text-base transition-all relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed group"
              style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)' }}
            >
              <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all" />
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2 relative">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating your track…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 relative">
                  <Sparkles className="w-5 h-5" />
                  Create
                </span>
              )}
            </button>

            {/* Credits hint */}
            <p className="text-center text-white/20 text-xs">
              Each generation creates 2 variations · ~1–3 minutes
            </p>
          </div>

          {/* RIGHT — Tracks panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white/80 font-semibold text-sm uppercase tracking-wider">
                Your Tracks
              </h2>
              {tracks.length > 0 && (
                <span className="text-white/30 text-xs">{tracks.filter(t => t.status === 'complete').length} ready</span>
              )}
            </div>

            {tracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <Music2 className="w-8 h-8 text-white/20" />
                </div>
                <p className="text-white/40 font-medium">No tracks yet</p>
                <p className="text-white/20 text-sm mt-1">Describe a song and hit Create</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tracks.map(track => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    isActive={activeTrackId === track.id}
                    isPlaying={activeTrackId === track.id && isPlaying}
                    onPlay={() => playTrack(track)}
                    onDownload={() => handleDownload(track)}
                    onExtend={() => setExtendModal(track)}
                    onLike={() => handleLike(track.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mini player */}
      {activeTrack && activeTrack.status === 'complete' && (
        <MiniPlayer
          track={activeTrack}
          isPlaying={isPlaying}
          progress={progress}
          volume={volume}
          onPlayPause={() => {
            if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); }
            else { audioRef.current?.play(); setIsPlaying(true); }
          }}
          onSeek={handleSeek}
          onVolume={handleVolume}
          onClose={() => {
            audioRef.current?.pause();
            setActiveTrackId(null);
            setIsPlaying(false);
          }}
        />
      )}

      {/* Extend modal */}
      {extendModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#141420] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-semibold text-lg mb-1">Extend Song</h3>
            <p className="text-white/40 text-sm mb-4">"{extendModal.title}"</p>
            <textarea
              value={extendPrompt}
              onChange={e => setExtendPrompt(e.target.value)}
              placeholder="Optional: describe how the song should continue…"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 resize-none focus:outline-none focus:border-purple-500/50 text-sm mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setExtendModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleExtend}
                disabled={isExtending}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
              >
                {isExtending ? 'Extending…' : 'Extend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-20 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 pointer-events-auto ${
              t.type === 'success' ? 'bg-green-500/20 border border-green-500/30 text-green-300' :
              t.type === 'error'   ? 'bg-red-500/20 border border-red-500/30 text-red-300' :
                                     'bg-white/10 border border-white/20 text-white'
            }`}
          >
            {t.type === 'success' && <CheckCircle className="w-4 h-4" />}
            {t.type === 'error'   && <AlertCircle className="w-4 h-4" />}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
