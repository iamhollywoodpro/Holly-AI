"use client";

import { useState, useRef, useCallback } from 'react';
import {
  Music, Play, Pause, Download, Loader2, Sparkles, Mic, FileText,
  Wand2, Image as ImageIcon, RefreshCw, Scissors, ArrowUpCircle,
  ChevronDown, ChevronUp, X, CheckCircle, AlertCircle, ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeneratedTrack {
  id: string;           // taskId (while generating) or clipId (when done)
  clipId?: string;      // Suno clip ID — needed for extend
  title: string;
  audioUrl: string;
  imageUrl?: string;
  customCoverUrl?: string;
  duration?: number;
  status: 'generating' | 'complete' | 'error';
  isExtension?: boolean;
  parentTitle?: string;
}

interface StemResult {
  jobId:    string;
  provider: string;
  status:   'processing' | 'completed' | 'failed';
  stems?:   Record<string, string>;
  pollUrl?: string;
}

interface StemModal {
  trackId:  string;
  trackTitle: string;
  audioUrl: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(sec?: number) {
  if (!sec) return '';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const STEM_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  vocals: { label: 'Vocals',      emoji: '🎤', color: 'text-pink-400 bg-pink-400/10 border-pink-400/20' },
  drums:  { label: 'Drums',       emoji: '🥁', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  bass:   { label: 'Bass',        emoji: '🎸', color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  other:  { label: 'Instruments', emoji: '🎹', color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  piano:  { label: 'Piano',       emoji: '🎹', color: 'text-violet-400 bg-violet-400/10 border-violet-400/20' },
  guitar: { label: 'Guitar',      emoji: '🎸', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function MusicStudio() {
  // Generation state
  const [prompt, setPrompt]                     = useState('');
  const [lyrics, setLyrics]                     = useState('');
  const [title, setTitle]                       = useState('');
  const [style, setStyle]                       = useState('');
  const [instrumental, setInstrumental]         = useState(false);
  const [customMode, setCustomMode]             = useState(true);
  const [useLyrics, setUseLyrics]               = useState(false);
  const [isGenerating, setIsGenerating]         = useState(false);
  const [tracks, setTracks]                     = useState<GeneratedTrack[]>([]);
  const [playingTrackId, setPlayingTrackId]     = useState<string | null>(null);
  const [error, setError]                       = useState<string | null>(null);
  const [generateCover, setGenerateCover]       = useState(true);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [vocalGender, setVocalGender]           = useState<'m' | 'f' | ''>('');
  const [styleWeight, setStyleWeight]           = useState(0.65);
  const [weirdness, setWeirdness]               = useState(0.65);
  const [showAdvanced, setShowAdvanced]         = useState(false);

  // Extend state
  const [extendingId, setExtendingId]           = useState<string | null>(null);
  const [extendPrompt, setExtendPrompt]         = useState('');
  const [showExtendModal, setShowExtendModal]   = useState<string | null>(null);

  // Stem state
  const [stemModal, setStemModal]               = useState<StemModal | null>(null);
  const [stemResult, setStemResult]             = useState<StemResult | null>(null);
  const [isSeparating, setIsSeparating]         = useState(false);
  const [stemModel, setStemModel]               = useState<'4stems' | '2stems' | '6stems'>('4stems');
  const stemPollRef                             = useRef<NodeJS.Timeout | null>(null);

  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  // ── Generate ──────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (customMode && useLyrics && !lyrics.trim()) {
      setError('Please enter lyrics for your song'); return;
    }
    if (!prompt.trim() && !(customMode && useLyrics)) {
      setError('Please enter a description for your music'); return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const res = await fetch('/api/music/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: useLyrics ? lyrics : prompt,
          title:  title || undefined,
          style:  style || undefined,
          instrumental,
          customMode: useLyrics || instrumental,
          vocalGender: vocalGender || undefined,
          styleWeight:          showAdvanced ? styleWeight : undefined,
          weirdnessConstraint:  showAdvanced ? weirdness   : undefined,
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error ?? 'Failed to generate music');

      const taskId   = result.data.taskId;
      const newTrack: GeneratedTrack = {
        id: taskId, title: title || 'Untitled Track', audioUrl: '', status: 'generating',
      };

      setTracks(prev => [newTrack, ...prev]);
      if (generateCover) generateCustomCover(taskId);
      pollTrackStatus(taskId);

    } catch (err: any) {
      setError(err.message ?? 'Failed to generate music');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Extend ────────────────────────────────────────────────────────────────

  const handleExtend = async (track: GeneratedTrack) => {
    if (!track.clipId) {
      setError('Clip ID not available — regenerate the track first'); return;
    }

    setExtendingId(track.id);
    setShowExtendModal(null);

    try {
      const res = await fetch('/api/music/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipId:  track.clipId,
          prompt:  extendPrompt || undefined,
          style:   style || undefined,
          title:   track.title ? `${track.title} (Full)` : undefined,
        }),
      });

      const result = await res.json();
      if (!result.success) throw new Error(result.error ?? 'Failed to extend track');

      const taskId = result.data.taskId;
      const extTrack: GeneratedTrack = {
        id:          taskId,
        title:       track.title ? `${track.title} (Full)` : 'Extended Track',
        audioUrl:    '',
        status:      'generating',
        isExtension: true,
        parentTitle: track.title,
      };

      setTracks(prev => [extTrack, ...prev]);
      setExtendPrompt('');
      pollTrackStatus(taskId);

    } catch (err: any) {
      setError(err.message ?? 'Failed to extend track');
    } finally {
      setExtendingId(null);
    }
  };

  // ── Stem Separation ───────────────────────────────────────────────────────

  const startStemSeparation = async () => {
    if (!stemModal) return;
    setIsSeparating(true);
    setStemResult(null);

    // Clear any existing poll
    if (stemPollRef.current) clearInterval(stemPollRef.current);

    try {
      const res = await fetch('/api/audio/stem-separate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioUrl: stemModal.audioUrl,
          fileName: stemModal.trackTitle,
          model:    stemModel,
          quality:  'fast',
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Stem separation failed');

      setStemResult({
        jobId:    data.jobId,
        provider: data.provider,
        status:   data.status,
        stems:    data.stems,
        pollUrl:  data.pollUrl,
      });

      // If async, start polling
      if (data.status === 'processing') {
        pollStemStatus(data.jobId, data.provider);
      } else {
        setIsSeparating(false);
      }

    } catch (err: any) {
      setStemResult({ jobId: '', provider: '', status: 'failed' });
      setIsSeparating(false);
    }
  };

  const pollStemStatus = useCallback((jobId: string, provider: string) => {
    let attempts = 0;
    const MAX = 40; // 40 × 5s = 200s max

    stemPollRef.current = setInterval(async () => {
      attempts++;
      try {
        const res  = await fetch(`/api/audio/stem-status?jobId=${jobId}&provider=${provider}`);
        const data = await res.json();

        if (data.status === 'completed') {
          clearInterval(stemPollRef.current!);
          setStemResult(prev => prev ? { ...prev, status: 'completed', stems: data.stems } : null);
          setIsSeparating(false);
        } else if (data.status === 'failed' || attempts >= MAX) {
          clearInterval(stemPollRef.current!);
          setStemResult(prev => prev ? { ...prev, status: 'failed' } : null);
          setIsSeparating(false);
        }
      } catch {
        if (attempts >= MAX) {
          clearInterval(stemPollRef.current!);
          setIsSeparating(false);
        }
      }
    }, 5000);
  }, []);

  // ── Cover Art ─────────────────────────────────────────────────────────────

  const generateCustomCover = async (taskId: string) => {
    try {
      setIsGeneratingCover(true);
      const res = await fetch('/api/music/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, style, lyrics: useLyrics ? lyrics : prompt }),
      });
      const result = await res.json();
      if (result.success && result.data?.imageUrl) {
        setTracks(prev =>
          prev.map(t => t.id === taskId ? { ...t, customCoverUrl: result.data.imageUrl } : t)
        );
      }
    } catch {} finally {
      setIsGeneratingCover(false);
    }
  };

  const regenerateCover = async (track: GeneratedTrack) => {
    try {
      setIsGeneratingCover(true);
      const res = await fetch('/api/music/generate-cover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: track.title, style, lyrics: useLyrics ? lyrics : prompt }),
      });
      const result = await res.json();
      if (result.success && result.data?.imageUrl) {
        setTracks(prev =>
          prev.map(t => t.id === track.id ? { ...t, customCoverUrl: result.data.imageUrl } : t)
        );
      }
    } catch {} finally {
      setIsGeneratingCover(false);
    }
  };

  // ── Status Polling ────────────────────────────────────────────────────────

  const pollTrackStatus = (taskId: string) => {
    let attempts = 0;
    const MAX = 60;

    const poll = async () => {
      try {
        const res    = await fetch(`/api/music/status?taskId=${taskId}`);
        const result = await res.json();

        if (result.success && result.data?.status === 'SUCCESS' && result.data.response?.sunoData) {
          const track = result.data.response.sunoData[0];
          setTracks(prev =>
            prev.map(t =>
              t.id === taskId
                ? {
                    ...t,
                    clipId:   track.clipId ?? track.id ?? taskId,
                    audioUrl: track.audioUrl ?? track.streamAudioUrl,
                    imageUrl: track.imageUrl,
                    duration: track.duration,
                    status:   'complete',
                  }
                : t
            )
          );
          return;
        }

        if (attempts < MAX) { attempts++; setTimeout(poll, 5000); }
        else {
          setTracks(prev => prev.map(t => t.id === taskId ? { ...t, status: 'error' } : t));
        }
      } catch {
        if (attempts < MAX) { attempts++; setTimeout(poll, 5000); }
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

  const formatLyrics = () =>
    setLyrics(lyrics.split('\n').map(l => l.trim()).join('\n'));

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
              Powered by Suno V4.5
            </span>
          </div>
          <Link
            href="/chat"
            className="px-4 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 transition-colors text-sm"
          >
            ← Back to Chat
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── LEFT: Creation Panel ───────────────────────────────────────── */}
          <div className="space-y-6">
            <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Create Your Music
              </h2>

              {/* Mode toggles */}
              <div className="flex flex-wrap gap-4 mb-5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={customMode}
                    onChange={e => setCustomMode(e.target.checked)}
                    className="w-4 h-4 rounded border-purple-500/50 bg-purple-900/20 accent-purple-500"
                  />
                  <span className="text-sm text-gray-300">Custom Mode</span>
                </label>
                {customMode && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={useLyrics}
                      onChange={e => setUseLyrics(e.target.checked)}
                      className="w-4 h-4 rounded border-purple-500/50 bg-purple-900/20 accent-purple-500"
                    />
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-300">Custom Lyrics</span>
                  </label>
                )}
              </div>

              {/* Lyrics or prompt */}
              {customMode && useLyrics && !instrumental ? (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-300">Custom Lyrics *</label>
                    <div className="flex gap-3">
                      <button
                        onClick={async () => {
                          if (!title && !prompt) { setError('Enter a title or description first'); return; }
                          setIsGeneratingLyrics(true);
                          try {
                            const r = await fetch('/api/music/generate-lyrics', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
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
                        AI Write
                      </button>
                      <button onClick={formatLyrics} className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                        <Wand2 className="w-3 h-3" /> Format
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={lyrics} onChange={e => setLyrics(e.target.value)}
                    placeholder={"Write your song lyrics here...\n\n[Verse 1]\nYour lyrics here...\n\n[Chorus]\nYour chorus here..."}
                    className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 resize-none font-mono text-sm"
                    rows={12} maxLength={5000}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{lyrics.length}/5000</span>
                    <span>{lyrics.split('\n').length} lines</span>
                  </div>
                  <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-xs text-blue-300">💡 Use [Verse], [Chorus], [Bridge] tags to structure your song.</p>
                  </div>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {customMode ? 'Description' : 'Description *'}
                  </label>
                  <textarea
                    value={prompt} onChange={e => setPrompt(e.target.value)}
                    placeholder={customMode ? "Describe the music style and mood..." : "Describe the music you want to create..."}
                    className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 resize-none"
                    rows={4} maxLength={customMode ? 5000 : 500}
                  />
                  <p className="text-xs text-gray-500 mt-1">{prompt.length}/{customMode ? 5000 : 500}</p>
                </div>
              )}

              {/* Custom mode fields */}
              {customMode && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Title</label>
                    <input
                      type="text" value={title} onChange={e => setTitle(e.target.value)}
                      placeholder="Give your track a title"
                      className="w-full px-4 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
                      maxLength={80}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Style / Genre</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {['Lo-Fi Chill', 'Epic Cinematic', 'Acoustic Folk', 'Electronic Dance', 'Jazz Smooth', 'R&B Soul', 'Hip-Hop', 'Rock Alternative'].map(p => (
                        <button key={p} onClick={() => setStyle(p)}
                          className={`px-3 py-1 text-xs border rounded-full transition-colors ${
                            style === p ? 'bg-purple-600 border-purple-500' : 'bg-purple-600/10 hover:bg-purple-600/30 border-purple-500/30'
                          }`}
                        >{p}</button>
                      ))}
                    </div>
                    <input
                      type="text" value={style} onChange={e => setStyle(e.target.value)}
                      placeholder="e.g., Pop, Rock, Classical, Jazz"
                      className="w-full px-4 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
                      maxLength={1000}
                    />
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer mb-4">
                    <input type="checkbox" checked={instrumental}
                      onChange={e => { setInstrumental(e.target.checked); if (e.target.checked) setUseLyrics(false); }}
                      className="w-4 h-4 rounded border-purple-500/50 accent-purple-500"
                    />
                    <Mic className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">Instrumental (no vocals)</span>
                  </label>

                  {/* Advanced */}
                  <button onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1 mb-4">
                    <Wand2 className="w-4 h-4" />
                    {showAdvanced ? 'Hide' : 'Show'} Advanced Controls
                    {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>

                  {showAdvanced && (
                    <div className="space-y-4 mb-4 p-4 bg-purple-900/10 border border-purple-500/20 rounded-lg">
                      {!instrumental && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Vocal Gender</label>
                          <div className="flex gap-2">
                            {([['', 'Auto'], ['m', 'Male'], ['f', 'Female']] as const).map(([val, label]) => (
                              <button key={val} onClick={() => setVocalGender(val as any)}
                                className={`flex-1 py-1.5 rounded-lg border text-sm transition-colors ${
                                  vocalGender === val ? 'bg-purple-600 border-purple-500' : 'bg-purple-900/20 border-purple-500/30 hover:border-purple-500/50'
                                }`}
                              >{label}</button>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Style Weight: {styleWeight.toFixed(2)}</label>
                        <input type="range" min="0" max="1" step="0.01" value={styleWeight}
                          onChange={e => setStyleWeight(parseFloat(e.target.value))} className="w-full accent-purple-500" />
                        <p className="text-xs text-gray-500 mt-1">How strictly to follow the style (0=loose, 1=strict)</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Creativity: {weirdness.toFixed(2)}</label>
                        <input type="range" min="0" max="1" step="0.01" value={weirdness}
                          onChange={e => setWeirdness(parseFloat(e.target.value))} className="w-full accent-purple-500" />
                        <p className="text-xs text-gray-500 mt-1">Creative deviation (0=traditional, 1=experimental)</p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Cover art toggle */}
              <label className="flex items-center gap-2 cursor-pointer mb-5">
                <input type="checkbox" checked={generateCover} onChange={e => setGenerateCover(e.target.checked)}
                  className="w-4 h-4 rounded border-purple-500/50 accent-purple-500" />
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">Generate AI Cover Art</span>
              </label>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />{error}
                  <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={isGenerating || (useLyrics ? !lyrics.trim() : !prompt.trim())}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                {isGenerating
                  ? <><Loader2 className="w-5 h-5 animate-spin" /> Generating...</>
                  : <><Sparkles className="w-5 h-5" /> Generate Music</>}
              </button>
            </div>
          </div>

          {/* ── RIGHT: Generated Tracks ────────────────────────────────────── */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">
              Your Tracks{tracks.length > 0 && <span className="text-sm text-gray-400 font-normal ml-2">({tracks.length})</span>}
            </h2>

            {tracks.length === 0 ? (
              <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-12 text-center">
                <Music className="w-16 h-16 text-purple-400/30 mx-auto mb-4" />
                <p className="text-gray-500">No tracks yet. Create your first one!</p>
              </div>
            ) : (
              tracks.map(track => (
                <div key={track.id}
                  className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/50 transition-colors"
                >
                  {/* Extension badge */}
                  {track.isExtension && (
                    <div className="mb-2 flex items-center gap-1.5">
                      <ArrowUpCircle className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs text-emerald-400">Extended from: {track.parentTitle}</span>
                    </div>
                  )}

                  {/* Cover art */}
                  {(track.customCoverUrl || track.imageUrl) && (
                    <div className="mb-4 relative group">
                      <img src={track.customCoverUrl || track.imageUrl} alt={track.title}
                        className="w-full h-48 object-cover rounded-lg" />
                      {track.status === 'complete' && (
                        <button onClick={() => regenerateCover(track)} disabled={isGeneratingCover}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                          title="Regenerate cover art">
                          {isGeneratingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Player row */}
                  <div className="flex items-center gap-3">
                    <button onClick={() => togglePlay(track.id)} disabled={track.status !== 'complete'}
                      className="w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0">
                      {track.status === 'generating'
                        ? <Loader2 className="w-5 h-5 animate-spin" />
                        : playingTrackId === track.id
                        ? <Pause className="w-5 h-5" />
                        : <Play className="w-5 h-5 ml-0.5" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{track.title}</p>
                      <p className="text-xs text-gray-400">
                        {track.status === 'generating' && '⏳ Generating... (1-2 min)'}
                        {track.status === 'complete' && `✅ Ready${track.duration ? ` · ${formatDuration(track.duration)}` : ''}`}
                        {track.status === 'error' && '❌ Generation failed — try again'}
                      </p>
                    </div>

                    {/* Action buttons — only when complete */}
                    {track.status === 'complete' && track.audioUrl && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Download */}
                        <a href={track.audioUrl} download title="Download MP3"
                          className="p-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 transition-colors">
                          <Download className="w-4 h-4" />
                        </a>

                        {/* Stem Separate */}
                        <button
                          onClick={() => { setStemModal({ trackId: track.id, trackTitle: track.title, audioUrl: track.audioUrl }); setStemResult(null); }}
                          title="Split into stems (vocals, drums, bass, instruments)"
                          className="p-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/40 border border-cyan-500/30 transition-colors">
                          <Scissors className="w-4 h-4 text-cyan-400" />
                        </button>

                        {/* Extend to full song */}
                        {track.clipId && (
                          <button
                            onClick={() => setShowExtendModal(showExtendModal === track.id ? null : track.id)}
                            disabled={extendingId === track.id}
                            title="Extend to full song (~3 min)"
                            className="p-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 border border-emerald-500/30 transition-colors disabled:opacity-50">
                            {extendingId === track.id
                              ? <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                              : <ArrowUpCircle className="w-4 h-4 text-emerald-400" />}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Extend panel */}
                  {showExtendModal === track.id && track.clipId && (
                    <div className="mt-4 p-4 bg-emerald-900/10 border border-emerald-500/20 rounded-lg space-y-3">
                      <p className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                        <ArrowUpCircle className="w-4 h-4" />
                        Extend to Full Song
                      </p>
                      <p className="text-xs text-gray-400">
                        Adds ~2-3 more minutes to this track. Suno will continue the musical style automatically.
                      </p>
                      <input
                        type="text" value={extendPrompt} onChange={e => setExtendPrompt(e.target.value)}
                        placeholder="Optional: continue prompt (e.g. 'add a bridge and outro')"
                        className="w-full px-3 py-2 bg-black/40 border border-emerald-500/30 rounded-lg text-sm focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500"
                      />
                      <div className="flex gap-2">
                        <button onClick={() => handleExtend(track)}
                          disabled={!!extendingId}
                          className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2">
                          {extendingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpCircle className="w-4 h-4" />}
                          {extendingId ? 'Extending...' : 'Extend Now'}
                        </button>
                        <button onClick={() => { setShowExtendModal(null); setExtendPrompt(''); }}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Audio player */}
                  {track.status === 'complete' && track.audioUrl && (
                    <audio
                      ref={el => { audioRefs.current[track.id] = el; }}
                      src={track.audioUrl}
                      onEnded={() => setPlayingTrackId(null)}
                      className="w-full mt-4"
                      controls
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Stem Separation Modal ──────────────────────────────────────────── */}
      {stemModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) { setStemModal(null); setStemResult(null); setIsSeparating(false); if (stemPollRef.current) clearInterval(stemPollRef.current); } }}>
          <div className="bg-[#0D0D14] border border-cyan-500/30 rounded-2xl p-6 w-full max-w-lg shadow-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-cyan-400" />
                  Split Stems
                </h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[280px]">{stemModal.trackTitle}</p>
              </div>
              <button onClick={() => { setStemModal(null); setStemResult(null); setIsSeparating(false); if (stemPollRef.current) clearInterval(stemPollRef.current); }}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Model selector */}
            {!stemResult && (
              <>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Stem Model</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ['2stems', '2 Stems', 'Vocals + Accompaniment', 'Fastest'],
                      ['4stems', '4 Stems', 'Vocals · Drums · Bass · Instruments', 'Recommended'],
                      ['6stems', '6 Stems', '+ Piano + Guitar separation', 'Slowest'],
                    ] as const).map(([val, label, desc, badge]) => (
                      <button key={val} onClick={() => setStemModel(val)}
                        className={`p-3 rounded-xl border text-left transition-colors ${
                          stemModel === val ? 'bg-cyan-600/20 border-cyan-500/50' : 'bg-white/5 border-white/10 hover:border-cyan-500/30'
                        }`}>
                        <div className="text-sm font-semibold">{label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{desc}</div>
                        <div className={`text-[10px] mt-1 font-medium ${stemModel === val ? 'text-cyan-400' : 'text-gray-500'}`}>{badge}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg mb-5">
                  <p className="text-xs text-cyan-300">
                    🎵 Uses <strong>Demucs AI</strong> (same tech used by professional studios) to cleanly isolate each stem.
                    {stemModel === '4stems' && ' Vocals, drums, bass, and all other instruments separated.'}
                    {stemModel === '2stems' && ' Quickest — just vocals vs. everything else.'}
                    {stemModel === '6stems' && ' Maximum detail — also isolates piano and guitar individually.'}
                  </p>
                </div>

                <button onClick={startStemSeparation} disabled={isSeparating}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-xl font-semibold transition-all flex items-center justify-center gap-2">
                  {isSeparating
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Separating stems...</>
                    : <><Scissors className="w-5 h-5" /> Split into {stemModel.replace('stems', '')} Stems</>}
                </button>
              </>
            )}

            {/* Processing state */}
            {stemResult?.status === 'processing' && (
              <div className="text-center py-8">
                <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-300">Separating stems with <strong>{stemResult.provider}</strong>...</p>
                <p className="text-xs text-gray-500 mt-2">This takes 30 seconds–2 minutes depending on track length</p>
                <div className="mt-4 flex gap-2 justify-center">
                  {Object.keys(STEM_LABELS).slice(0, stemModel === '2stems' ? 2 : stemModel === '4stems' ? 4 : 6).map(k => (
                    <div key={k} className="flex flex-col items-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-gray-700 animate-pulse flex items-center justify-center text-sm">
                        {STEM_LABELS[k]?.emoji}
                      </div>
                      <span className="text-[10px] text-gray-500">{STEM_LABELS[k]?.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed state */}
            {stemResult?.status === 'failed' && (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                <p className="text-sm text-red-300">Stem separation failed</p>
                <p className="text-xs text-gray-500 mt-2">Make sure FAL_KEY is set in Vercel env vars</p>
                <button onClick={() => setStemResult(null)} className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                  Try Again
                </button>
              </div>
            )}

            {/* Completed — show stems */}
            {stemResult?.status === 'completed' && stemResult.stems && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-medium text-emerald-400">Stems ready — download each track below</span>
                </div>
                <div className="space-y-3">
                  {Object.entries(stemResult.stems).map(([key, url]) => {
                    const info = STEM_LABELS[key] ?? { label: key, emoji: '🎵', color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' };
                    return (
                      <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border ${info.color}`}>
                        <span className="text-xl">{info.emoji}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{info.label}</p>
                          <p className="text-xs text-gray-500">Isolated stem · MP3</p>
                        </div>
                        <a href={url} download={`${stemModal.trackTitle}-${key}.mp3`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 hover:bg-black/50 border border-white/10 rounded-lg text-xs font-medium transition-colors">
                          <Download className="w-3 h-3" /> Download
                        </a>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                  <button onClick={() => setStemResult(null)} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors">
                    Split Again
                  </button>
                  <button onClick={() => { setStemModal(null); setStemResult(null); }}
                    className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
