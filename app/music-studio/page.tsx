"use client";

import { useState } from 'react';
import { Music, Play, Pause, Download, Loader2, Sparkles, Mic } from 'lucide-react';
import Link from 'next/link';

interface GeneratedTrack {
  id: string;
  title: string;
  audioUrl: string;
  imageUrl?: string;
  duration?: number;
  status: 'generating' | 'complete' | 'error';
}

export default function MusicStudio() {
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [customMode, setCustomMode] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tracks, setTracks] = useState<GeneratedTrack[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a description for your music');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/music/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          title: title || undefined,
          style: style || undefined,
          instrumental,
          customMode,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate music');
      }

      console.log('Generation started:', result.data);

      // Add generating track to list
      const taskId = result.data.taskId;
      const newTrack: GeneratedTrack = {
        id: taskId,
        title: title || 'Untitled Track',
        audioUrl: '',
        status: 'generating',
      };

      setTracks(prev => [newTrack, ...prev]);

      // Poll for completion
      pollTrackStatus(taskId);

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate music');
    } finally {
      setIsGenerating(false);
    }
  };

  const pollTrackStatus = async (taskId: string) => {
    const maxAttempts = 60; // 5 minutes max
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/music/status?taskId=${taskId}`);
        const result = await response.json();

        console.log('[Poll] Status check:', result);

        if (result.success && result.data) {
          const data = result.data;
          
          // Check if generation is complete (SUCCESS status from SUNO)
          if (data.status === 'SUCCESS' && data.response?.sunoData) {
            // Get the first track from sunoData
            const track = data.response.sunoData[0];
            
            setTracks(prev =>
              prev.map(t =>
                t.id === taskId
                  ? {
                      ...t,
                      audioUrl: track.audioUrl || track.streamAudioUrl,
                      imageUrl: track.imageUrl,
                      duration: track.duration,
                      status: 'complete',
                    }
                  : t
              )
            );
            console.log('[Poll] Generation complete!');
            return; // Stop polling
          }

          // Continue polling if not complete
          if (attempts < maxAttempts) {
            attempts++;
            setTimeout(poll, 5000); // Poll every 5 seconds
          } else {
            // Timeout
            setTracks(prev =>
              prev.map(track =>
                track.id === taskId ? { ...track, status: 'error' } : track
              )
            );
            console.log('[Poll] Timeout after', maxAttempts, 'attempts');
          }
        }
      } catch (err) {
        console.error('[Poll] Error:', err);
      }
    };

    poll();
  };

  const togglePlay = (trackId: string) => {
    if (playingTrackId === trackId) {
      setPlayingTrackId(null);
      // Pause audio
    } else {
      setPlayingTrackId(trackId);
      // Play audio
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-blue-900 text-white">
      {/* Header */}
      <div className="border-b border-purple-500/30 bg-black/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music className="w-8 h-8 text-purple-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Music Studio
            </h1>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 transition-colors"
          >
            Back to Chat
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Creation Panel */}
          <div className="space-y-6">
            <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Create Your Music
              </h2>

              {/* Mode Toggle */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={customMode}
                    onChange={(e) => setCustomMode(e.target.checked)}
                    className="w-4 h-4 rounded border-purple-500/50 bg-purple-900/20 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-300">Custom Mode (more control)</span>
                </label>
              </div>

              {/* Prompt */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description *
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the music you want to create..."
                  className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 resize-none"
                  rows={4}
                  maxLength={customMode ? 3000 : 400}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {prompt.length} / {customMode ? 3000 : 400} characters
                </div>
              </div>

              {/* Custom Mode Fields */}
              {customMode && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Give your track a title"
                      className="w-full px-4 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
                      maxLength={80}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Style / Genre
                    </label>
                    <input
                      type="text"
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      placeholder="e.g., Pop, Rock, Classical, Jazz"
                      className="w-full px-4 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
                      maxLength={200}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={instrumental}
                        onChange={(e) => setInstrumental(e.target.checked)}
                        className="w-4 h-4 rounded border-purple-500/50 bg-purple-900/20 text-purple-500 focus:ring-purple-500"
                      />
                      <Mic className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">Instrumental (no vocals)</span>
                    </label>
                  </div>
                </>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Music
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Tracks */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Your Tracks</h2>
            
            {tracks.length === 0 ? (
              <div className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-8 text-center">
                <Music className="w-16 h-16 text-purple-400/50 mx-auto mb-4" />
                <p className="text-gray-400">No tracks yet. Create your first one!</p>
              </div>
            ) : (
              tracks.map((track) => (
                <div
                  key={track.id}
                  className="bg-black/40 backdrop-blur-sm border border-purple-500/30 rounded-xl p-4 hover:border-purple-500/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Play Button */}
                    <button
                      onClick={() => togglePlay(track.id)}
                      disabled={track.status !== 'complete'}
                      className="w-12 h-12 rounded-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    >
                      {track.status === 'generating' ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : playingTrackId === track.id ? (
                        <Pause className="w-6 h-6" />
                      ) : (
                        <Play className="w-6 h-6 ml-1" />
                      )}
                    </button>

                    {/* Track Info */}
                    <div className="flex-1">
                      <h3 className="font-semibold">{track.title}</h3>
                      <p className="text-sm text-gray-400">
                        {track.status === 'generating' && 'Generating...'}
                        {track.status === 'complete' && 'Ready to play'}
                        {track.status === 'error' && 'Generation failed'}
                      </p>
                    </div>

                    {/* Download Button */}
                    {track.status === 'complete' && track.audioUrl && (
                      <a
                        href={track.audioUrl}
                        download
                        className="p-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 transition-colors"
                      >
                        <Download className="w-5 h-5" />
                      </a>
                    )}
                  </div>

                  {/* Audio Player */}
                  {track.status === 'complete' && track.audioUrl && (
                    <audio
                      src={track.audioUrl}
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
    </div>
  );
}
