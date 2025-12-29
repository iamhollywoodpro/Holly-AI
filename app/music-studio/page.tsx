"use client";

import { useState } from 'react';
import { Music, Play, Pause, Download, Loader2, Sparkles, Mic, FileText, Wand2, Image as ImageIcon, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface GeneratedTrack {
  id: string;
  title: string;
  audioUrl: string;
  imageUrl?: string;
  customCoverUrl?: string;
  duration?: number;
  status: 'generating' | 'complete' | 'error';
}

export default function MusicStudio() {
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState('');
  const [instrumental, setInstrumental] = useState(false);
  const [customMode, setCustomMode] = useState(true);
  const [useLyrics, setUseLyrics] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tracks, setTracks] = useState<GeneratedTrack[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generateCover, setGenerateCover] = useState(true);
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [vocalGender, setVocalGender] = useState<'m' | 'f' | ''>('');
  const [styleWeight, setStyleWeight] = useState(0.65);
  const [weirdness, setWeirdness] = useState(0.65);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleGenerate = async () => {
    // Validation
    if (customMode && useLyrics && !lyrics.trim()) {
      setError('Please enter lyrics for your song');
      return;
    }
    
    if (customMode && !useLyrics && !prompt.trim()) {
      setError('Please enter a description for your music');
      return;
    }

    if (!customMode && !prompt.trim()) {
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
          prompt: useLyrics ? lyrics : prompt,
          title: title || undefined,
          style: style || undefined,
          instrumental,
          // Only use customMode when we have lyrics OR instrumental
          // If using description with vocals, use non-custom mode so SUNO auto-generates lyrics
          customMode: useLyrics || instrumental,
          vocalGender: vocalGender || undefined,
          styleWeight: showAdvanced ? styleWeight : undefined,
          weirdnessConstraint: showAdvanced ? weirdness : undefined,
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

      // Generate custom cover art if enabled
      if (generateCover) {
        generateCustomCover(taskId);
      }

      // Poll for completion
      pollTrackStatus(taskId);

    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate music');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateCustomCover = async (taskId: string) => {
    try {
      setIsGeneratingCover(true);
      const response = await fetch('/api/music/generate-cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          style,
          lyrics: useLyrics ? lyrics : prompt,
        }),
      });

      const result = await response.json();

      if (result.success && result.data.imageUrl) {
        console.log('[Cover Art] Generated:', result.data.imageUrl);
        setTracks(prev =>
          prev.map(t =>
            t.id === taskId
              ? { ...t, customCoverUrl: result.data.imageUrl }
              : t
          )
        );
      } else {
        console.error('[Cover Art] Generation failed:', result.error);
      }
    } catch (err) {
      console.error('[Cover Art] Error:', err);
    } finally {
      setIsGeneratingCover(false);
    }
  };

  const regenerateCover = async (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    try {
      setIsGeneratingCover(true);
      const response = await fetch('/api/music/generate-cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: track.title,
          style,
          lyrics: useLyrics ? lyrics : prompt,
        }),
      });

      const result = await response.json();

      if (result.success && result.data.imageUrl) {
        console.log('[Cover Art] Regenerated:', result.data.imageUrl);
        setTracks(prev =>
          prev.map(t =>
            t.id === trackId
              ? { ...t, customCoverUrl: result.data.imageUrl }
              : t
          )
        );
      }
    } catch (err) {
      console.error('[Cover Art] Regeneration error:', err);
    } finally {
      setIsGeneratingCover(false);
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

  const formatLyrics = () => {
    // Basic lyrics formatting helper
    const formatted = lyrics
      .split('\n')
      .map(line => line.trim())
      .join('\n');
    setLyrics(formatted);
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

              {/* Custom Lyrics Toggle */}
              {customMode && (
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useLyrics}
                      onChange={(e) => setUseLyrics(e.target.checked)}
                      className="w-4 h-4 rounded border-purple-500/50 bg-purple-900/20 text-purple-500 focus:ring-purple-500"
                    />
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-gray-300">Write Custom Lyrics</span>
                  </label>
                </div>
              )}

              {/* Custom Lyrics Input */}
              {customMode && useLyrics && !instrumental ? (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-300">
                      Custom Lyrics *
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!title && !prompt) {
                            setError('Please enter a title or description first');
                            return;
                          }
                          setIsGeneratingLyrics(true);
                          try {
                            const response = await fetch('/api/music/generate-lyrics', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                theme: title || prompt,
                                style: style || 'pop',
                                mood: 'emotional',
                              }),
                            });
                            const result = await response.json();
                            if (result.success) {
                              setLyrics(result.data.lyrics);
                            } else {
                              setError(result.error || 'Failed to generate lyrics');
                            }
                          } catch (err) {
                            console.error('Lyrics generation error:', err);
                          } finally {
                            setIsGeneratingLyrics(false);
                          }
                        }}
                        disabled={isGeneratingLyrics}
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-50"
                      >
                        {isGeneratingLyrics ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Sparkles className="w-3 h-3" />
                        )}
                        AI Generate
                      </button>
                      <button
                        onClick={formatLyrics}
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        <Wand2 className="w-3 h-3" />
                        Format
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={lyrics}
                    onChange={(e) => setLyrics(e.target.value)}
                    placeholder="Write your song lyrics here...&#10;&#10;[Verse 1]&#10;Your lyrics here...&#10;&#10;[Chorus]&#10;Your chorus here..."
                    className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 resize-none font-mono text-sm"
                    rows={12}
                    maxLength={5000}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <div className="text-xs text-gray-500">
                      {lyrics.length} / 5000 characters
                    </div>
                    <div className="text-xs text-gray-500">
                      {lyrics.split('\n').length} lines
                    </div>
                  </div>
                  <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-xs text-blue-300">
                      💡 <strong>Tip:</strong> Use [Verse], [Chorus], [Bridge] tags to structure your song. The AI will follow your exact lyrics!
                    </p>
                  </div>
                </div>
              ) : (
                /* Description/Prompt */
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {customMode ? 'Description' : 'Description *'}
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder={customMode ? "Describe the music style and mood..." : "Describe the music you want to create..."}
                    className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500 resize-none"
                    rows={4}
                    maxLength={customMode ? 5000 : 500}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    {prompt.length} / {customMode ? 5000 : 500} characters
                  </div>
                </div>
              )}

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
                    {/* Style Presets */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {['Lo-Fi Chill', 'Epic Cinematic', 'Acoustic Folk', 'Electronic Dance', 'Jazz Smooth', 'Rock Alternative'].map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setStyle(preset)}
                          className="px-3 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-full transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={style}
                      onChange={(e) => setStyle(e.target.value)}
                      placeholder="e.g., Pop, Rock, Classical, Jazz"
                      className="w-full px-4 py-2 bg-purple-900/20 border border-purple-500/30 rounded-lg focus:outline-none focus:border-purple-500 text-white placeholder-gray-500"
                      maxLength={1000}
                    />
                  </div>

                  <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={instrumental}
                        onChange={(e) => {
                          setInstrumental(e.target.checked);
                          if (e.target.checked) {
                            setUseLyrics(false);
                          }
                        }}
                        className="w-4 h-4 rounded border-purple-500/50 bg-purple-900/20 text-purple-500 focus:ring-purple-500"
                      />
                      <Mic className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-300">Instrumental (no vocals)</span>
                    </label>
                  </div>

                  {/* Advanced Controls */}
                  <div className="mb-4">
                    <button
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-1"
                    >
                      <Wand2 className="w-4 h-4" />
                      {showAdvanced ? 'Hide' : 'Show'} Advanced Controls
                    </button>
                  </div>

                  {showAdvanced && (
                    <div className="space-y-4 mb-4 p-4 bg-purple-900/10 border border-purple-500/20 rounded-lg">
                      {/* Vocal Gender */}
                      {!instrumental && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Vocal Gender
                          </label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setVocalGender('')}
                              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                                vocalGender === ''
                                  ? 'bg-purple-600 border-purple-500'
                                  : 'bg-purple-900/20 border-purple-500/30 hover:border-purple-500/50'
                              }`}
                            >
                              Auto
                            </button>
                            <button
                              onClick={() => setVocalGender('m')}
                              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                                vocalGender === 'm'
                                  ? 'bg-purple-600 border-purple-500'
                                  : 'bg-purple-900/20 border-purple-500/30 hover:border-purple-500/50'
                              }`}
                            >
                              Male
                            </button>
                            <button
                              onClick={() => setVocalGender('f')}
                              className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                                vocalGender === 'f'
                                  ? 'bg-purple-600 border-purple-500'
                                  : 'bg-purple-900/20 border-purple-500/30 hover:border-purple-500/50'
                              }`}
                            >
                              Female
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Style Weight */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Style Weight: {styleWeight.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={styleWeight}
                          onChange={(e) => setStyleWeight(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          How closely to follow the specified style (0 = loose, 1 = strict)
                        </p>
                      </div>

                      {/* Weirdness/Creativity */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Creativity: {weirdness.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={weirdness}
                          onChange={(e) => setWeirdness(parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Creative deviation (0 = traditional, 1 = experimental)
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* AI Cover Art Toggle */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={generateCover}
                    onChange={(e) => setGenerateCover(e.target.checked)}
                    className="w-4 h-4 rounded border-purple-500/50 bg-purple-900/20 text-purple-500 focus:ring-purple-500"
                  />
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <span className="text-sm text-gray-300">Generate AI Cover Art</span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-6">
                  Create custom album artwork based on your song
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={isGenerating || (useLyrics ? !lyrics.trim() : !prompt.trim())}
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
                  {/* Cover Art */}
                  {(track.customCoverUrl || track.imageUrl) && (
                    <div className="mb-4 relative group">
                      <img
                        src={track.customCoverUrl || track.imageUrl}
                        alt={track.title}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      {track.customCoverUrl && track.status === 'complete' && (
                        <button
                          onClick={() => regenerateCover(track.id)}
                          disabled={isGeneratingCover}
                          className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                          title="Regenerate cover art"
                        >
                          {isGeneratingCover ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  )}

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
