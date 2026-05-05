"use client";

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Music2, Play, Pause, Download, Loader2, Sparkles, Mic2, FileText,
  Wand2, RefreshCw, X, CheckCircle, AlertCircle, Plus, ChevronRight,
  SkipBack, SkipForward, Volume2, VolumeX, Repeat, Shuffle, Heart,
  Share2, MoreHorizontal, Scissors, Zap, Radio, Headphones,
  Clock, TrendingUp, Star, Lock, Unlock, ArrowLeft, Settings,
  Sliders, Music, ImageIcon, ChevronDown, ChevronUp, RotateCcw,
  Layers, Upload,
} from 'lucide-react';
import Link from 'next/link';
import { RemixSongModal } from '@/components/music/remix-song-modal';
import { StemSeparationModal } from '@/components/music/stem-separation-modal';
import { ExtendSongModal } from '@/components/music/extend-song-modal';

// ── Types ──────────────────────────────────────────────────────────────────────

type GenerationMode = 'describe' | 'custom';
type EngineType = 'suno' | 'sonauto' | 'hybrid';

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
  engine?:        EngineType;
  hybridPhase?:   string;
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

const ENGINE_OPTIONS: { value: EngineType; label: string; badge: string; desc: string; color: string }[] = [
  { value: 'suno',     label: 'SUNO',          badge: 'Primary',  desc: 'Industry-leading AI vocals · V5.5',            color: 'from-purple-500 to-pink-500' },
  { value: 'sonauto',  label: 'Sonauto',       badge: 'Free',     desc: 'Melodia v3 · free generation · stems',         color: 'from-emerald-500 to-teal-500' },
  { value: 'hybrid',   label: 'Hybrid Studio', badge: 'Pro',      desc: '4-phase: Sonauto lyrics→stems→SUNO vocals→mix', color: 'from-amber-500 to-orange-500' },
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
  tracks,
  activeIndex,
  onPlayPause,
  onSeek,
  onVolume,
  onClose,
  onSkipNext,
  onSkipPrev,
}: {
  track: GeneratedTrack;
  isPlaying: boolean;
  progress: number;
  volume: number;
  tracks: GeneratedTrack[];
  activeIndex: number;
  onPlayPause: () => void;
  onSeek: (v: number) => void;
  onVolume: (v: number) => void;
  onClose: () => void;
  onSkipNext: () => void;
  onSkipPrev: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10">
      <div className="max-w-6xl mx-auto flex items-center gap-4 px-4 py-3">
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
          <button
            onClick={() => {}}
            className={`ml-2 p-1.5 rounded-full transition-colors ${track.liked ? 'text-pink-400' : 'text-white/30 hover:text-pink-400'}`}
          >
            <Heart className={`w-4 h-4 ${track.liked ? 'fill-pink-400' : ''}`} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-1 flex-1">
          <div className="flex items-center gap-3">
            <button onClick={onSkipPrev} className="text-white/40 hover:text-white transition-colors">
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={onPlayPause}
              className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-black fill-black" />
              ) : (
                <Play className="w-4 h-4 text-black fill-black ml-0.5" />
              )}
            </button>
            <button onClick={onSkipNext} className="text-white/40 hover:text-white transition-colors">
              <SkipForward className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 w-full max-w-md">
            <span className="text-white/40 text-xs w-8 text-right">{fmtDur((progress / 100) * (track.duration || 0))}</span>
            <input
              type="range" min="0" max="100" value={progress}
              onChange={e => onSeek(Number(e.target.value))}
              className="flex-1 h-1 accent-purple-500 cursor-pointer"
            />
            <span className="text-white/40 text-xs w-8">{fmtDur(track.duration)}</span>
          </div>
        </div>

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
  onRemix,
  onStems,
  onMore,
}: {
  track: GeneratedTrack;
  isActive: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onDownload: () => void;
  onExtend: () => void;
  onLike: () => void;
  onRemix: () => void;
  onStems: () => void;
  onMore: () => void;
}) {
  const [showActions, setShowActions] = useState(false);

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
    <div
      className={`group relative rounded-2xl overflow-hidden border transition-all duration-200 ${
        isActive
          ? 'bg-white/10 border-purple-500/50 shadow-lg shadow-purple-500/10'
          : 'bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20'
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-center gap-4 p-4">
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

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-white font-semibold truncate">{track.title}</p>
              <p className="text-white/50 text-sm truncate">{track.style || 'AI Generated'} · {fmtDur(track.duration)}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {track.model && (
                <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs">
                  {track.engine === 'hybrid' ? 'Hybrid' : track.engine === 'sonauto' ? 'Sonauto' : track.model}
                </span>
              )}
            </div>
          </div>

          {isActive && (
            <div className="mt-2">
              <Waveform isPlaying={isPlaying} bars={24} />
            </div>
          )}
        </div>

        <div className={`flex items-center gap-0.5 transition-all duration-200 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          <button
            onClick={onLike}
            className={`p-1.5 rounded-lg transition-colors ${
              track.liked ? 'text-pink-400' : 'text-white/40 hover:text-pink-400'
            }`}
            title="Like"
          >
            <Heart className={`w-4 h-4 ${track.liked ? 'fill-pink-400' : ''}`} />
          </button>
          <button
            onClick={onExtend}
            className="p-1.5 rounded-lg text-white/40 hover:text-purple-400 transition-colors"
            title="Extend"
          >
            <Zap className="w-4 h-4" />
          </button>
          <button
            onClick={onRemix}
            className="p-1.5 rounded-lg text-white/40 hover:text-cyan-400 transition-colors"
            title="Remix"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onStems}
            className="p-1.5 rounded-lg text-white/40 hover:text-amber-400 transition-colors"
            title="Separate Stems"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button
            onClick={onDownload}
            className="p-1.5 rounded-lg text-white/40 hover:text-green-400 transition-colors"
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
  const [mode, setMode]                         = useState<GenerationMode>('describe');
  const [engine, setEngine]                     = useState<EngineType>('suno');
  const [prompt, setPrompt]                     = useState('');
  const [lyrics, setLyrics]                     = useState('');
  const [title, setTitle]                       = useState('');
  const [style, setStyle]                       = useState('');
  const [instrumental, setInstrumental]         = useState(false);
  const [model, setModel]                       = useState('V5_5');
  const [vocalGender, setVocalGender]           = useState<'male' | 'female' | ''>('');
  const [showAdvanced, setShowAdvanced]         = useState(false);
  const [hybridPhase, setHybridPhase]           = useState<string>('');

  const [tracks, setTracks]                     = useState<GeneratedTrack[]>([]);
  const [isGenerating, setIsGenerating]         = useState(false);
  const [isGenLyrics, setIsGenLyrics]           = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [toasts, setToasts]                     = useState<Toast[]>([]);

  const [activeTrackId, setActiveTrackId]       = useState<string | null>(null);
  const [isPlaying, setIsPlaying]               = useState(false);
  const [progress, setProgress]                 = useState(0);
  const [volume, setVolume]                     = useState(0.8);
  const audioRef                                = useRef<HTMLAudioElement | null>(null);
  const progressInterval                        = useRef<NodeJS.Timeout | null>(null);

  const [remixTrack, setRemixTrack]             = useState<GeneratedTrack | null>(null);
  const [stemsTrack, setStemsTrack]             = useState<GeneratedTrack | null>(null);
  const [extendTrack, setExtendTrack]           = useState<GeneratedTrack | null>(null);

  const activeTrack = tracks.find(t => t.id === activeTrackId) ?? null;
  const activeIndex = tracks.filter(t => t.status === 'complete').findIndex(t => t.id === activeTrackId);
  const completedTracks = tracks.filter(t => t.status === 'complete');

  const addToast = useCallback((msg: string, type: Toast['type'] = 'info') => {
    const id = uid();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const playTrack = useCallback((track: GeneratedTrack) => {
    if (!track.audioUrl) return;

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

  const handleSkipNext = useCallback(() => {
    if (activeIndex < completedTracks.length - 1) {
      playTrack(completedTracks[activeIndex + 1]);
    }
  }, [activeIndex, completedTracks, playTrack]);

  const handleSkipPrev = useCallback(() => {
    if (activeIndex > 0) {
      playTrack(completedTracks[activeIndex - 1]);
    }
  }, [activeIndex, completedTracks, playTrack]);

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

  const generateCoverArt = useCallback(async (trackTitle: string, trackStyle: string): Promise<string | undefined> => {
    try {
      const res = await fetch('/api/music/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trackTitle, style: trackStyle }),
      });
      const json = await res.json();
      if (json.success && json.imageUrl) return json.imageUrl;
    } catch {}
    return undefined;
  }, []);

  const pollStatus = useCallback(async (taskId: string, trackId: string) => {
    let attempts = 0;
    const MAX = 120;

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

          const currentTrack = tracks.find(t => t.id === trackId);
          const finalTitle = songTitle || currentTrack?.title || 'Untitled';
          const finalStyle = currentTrack?.style || '';

          let finalImageUrl = imageUrl;
          if (!finalImageUrl) {
            const coverUrl = await generateCoverArt(finalTitle, finalStyle);
            if (coverUrl) finalImageUrl = coverUrl;
          }

          setTracks(prev => prev.map(t =>
            t.id === trackId
              ? { ...t, status: 'complete', audioUrl, imageUrl: finalImageUrl, duration: dur, clipId,
                  title: finalTitle }
              : t
          ));
          addToast('Track ready!', 'success');
        } else if (sunoStatus === 'error' || sunoStatus === 'failed') {
          setTracks(prev => prev.map(t => t.id === trackId ? { ...t, status: 'error' } : t));
          addToast('Generation failed', 'error');
        } else {
          setTimeout(tick, 5000);
        }
      } catch {
        setTimeout(tick, 6000);
      }
    };

    setTimeout(tick, 5000);
  }, [addToast, generateCoverArt, tracks]);

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

    setTracks(prev => [{
      id:        trackId,
      title:     trackTitle,
      audioUrl:  '',
      status:    'generating',
      model:     engine === 'suno' ? model : engine,
      engine,
      style:     style || prompt.slice(0, 30),
      createdAt: new Date(),
    }, ...prev]);

    try {
      if (engine === 'hybrid') {
        setHybridPhase('lyrics');
        const res = await fetch('/api/music/hybrid-studio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: isCustom ? lyrics || prompt : prompt,
            style: style || '',
            tags: style ? style.split(',').map((s: string) => s.trim()) : [],
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Hybrid Studio failed');

        setHybridPhase(json.phase || 'complete');

        if (json.data?.finalAudioUrl) {
          setTracks(prev => prev.map(t =>
            t.id === trackId
              ? { ...t, status: 'complete', audioUrl: json.data.finalAudioUrl, hybridPhase: json.phase }
              : t
          ));
          addToast('Hybrid Studio track ready!', 'success');
        } else if (json.data?.instrumentalUrl && json.data?.vocalTaskId) {
          pollStatus(json.data.vocalTaskId, trackId);
        } else if (json.data?.instrumentalUrl) {
          const coverUrl = await generateCoverArt(trackTitle, style);
          setTracks(prev => prev.map(t =>
            t.id === trackId
              ? { ...t, status: 'complete', audioUrl: json.data.instrumentalUrl, imageUrl: coverUrl, hybridPhase: json.phase }
              : t
          ));
          addToast('Instrumental ready (vocal step deferred)', 'success');
        } else {
          throw new Error('No audio returned from Hybrid Studio');
        }
      } else if (engine === 'sonauto') {
        const res = await fetch('/api/music/sonauto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: isCustom ? lyrics || prompt : prompt,
            tags: style || '',
            instrumental,
            waitForResult: true,
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Sonauto generation failed');

        const audioPaths = json.data?.songPaths || [];
        if (audioPaths.length > 0) {
          const coverUrl = await generateCoverArt(trackTitle, style);
          setTracks(prev => prev.map(t =>
            t.id === trackId
              ? { ...t, status: 'complete', audioUrl: audioPaths[0], imageUrl: coverUrl }
              : t
          ));
          addToast('Sonauto track ready!', 'success');
        } else {
          const taskId = json.data?.taskId;
          if (taskId) {
            const pollSonauto = async () => {
              const statusRes = await fetch(`/api/music/sonauto?taskId=${taskId}`);
              const statusJson = await statusRes.json();
              if (statusJson.status === 'SUCCESS' && statusJson.data?.songPaths?.[0]) {
                const coverUrl = await generateCoverArt(trackTitle, style);
                setTracks(prev => prev.map(t =>
                  t.id === trackId
                    ? { ...t, status: 'complete', audioUrl: statusJson.data.songPaths[0], imageUrl: coverUrl }
                    : t
                ));
                addToast('Sonauto track ready!', 'success');
              } else if (statusJson.status === 'FAILURE') {
                setTracks(prev => prev.map(t => t.id === trackId ? { ...t, status: 'error' } : t));
                addToast('Sonauto generation failed', 'error');
              } else {
                setTimeout(pollSonauto, 5000);
              }
            };
            setTimeout(pollSonauto, 5000);
          } else {
            throw new Error('No taskId or audio from Sonauto');
          }
        }
      } else {
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
      }
    } catch (err: any) {
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, status: 'error' } : t));
      setError(err.message || 'Something went wrong');
      addToast(err.message || 'Generation failed', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [mode, prompt, lyrics, style, title, instrumental, model, engine, vocalGender, pollStatus, addToast, generateCoverArt]);

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

  const handleExtendFromModal = useCallback(async (data: { continue_clip_id: string; prompt: string; continue_at?: number }) => {
    const parentTrack = extendTrack;
    if (!parentTrack?.clipId) return;

    const trackId = uid();
    setTracks(prev => [{
      id:        trackId,
      title:     `${parentTrack.title} (Extended)`,
      audioUrl:  '',
      status:    'generating',
      model:     parentTrack.model,
      style:     parentTrack.style,
      isExtension: true,
      parentTitle: parentTrack.title,
      createdAt: new Date(),
    }, ...prev]);

    try {
      const res = await fetch('/api/music/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clipId: parentTrack.clipId, prompt: data.prompt }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const taskId = json.data?.taskId ?? json.data?.task_id;
      if (taskId) pollStatus(taskId, trackId);
    } catch (err: any) {
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, status: 'error' } : t));
      addToast(err.message || 'Extend failed', 'error');
    }
  }, [extendTrack, pollStatus, addToast]);

  const handleRemix = useCallback(async (data: {
    audio_url: string; prompt: string; style: string; title: string;
    audio_weight: number; style_weight: number;
  }) => {
    const trackId = uid();
    setTracks(prev => [{
      id:        trackId,
      title:     data.title,
      audioUrl:  '',
      status:    'generating',
      model,
      style:     data.style,
      createdAt: new Date(),
    }, ...prev]);

    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customMode: false,
          prompt: `Remix: ${data.prompt}. Style: ${data.style}`,
          model,
          instrumental: false,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      const taskId = json.data?.taskId ?? json.data?.task_id;
      if (taskId) pollStatus(taskId, trackId);
    } catch (err: any) {
      setTracks(prev => prev.map(t => t.id === trackId ? { ...t, status: 'error' } : t));
      addToast(err.message || 'Remix failed', 'error');
    }
  }, [model, pollStatus, addToast]);

  const handleStemSeparation = useCallback(async (data: { audio_url: string; song_id: string; stems: string[] }) => {
    addToast('Stem separation starting… this may take 30-90 seconds', 'info');
    try {
      const res = await fetch('/api/music/stem-separate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success) {
        addToast('Stems separated! Check your downloads.', 'success');
        return json;
      }
      throw new Error(json.error || 'Separation failed');
    } catch (err: any) {
      addToast(err.message || 'Stem separation not available yet', 'error');
      throw err;
    }
  }, [addToast]);

  const handleDownload = useCallback((track: GeneratedTrack) => {
    if (!track.audioUrl) return;
    const a = document.createElement('a');
    a.href     = track.audioUrl;
    a.download = `${track.title.replace(/[^a-z0-9]/gi, '_')}.mp3`;
    a.click();
    addToast('Downloading…', 'success');
  }, [addToast]);

  const handleLike = useCallback((trackId: string) => {
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, liked: !t.liked } : t));
  }, []);

  const insertTag = (tag: string) => {
    setLyrics(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : '\n') + tag + '\n');
  };

  const charCount  = (mode === 'describe' ? prompt : lyrics).length;
  const charLimit  = mode === 'describe' ? 200 : 3000;
  const charPct    = Math.min(charCount / charLimit, 1);

  return (
    <div className="flex h-screen bg-[#0a0a0f] text-white overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-purple-600/8 blur-[120px]" />
        <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-pink-600/6 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-blue-600/5 blur-[80px]" />
      </div>

      {/* LEFT PANE - Creation Controls */}
      <div className="relative z-10 w-[380px] h-full flex flex-col bg-[#0a0a0f]/80 backdrop-blur-xl border-r border-white/10 flex-shrink-0">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href="/chat"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all flex-shrink-0"
              title="Back to Chat"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent truncate">
                Music Studio
              </h1>
              <p className="text-white/40 text-[11px] truncate">Powered by HOLLY SDI</p>
            </div>
          </div>
        </div>

        {/* Scrollable Form Area */}
        <div className={`flex-1 overflow-y-auto p-5 space-y-6 ${activeTrack ? 'pb-32' : 'pb-8'} [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full`}>
          
          {/* Creation panel */}
          <div className="space-y-5">

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

            {mode === 'custom' && (
              <div className="space-y-3">
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Song title (optional)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 focus:bg-white/8 transition-all text-sm"
                />

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

            <div>
              <p className="text-white/30 text-xs uppercase tracking-wider mb-2">Engine</p>
              <div className="flex gap-2">
                {ENGINE_OPTIONS.map(eng => (
                  <button
                    key={eng.value}
                    onClick={() => setEngine(eng.value)}
                    className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-medium transition-all relative ${
                      engine === eng.value
                        ? `bg-gradient-to-r ${eng.color}/20 border-white/30 text-white`
                        : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:border-white/20'
                    }`}
                  >
                    <span className="block text-sm font-semibold">{eng.label}</span>
                    <span className="block text-[10px] text-white/40 mt-0.5">{eng.desc}</span>
                    {eng.badge && (
                      <span className={`absolute -top-1.5 right-2 px-1.5 py-0 rounded-full text-[9px] font-semibold ${
                        engine === eng.value ? 'bg-white/20 text-white' : 'bg-white/10 text-white/40'
                      }`}>
                        {eng.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {engine === 'suno' && (
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
            )}

            {engine === 'hybrid' && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-2">
              <p className="text-amber-300 text-sm font-semibold flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Hybrid Studio — 4-Phase Pipeline
              </p>
              <div className="space-y-1.5 text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center text-[10px] font-bold">1</span>
                  Sonauto writes lyrics from your prompt
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/30 text-emerald-300 flex items-center justify-center text-[10px] font-bold">2</span>
                  Sonauto generates instrumental stems
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-500/30 text-purple-300 flex items-center justify-center text-[10px] font-bold">3</span>
                  SUNO adds vocals via Audio-to-Audio
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-amber-500/30 text-amber-300 flex items-center justify-center text-[10px] font-bold">4</span>
                  Final assembly — combined mix
                </div>
              </div>
              <p className="text-white/30 text-[11px] mt-1">
                ~5-10 min total · Best quality · Requires SUNO + Sonauto keys
              </p>
            </div>
            )}

            {engine === 'sonauto' && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
              <p className="text-emerald-300 text-sm font-semibold flex items-center gap-2">
                <Radio className="w-4 h-4" />
                Sonauto Melodia v3 — Free Generation
              </p>
              <p className="text-white/50 text-xs">
                Free music generation with stem support. Great for instrumentals, beats, and demos.
                No SUNO credits consumed.
              </p>
            </div>
            )}

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

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

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
                  {engine === 'hybrid' ? `Running pipeline: ${hybridPhase || 'starting'}...` : 'Creating your track…'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2 relative">
                  <Sparkles className="w-5 h-5" />
                  Create with {ENGINE_OPTIONS.find(e => e.value === engine)?.label}
                </span>
              )}
            </button>

            <p className="text-center text-white/20 text-xs">
              {engine === 'hybrid' ? '~5-10 min · 4-phase pipeline · Best quality' :
               engine === 'sonauto' ? '~30-60 sec · Free generation · No credits used' :
               'Each generation creates 2 variations · ~1-3 minutes'}
            </p>
          </div>

        </div>
      </div>

      {/* RIGHT PANE - Tracks Library */}
      <div className={`relative z-10 flex-1 h-full overflow-y-auto px-8 py-8 ${activeTrack ? 'pb-32' : 'pb-8'} [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full`}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div>
              <h2 className="text-white font-bold text-xl tracking-tight">
                Your Tracks
              </h2>
              <p className="text-white/40 text-sm mt-1">Listen, extending, and remix your ideas</p>
            </div>
            {tracks.length > 0 && (
              <span className="text-white/40 text-sm font-medium bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">{completedTracks.length} ready</span>
            )}
          </div>

          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-2xl">
                <Music2 className="w-10 h-10 text-white/20" />
              </div>
              <p className="text-white/60 font-medium text-lg">No tracks yet</p>
              <p className="text-white/30 text-sm mt-2 max-w-xs leading-relaxed">Enter a prompt in the left sidebar and click generate to create your first masterpiece.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {tracks.map(track => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isActive={activeTrackId === track.id}
                  isPlaying={activeTrackId === track.id && isPlaying}
                  onPlay={() => playTrack(track)}
                  onDownload={() => handleDownload(track)}
                  onExtend={() => setExtendTrack(track)}
                  onLike={() => handleLike(track.id)}
                  onRemix={() => setRemixTrack(track)}
                  onStems={() => setStemsTrack(track)}
                  onMore={() => {}}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mini player */}
      {activeTrack && activeTrack.status === 'complete' && (
        <MiniPlayer
          track={activeTrack}
          isPlaying={isPlaying}
          progress={progress}
          volume={volume}
          tracks={completedTracks}
          activeIndex={activeIndex}
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
          onSkipNext={handleSkipNext}
          onSkipPrev={handleSkipPrev}
        />
      )}

      {/* Extend modal (using enhanced component) */}
      {extendTrack && extendTrack.clipId && (
        <ExtendSongModal
          isOpen={true}
          onClose={() => setExtendTrack(null)}
          song={{
            id: extendTrack.clipId,
            title: extendTrack.title,
            audio_url: extendTrack.audioUrl,
            tags: extendTrack.style,
            image_url: extendTrack.imageUrl,
            duration: extendTrack.duration,
          }}
          onExtend={handleExtendFromModal}
        />
      )}

      {/* Fallback extend modal for tracks without clipId */}
      {extendTrack && !extendTrack.clipId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#141420] border border-white/10 rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white font-semibold text-lg mb-1">Extend Song</h3>
            <p className="text-white/40 text-sm mb-4">"{extendTrack.title}"</p>
            <textarea
              value={''}
              onChange={() => {}}
              placeholder="This track doesn't have a clip ID for extension. Try generating a new track."
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 resize-none focus:outline-none focus:border-purple-500/50 text-sm mb-4"
              disabled
            />
            <button
              onClick={() => setExtendTrack(null)}
              className="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white text-sm font-medium transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Remix modal */}
      {remixTrack && (
        <RemixSongModal
          isOpen={true}
          onClose={() => setRemixTrack(null)}
          song={{
            id: remixTrack.id,
            title: remixTrack.title,
            audio_url: remixTrack.audioUrl,
            tags: remixTrack.style,
            image_url: remixTrack.imageUrl,
          }}
          onRemix={handleRemix}
        />
      )}

      {/* Stem separation modal */}
      {stemsTrack && (
        <StemSeparationModal
          isOpen={true}
          onClose={() => setStemsTrack(null)}
          song={{
            id: stemsTrack.id,
            title: stemsTrack.title,
            audio_url: stemsTrack.audioUrl,
            image_url: stemsTrack.imageUrl,
          }}
          onSeparate={handleStemSeparation}
        />
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
