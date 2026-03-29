"use client";

import { useState, useRef, useCallback } from 'react';
import {
  Music, Play, Pause, Download, Loader2, Sparkles, Mic, FileText,
  Wand2, Image as ImageIcon, RefreshCw, Scissors, ArrowUpCircle,
  ChevronDown, ChevronUp, X, CheckCircle, AlertCircle, Plus,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeneratedTrack {
  id:             string;
  clipId?:        string;
  title:          string;
  audioUrl:       string;
  imageUrl?:      string;
  customCoverUrl?: string;
  duration?:      number;
  status:         'generating' | 'complete' | 'error';
  isExtension?:   boolean;
  parentTitle?:   string;
  model?:         string;
}

interface StemResult {
  jobId:    string;
  provider: string;
  status:   'processing' | 'completed' | 'failed';
  stems?:   Record<string, string>;
}

interface StemModal {
  trackId:    string;
  trackTitle: string;
  audioUrl:   string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDur(sec?: number) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const STEM_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  vocals: { label: 'Vocals',       emoji: '🎤', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
  drums:  { label: 'Drums',        emoji: '🥁', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  bass:   { label: 'Bass',         emoji: '🎸', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  other:  { label: 'Instruments',  emoji: '🎹', color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  piano:  { label: 'Piano',        emoji: '🎹', color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  guitar: { label: 'Guitar',       emoji: '🎸', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
};

const STYLE_PRESETS = [
  'Lo-Fi Chill', 'Epic Cinematic', 'Acoustic Folk', 'Electronic Dance',
  'Jazz Smooth', 'R&B Soul', 'Hip-Hop', 'Rock Alternative',
  'Pop Anthem', 'Afrobeats', 'Drill', 'Trap',
];

const MODEL_OPTIONS = [
  { value: 'V4_5PLUS', label: 'V4.5+ (Best Quality)',   desc: 'Richest tones · up to 8 min',    badge: 'Recommended' },
  { value: 'V4_5ALL',  label: 'V4.5 All (Best Structure)', desc: 'Best song structure · up to 8 min', badge: '' },
  { value: 'V4_5',     label: 'V4.5 (Balanced)',         desc: 'Fast & great quality · up to 8 min', badge: '' },
  { value: 'V5',       label: 'V5 (Latest)',             desc: 'Cutting-edge quality',           badge: 'New' },
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function MusicStudio() {
  // ── Form state ────────────────────────────────────────────────────────────
  const [prompt, setPrompt]               = useState('');
  const [lyrics, setLyrics]               = useState('');
  const [title, setTitle]                 = useState('');
  const [style, setStyle]                 = useState('');
  const [instrumental, setInstrumental]   = useState(false);
  const [useLyrics, setUseLyrics]         = useState(false);    // provide custom lyrics vs. AI auto-generates
  const [model, setModel]                 = useState('V4_5PLUS');
  const [generateCover, setGenerateCover] = useState(true);
  const [showAdvanced, setShowAdvanced]   = useState(false);
  const [vocalGender, setVocalGender]     = useState<'m' | 'f' | ''>('');
  const [styleWeight, setStyleWeight]     = useState(0.65);
  const [weirdness, setWeirdness]         = useState(0.65);

  // ── Track / generation state ───────────────────────────────────────────────
  const [tracks, setTracks]                     = useState<GeneratedTrack[]>([]);
  const [isGenerating, setIsGenerating]         = useState(false);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [isGeneratingCover, setIsGeneratingCover]   = useState(false);
  const [playingTrackId, setPlayingTrackId]     = useState<string | null>(null);
  const [error, setError]                       = useState<string | null>(null);

  // ── Extend state ───────────────────────────────────────────────────────────
  const [extendingId, setExtendingId]           = useState<string | null>(null);
  const [showExtendModal, setShowExtendModal]   = useState<string | null>(null);
  const [extendPrompt, setExtendPrompt]         = useState('');

  // ── Stem state ─────────────────────────────────────────────────────────────
  const [stemModal, setStemModal]               = useState<StemModal | null>(null);
  const [stemResult, setStemResult]             = useState<StemResult | null>(null);
  const [isSeparating, setIsSeparating]         = useState(false);
  const [stemModel, setStemModel]               = useState<'4stems' | '2stems' | '6stems'>('4stems');
  const stemPollRef                             = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRefs                               = useRef<Record<string, HTMLAudioElement | null>>({});

  // ── Generate full song ────────────────────────────────────────────────────

  const handleGenerate = async () => {
    const hasContent = useLyrics ? lyrics.trim() : prompt.trim();
    if (!hasContent && !instrumental) {
      setError('Enter a description or lyrics for your song'); return;
    }
    if (instrumental && !style) {
      setError('Enter a style/genre for your instrumental track'); return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        instrumental,
        model,
        // When user provides lyrics → customMode = true; prompt = lyrics
        // When instrumental       → customMode = true; prompt = description
        // Otherwise               → customMode = false; prompt = description (Suno auto-generates lyrics)
        customMode:  useLyrics || instrumental,
        prompt:      useLyrics ? lyrics : prompt,
      };

      // customMode requires style + title
      if (useLyrics || instrumental) {
        body.style = style || 'Pop';
        body.title = title || prompt.slice(0, 80) || 'My Song';
      }

      if (showAdvanced) {
        if (vocalGender)  body.vocalGender          = vocalGender;
        body.styleWeight           = styleWeight;
        body.weirdnessConstraint   = weirdness;
      }

      const res    = await fetch('/api/music/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = await res.json();
      if (!result.success) throw new Error(result.error ?? 'Failed to generate');

      const taskId   = result.data.taskId;
      const newTrack: GeneratedTrack = {
        id: taskId, title: (title || prompt.slice(0, 50) || 'Untitled Track'), audioUrl: '', status: 'generating', model,
      };

      setTracks(prev => [newTrack, ...prev]);
      if (generateCover) generateCustomCover(taskId);
      pollTrackStatus(taskId);

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate music');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Extend (optional — add more song after initial) ───────────────────────

  const handleExtend = async (track: GeneratedTrack) => {
    if (!track.clipId) { setError('Clip ID not available — regenerate the track'); return; }
    setExtendingId(track.id);
    setShowExtendModal(null);

    try {
      const res    = await fetch('/api/music/extend', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clipId: track.clipId, prompt: extendPrompt || undefined, style: style || undefined, title: track.title ? `${track.title} (Extended)` : undefined }),
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error ?? 'Failed to extend');

      const taskId  = result.data.taskId;
      const extTrack: GeneratedTrack = {
        id: taskId, title: track.title ? `${track.title} (Extended)` : 'Extended Track',
        audioUrl: '', status: 'generating', isExtension: true, parentTitle: track.title, model: track.model,
      };
      setTracks(prev => [extTrack, ...prev]);
      setExtendPrompt('');
      pollTrackStatus(taskId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to extend');
    } finally {
      setExtendingId(null);
    }
  };

  // ── Stem separation ───────────────────────────────────────────────────────

  const startStemSeparation = async () => {
    if (!stemModal) return;
    setIsSeparating(true);
    setStemResult(null);
    if (stemPollRef.current) clearInterval(stemPollRef.current);

    try {
      const res  = await fetch('/api/audio/stem-separate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl: stemModal.audioUrl, fileName: stemModal.trackTitle, model: stemModel, quality: 'fast' }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Stem separation failed');

      const sr: StemResult = { jobId: data.jobId, provider: data.provider, status: data.status, stems: data.stems };
      setStemResult(sr);
      if (data.status === 'processing') pollStemStatus(data.jobId, data.provider);
      else setIsSeparating(false);
    } catch {
      setStemResult({ jobId: '', provider: '', status: 'failed' });
      setIsSeparating(false);
    }
  };

  const pollStemStatus = useCallback((jobId: string, provider: string) => {
    let attempts = 0;
    stemPollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res  = await fetch(`/api/audio/stem-status?jobId=${jobId}&provider=${provider}`);
        const data = await res.json();
        if (data.status === 'completed') {
          clearInterval(stemPollRef.current!);
          setStemResult(prev => prev ? { ...prev, status: 'completed', stems: data.stems } : null);
          setIsSeparating(false);
        } else if (data.status === 'failed' || attempts >= 40) {
          clearInterval(stemPollRef.current!);
          setStemResult(prev => prev ? { ...prev, status: 'failed' } : null);
          setIsSeparating(false);
        }
      } catch { if (attempts >= 40) { clearInterval(stemPollRef.current!); setIsSeparating(false); } }
    }, 5000);
  }, []);

  // ── Cover art ─────────────────────────────────────────────────────────────

  const generateCustomCover = async (taskId: string) => {
    try {
      setIsGeneratingCover(true);
      const res    = await fetch('/api/music/generate-cover', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, style, lyrics: useLyrics ? lyrics : prompt }),
      });
      const result = await res.json();
      if (result.success && result.data?.imageUrl) {
        setTracks(prev => prev.map(t => t.id === taskId ? { ...t, customCoverUrl: result.data.imageUrl } : t));
      }
    } catch {} finally { setIsGeneratingCover(false); }
  };

  const regenerateCover = async (track: GeneratedTrack) => {
    try {
      setIsGeneratingCover(true);
      const res    = await fetch('/api/music/generate-cover', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: track.title, style, lyrics: useLyrics ? lyrics : prompt }),
      });
      const result = await res.json();
      if (result.success && result.data?.imageUrl) {
        setTracks(prev => prev.map(t => t.id === track.id ? { ...t, customCoverUrl: result.data.imageUrl } : t));
      }
    } catch {} finally { setIsGeneratingCover(false); }
  };

  // ── Status polling ────────────────────────────────────────────────────────

  const pollTrackStatus = (taskId: string) => {
    let attempts = 0;
    const poll = async () => {
      try {
        const res    = await fetch(`/api/music/status?taskId=${taskId}`);
        const result = await res.json();
        if (result.success && result.data?.status === 'SUCCESS' && result.data.response?.sunoData) {
          const trk = result.data.response.sunoData[0];
          setTracks(prev => prev.map(t =>
            t.id === taskId
              ? { ...t, clipId: trk.clipId ?? trk.id ?? taskId, audioUrl: trk.audioUrl ?? trk.streamAudioUrl, imageUrl: trk.imageUrl, duration: trk.duration, status: 'complete' }
              : t
          ));
          return;
        }
        if (attempts < 60) { attempts++; setTimeout(poll, 5000); }
        else setTracks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error' } : t));
      } catch {
        if (attempts < 60) { attempts++; setTimeout(poll, 5000); }
      }
    };
    poll();
  };

  // ── Audio ─────────────────────────────────────────────────────────────────

  const togglePlay = (trackId: string) => {
    if (playingTrackId === trackId) {
      audioRefs.current[trackId]?.pause();
      setPlayingTrackId(null);
    } else {
      if (playingTrackId) audioRefs.current[playingTrackId]?.pause();
      audioRefs.current[trackId]?.play();
      setPlayingTrackId(trackId);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 text-white">

      {/* Header */}
      <div className="border-b border-purple-500/30 bg-black/40 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music className="w-8 h-8 text-purple-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Music Studio
            </h1>
            <span className="text-xs text-purple-400/60 border border-purple-500/20 rounded-full px-2 py-0.5">
              Full Songs · Up to 8 min
            </span>
          </div>
          <Link href="/chat" className="px-4 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 transition-colors text-sm">
            ← Back to Chat
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── LEFT: Creation Panel ─────────────────────────────────────────── */}
          <div className="space-y-5">
            <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">

              <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Create a Full Song
              </h2>
              <p className="text-xs text-gray-500 mb-5">
                HOLLY always generates complete songs (2–8 minutes). Use Extend anytime to add more.
              </p>

              {/* Song title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Song Title</label>
                <input
                  type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Give your song a title"
                  className="w-full px-4 py-2.5 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
                  maxLength={80}
                />
              </div>

              {/* Style */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Style / Genre</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {STYLE_PRESETS.map(p => (
                    <button key={p} onClick={() => setStyle(style === p ? '' : p)}
                      className={`px-2.5 py-1 text-xs border rounded-full transition-colors ${
                        style === p ? 'bg-purple-600 border-purple-500 text-white' : 'bg-purple-600/10 hover:bg-purple-600/30 border-purple-500/30 text-gray-300'
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  type="text" value={style} onChange={e => setStyle(e.target.value)}
                  placeholder="Or type your own style, e.g. 'Dark Afrobeats'"
                  className="w-full px-4 py-2.5 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 text-sm"
                  maxLength={1000}
                />
              </div>

              {/* Lyrics mode toggle */}
              <div className="flex flex-wrap gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={useLyrics} onChange={e => { setUseLyrics(e.target.checked); if (e.target.checked) setInstrumental(false); }}
                    className="w-4 h-4 rounded border-purple-500/50 accent-purple-500" />
                  <FileText className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-300">Write my own lyrics</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={instrumental} onChange={e => { setInstrumental(e.target.checked); if (e.target.checked) setUseLyrics(false); }}
                    className="w-4 h-4 rounded border-purple-500/50 accent-purple-500" />
                  <Mic className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Instrumental (no vocals)</span>
                </label>
              </div>

              {/* Lyrics or description */}
              {useLyrics && !instrumental ? (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-gray-300">Lyrics *</label>
                    <button
                      onClick={async () => {
                        if (!title && !prompt) { setError('Enter a title or description first'); return; }
                        setIsGeneratingLyrics(true);
                        try {
                          const r = await fetch('/api/music/generate-lyrics', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ theme: title || prompt, style: style || 'pop', mood: 'emotional' }),
                          });
                          const d = await r.json();
                          if (d.success) setLyrics(d.data.lyrics);
                          else setError(d.error ?? 'Failed to generate lyrics');
                        } finally { setIsGeneratingLyrics(false); }
                      }}
                      disabled={isGeneratingLyrics}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-50"
                    >
                      {isGeneratingLyrics ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      AI Write Lyrics
                    </button>
                  </div>
                  <textarea
                    value={lyrics} onChange={e => setLyrics(e.target.value)}
                    placeholder={"[Intro]\n...\n\n[Verse 1]\nYour lyrics here...\n\n[Chorus]\nYour chorus here...\n\n[Verse 2]\n...\n\n[Bridge]\n...\n\n[Outro]\n..."}
                    className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 resize-none font-mono text-sm"
                    rows={14} maxLength={5000}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{lyrics.length}/5000</span>
                    <span className="text-blue-400">💡 Use [Verse], [Chorus], [Bridge], [Outro] tags for best results</span>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    {instrumental ? 'Describe the music' : 'Describe your song *'}
                  </label>
                  <textarea
                    value={prompt} onChange={e => setPrompt(e.target.value)}
                    placeholder={
                      instrumental
                        ? "e.g. Moody lo-fi piano with soft rain sounds and a relaxing groove..."
                        : "e.g. A heartfelt love song about missing someone at night, sad but hopeful, with piano and strings..."
                    }
                    className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 resize-none text-sm"
                    rows={4} maxLength={5000}
                  />
                  <p className="text-xs text-gray-500 mt-1">{prompt.length}/5000 · AI will auto-generate lyrics from your description</p>
                </div>
              )}

              {/* Model selector */}
              <div className="mb-4">
                <button onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 mb-3">
                  <Wand2 className="w-4 h-4" />
                  {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                  {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showAdvanced && (
                  <div className="space-y-4 p-4 bg-purple-900/10 border border-purple-500/20 rounded-lg mb-4">

                    {/* Model */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">AI Model</label>
                      <div className="grid grid-cols-2 gap-2">
                        {MODEL_OPTIONS.map(m => (
                          <button key={m.value} onClick={() => setModel(m.value)}
                            className={`p-2.5 rounded-xl border text-left transition-colors ${
                              model === m.value ? 'bg-purple-600/30 border-purple-500/60' : 'bg-white/5 border-white/10 hover:border-purple-500/30'
                            }`}>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-white">{m.label}</span>
                              {m.badge && <span className="text-[9px] px-1.5 py-0.5 bg-purple-600/40 text-purple-300 rounded-full font-bold">{m.badge}</span>}
                            </div>
                            <div className="text-[10px] text-gray-500 mt-0.5">{m.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {!instrumental && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Vocal Gender</label>
                        <div className="flex gap-2">
                          {(['', 'm', 'f'] as const).map((val) => (
                            <button key={val} onClick={() => setVocalGender(val)}
                              className={`flex-1 py-1.5 rounded-lg border text-sm transition-colors ${
                                vocalGender === val ? 'bg-purple-600 border-purple-500' : 'bg-purple-900/20 border-purple-500/30 hover:border-purple-500/50'
                              }`}>
                              {val === '' ? 'Auto' : val === 'm' ? 'Male' : 'Female'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Style Weight: {styleWeight.toFixed(2)}</label>
                      <input type="range" min="0" max="1" step="0.01" value={styleWeight}
                        onChange={e => setStyleWeight(parseFloat(e.target.value))} className="w-full accent-purple-500" />
                      <p className="text-xs text-gray-500 mt-0.5">0 = loose interpretation · 1 = strict style match</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">Creativity: {weirdness.toFixed(2)}</label>
                      <input type="range" min="0" max="1" step="0.01" value={weirdness}
                        onChange={e => setWeirdness(parseFloat(e.target.value))} className="w-full accent-purple-500" />
                      <p className="text-xs text-gray-500 mt-0.5">0 = traditional · 1 = experimental</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Cover art toggle */}
              <label className="flex items-center gap-2 cursor-pointer mb-5">
                <input type="checkbox" checked={generateCover} onChange={e => setGenerateCover(e.target.checked)}
                  className="w-4 h-4 rounded border-purple-500/50 accent-purple-500" />
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">Generate AI Cover Art</span>
              </label>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
                  <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold transition-all flex items-center justify-center gap-2 text-base shadow-lg shadow-purple-500/20"
              >
                {isGenerating
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating Full Song...</>
                  : <><Sparkles className="w-5 h-5" /> Generate Full Song</>}
              </button>

              <p className="text-center text-xs text-gray-600 mt-3">
                Generates 2 song variants · Ready in ~2-3 min · Up to 8 minutes long
              </p>
            </div>
          </div>

          {/* ── RIGHT: Tracks ─────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                Your Tracks
                {tracks.length > 0 && <span className="text-sm text-gray-400 font-normal ml-2">({tracks.length})</span>}
              </h2>
            </div>

            {tracks.length === 0 ? (
              <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-12 text-center">
                <Music className="w-16 h-16 text-purple-400/30 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">No tracks yet.</p>
                <p className="text-gray-600 text-xs mt-1">Fill in the form and hit Generate Full Song!</p>
              </div>
            ) : (
              tracks.map(track => (
                <TrackCard
                  key={track.id}
                  track={track}
                  isPlaying={playingTrackId === track.id}
                  isExtending={extendingId === track.id}
                  showExtendPanel={showExtendModal === track.id}
                  extendPrompt={extendPrompt}
                  isGeneratingCover={isGeneratingCover}
                  onPlay={() => togglePlay(track.id)}
                  onExtendToggle={() => setShowExtendModal(showExtendModal === track.id ? null : track.id)}
                  onExtendPromptChange={setExtendPrompt}
                  onExtend={() => handleExtend(track)}
                  onExtendCancel={() => { setShowExtendModal(null); setExtendPrompt(''); }}
                  onStemSplit={() => { setStemModal({ trackId: track.id, trackTitle: track.title, audioUrl: track.audioUrl }); setStemResult(null); }}
                  onRegenerateCover={() => regenerateCover(track)}
                  audioRef={(el: HTMLAudioElement | null) => { audioRefs.current[track.id] = el; }}
                  onAudioEnded={() => setPlayingTrackId(null)}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Stem Separation Modal ─────────────────────────────────────────────── */}
      {stemModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) { setStemModal(null); setStemResult(null); setIsSeparating(false); if (stemPollRef.current) clearInterval(stemPollRef.current); } }}>
          <div className="bg-[#0D0D14] border border-cyan-500/30 rounded-2xl p-6 w-full max-w-lg shadow-2xl">

            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-cyan-400" /> Split Stems
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">{stemModal.trackTitle}</p>
              </div>
              <button onClick={() => { setStemModal(null); setStemResult(null); setIsSeparating(false); if (stemPollRef.current) clearInterval(stemPollRef.current); }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!stemResult && (
              <>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Stem Model</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['2stems', '2 Stems',  'Vocals + Accompaniment',              'Fastest'],
                      ['4stems', '4 Stems',  'Vocals · Drums · Bass · Instruments', 'Recommended'],
                      ['6stems', '6 Stems',  '+ Piano + Guitar isolation',          'Slowest'],
                    ] as const).map(([val, label, desc, badge]) => (
                      <button key={val} onClick={() => setStemModel(val)}
                        className={`p-3 rounded-xl border text-left transition-colors ${stemModel === val ? 'bg-cyan-600/20 border-cyan-500/50' : 'bg-white/5 border-white/10 hover:border-cyan-500/30'}`}>
                        <div className="text-sm font-semibold">{label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{desc}</div>
                        <div className={`text-[10px] mt-1 font-medium ${stemModel === val ? 'text-cyan-400' : 'text-gray-500'}`}>{badge}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={startStemSeparation} disabled={isSeparating}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold transition-all flex items-center justify-center gap-2">
                  {isSeparating
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Separating…</>
                    : <><Scissors className="w-5 h-5" /> Split into {stemModel.replace('stems', '')} Stems</>}
                </button>
              </>
            )}

            {stemResult?.status === 'processing' && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-300">Separating with <strong>{stemResult.provider}</strong>…</p>
                <p className="text-xs text-gray-500 mt-2">30 seconds – 3 minutes depending on song length</p>
              </div>
            )}

            {stemResult?.status === 'failed' && (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-sm text-red-300">Stem separation failed</p>
                <p className="text-xs text-gray-500 mt-2">Ensure FAL_KEY is set in Vercel env vars</p>
                <button onClick={() => setStemResult(null)} className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                  Try Again
                </button>
              </div>
            )}

            {stemResult?.status === 'completed' && stemResult.stems && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">Stems ready — download below</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(stemResult.stems).map(([key, url]) => {
                    const info = STEM_LABELS[key] ?? { label: key, emoji: '🎵', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' };
                    return (
                      <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border ${info.color}`}>
                        <span className="text-xl">{info.emoji}</span>
                        <div className="flex-1"><p className="text-sm font-medium">{info.label}</p><p className="text-xs text-gray-500">Isolated stem</p></div>
                        <a href={url} download={`${stemModal.trackTitle}-${key}.mp3`} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 hover:bg-black/50 border border-white/10 rounded-lg text-xs font-medium transition-colors">
                          <Download className="w-3 h-3" /> Download
                        </a>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                  <button onClick={() => setStemResult(null)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">Split Again</button>
                  <button onClick={() => { setStemModal(null); setStemResult(null); }} className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors">Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Track Card ─────────────────────────────────────────────────────────────────

interface TrackCardProps {
  track:                GeneratedTrack;
  isPlaying:            boolean;
  isExtending:          boolean;
  showExtendPanel:      boolean;
  extendPrompt:         string;
  isGeneratingCover:    boolean;
  onPlay:               () => void;
  onExtendToggle:       () => void;
  onExtendPromptChange: (v: string) => void;
  onExtend:             () => void;
  onExtendCancel:       () => void;
  onStemSplit:          () => void;
  onRegenerateCover:    () => void;
  audioRef:             (el: HTMLAudioElement | null) => void;
  onAudioEnded:         () => void;
}

function TrackCard({
  track, isPlaying, isExtending, showExtendPanel, extendPrompt, isGeneratingCover,
  onPlay, onExtendToggle, onExtendPromptChange, onExtend, onExtendCancel, onStemSplit, onRegenerateCover, audioRef, onAudioEnded,
}: TrackCardProps) {
  return (
    <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/50 transition-colors">

      {/* Extension badge */}
      {track.isExtension && (
        <div className="mb-2 flex items-center gap-1.5">
          <Plus className="w-3 h-3 text-emerald-400" />
          <span className="text-xs text-emerald-400">Extended from: {track.parentTitle}</span>
        </div>
      )}

      {/* Cover art */}
      {(track.customCoverUrl || track.imageUrl) && (
        <div className="mb-4 relative group">
          <img src={track.customCoverUrl || track.imageUrl} alt={track.title} className="w-full h-48 object-cover rounded-lg" />
          {track.status === 'complete' && (
            <button onClick={onRegenerateCover} disabled={isGeneratingCover}
              className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              title="Regenerate cover art">
              {isGeneratingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
          )}
        </div>
      )}

      {/* Player row */}
      <div className="flex items-center gap-3">
        <button onClick={onPlay} disabled={track.status !== 'complete'}
          className="w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0">
          {track.status === 'generating'
            ? <Loader2 className="w-5 h-5 animate-spin" />
            : isPlaying
            ? <Pause className="w-5 h-5" />
            : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{track.title}</p>
          <p className="text-xs text-gray-400">
            {track.status === 'generating' && '⏳ Generating full song… (~2-3 min)'}
            {track.status === 'complete'   && `✅ Ready${track.duration ? ` · ${fmtDur(track.duration)}` : ' · Full song'}`}
            {track.status === 'error'      && '❌ Failed — please try again'}
          </p>
          {track.model && track.status === 'complete' && (
            <p className="text-[10px] text-purple-400/60 mt-0.5">{track.model}</p>
          )}
        </div>

        {track.status === 'complete' && track.audioUrl && (
          <div className="flex items-center gap-1.5 shrink-0">
            <a href={track.audioUrl} download title="Download MP3"
              className="p-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 transition-colors">
              <Download className="w-4 h-4" />
            </a>
            <button onClick={onStemSplit} title="Split into stems"
              className="p-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 transition-colors">
              <Scissors className="w-4 h-4 text-cyan-400" />
            </button>
            {track.clipId && (
              <button onClick={onExtendToggle} disabled={isExtending} title="Add more to this song"
                className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 transition-colors disabled:opacity-50">
                {isExtending
                  ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  : <ArrowUpCircle className="w-4 h-4 text-emerald-400" />}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Extend panel */}
      {showExtendPanel && track.clipId && (
        <div className="mt-4 p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-xl space-y-3">
          <p className="text-sm font-medium text-emerald-400 flex items-center gap-2">
            <ArrowUpCircle className="w-4 h-4" /> Add More to This Song
          </p>
          <p className="text-xs text-gray-400">
            Continues the song after where it currently ends. Suno will match the existing style automatically.
          </p>
          <input
            type="text" value={extendPrompt} onChange={e => onExtendPromptChange(e.target.value)}
            placeholder="Optional: direction hint (e.g. 'add a dramatic bridge and slow outro')"
            className="w-full px-3 py-2 bg-black/40 border border-emerald-500/30 rounded-lg text-sm focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500"
          />
          <div className="flex gap-2">
            <button onClick={onExtend} disabled={isExtending}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
              {isExtending ? <><Loader2 className="w-4 h-4 animate-spin" /> Extending…</> : <><ArrowUpCircle className="w-4 h-4" /> Extend Song</>}
            </button>
            <button onClick={onExtendCancel} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Audio player */}
      {track.status === 'complete' && track.audioUrl && (
        <audio ref={audioRef} src={track.audioUrl} onEnded={onAudioEnded} className="w-full mt-4" controls />
      )}
    </div>
  );
}
