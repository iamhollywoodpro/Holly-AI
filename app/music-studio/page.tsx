'use client';

import { useState } from 'react';
import { 
  Music, Play, Pause, Download, RefreshCw, Sparkles, 
  Wand2, Mic, Volume2, Clock, Loader2, ArrowLeft
} from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface GeneratedTrack {
  id: string;
  title: string;
  audio_url: string;
  image_url: string;
  status: 'submitted' | 'queued' | 'streaming' | 'complete' | 'error';
  tags: string;
  duration: number;
  created_at: string;
}

export default function MusicStudioPage() {
  const [mode, setMode] = useState<'simple' | 'custom' | 'instrumental'>('simple');
  const [prompt, setPrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [tags, setTags] = useState('');
  const [title, setTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [tracks, setTracks] = useState<GeneratedTrack[]>([]);
  const [playingTrack, setPlayingTrack] = useState<string | null>(null);

  const stylePresets = [
    { name: 'Lo-Fi Chill', tags: 'lo-fi, chill, hip-hop, relaxing, beats', emoji: '🎧' },
    { name: 'Epic Cinematic', tags: 'cinematic, orchestral, epic, dramatic, powerful', emoji: '🎬' },
    { name: 'Synthwave', tags: 'synthwave, retro, 80s, electronic, neon', emoji: '🌆' },
    { name: 'Acoustic Pop', tags: 'acoustic, pop, guitar, uplifting, catchy', emoji: '🎸' },
    { name: 'Dark Trap', tags: 'trap, dark, bass, aggressive, hip-hop', emoji: '🔥' },
    { name: 'Ambient Space', tags: 'ambient, space, atmospheric, ethereal, calm', emoji: '🌌' },
  ];

  const handleGenerate = async () => {
    if (!prompt && !lyrics) {
      alert('Please enter a prompt or lyrics');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch('/api/music/generate-ultimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          prompt: mode === 'simple' || mode === 'instrumental' ? prompt : undefined,
          lyrics: mode === 'custom' ? lyrics : undefined,
          tags: tags || 'pop',
          title: title || 'Untitled',
          instrumental: mode === 'instrumental',
        }),
      });

      const data = await response.json();

      if (data.success && data.tracks) {
        setTracks(prev => [...data.tracks, ...prev]);
        alert('Music generation started! Tracks will be ready in 1-2 minutes.');
      } else {
        alert(data.error || 'Failed to generate music');
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate music');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefreshStatus = async () => {
    const pendingTracks = tracks.filter(t => t.status !== 'complete' && t.status !== 'error');
    if (pendingTracks.length === 0) return;

    try {
      const ids = pendingTracks.map(t => t.id).join(',');
      const response = await fetch(`/api/music/query?ids=${ids}`);
      const data = await response.json();

      if (data.success && data.tracks) {
        setTracks(prev => prev.map(track => {
          const updated = data.tracks.find((t: GeneratedTrack) => t.id === track.id);
          return updated || track;
        }));
      }
    } catch (error) {
      console.error('Refresh error:', error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: cyberpunkTheme.colors.background.primary,
      color: cyberpunkTheme.colors.text.primary,
    }}>
      {/* Header */}
      <div style={{
        background: cyberpunkTheme.colors.background.secondary,
        borderBottom: `1px solid ${cyberpunkTheme.colors.border.primary}`,
        padding: '2rem',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '0.5rem',
                borderRadius: '8px',
                border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                background: cyberpunkTheme.colors.background.tertiary,
                color: cyberpunkTheme.colors.text.primary,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = cyberpunkTheme.colors.background.elevated}
              onMouseLeave={(e) => e.currentTarget.style.background = cyberpunkTheme.colors.background.tertiary}
              title="Back to HOLLY Chat"
            >
              <ArrowLeft size={20} />
            </button>
            <Music size={32} style={{ color: cyberpunkTheme.colors.primary.pink }} />
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              background: cyberpunkTheme.colors.gradients.holographic,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              Music Generation Studio
            </h1>
          </div>
          <p style={{ color: cyberpunkTheme.colors.text.secondary, fontSize: '0.95rem' }}>
            Create original music with SUNO AI - From simple descriptions to custom lyrics
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          {/* Left: Generation Controls */}
          <div>
            {/* Mode Selection */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: cyberpunkTheme.colors.text.primary,
              }}>
                Generation Mode
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {[
                  { value: 'simple', icon: Wand2, label: 'Simple' },
                  { value: 'custom', icon: Mic, label: 'Custom Lyrics' },
                  { value: 'instrumental', icon: Volume2, label: 'Instrumental' },
                ].map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value as any)}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      border: `2px solid ${mode === m.value ? cyberpunkTheme.colors.primary.cyan : cyberpunkTheme.colors.border.primary}`,
                      background: mode === m.value ? `${cyberpunkTheme.colors.primary.cyan}15` : cyberpunkTheme.colors.background.secondary,
                      color: mode === m.value ? cyberpunkTheme.colors.primary.cyan : cyberpunkTheme.colors.text.secondary,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <m.icon size={24} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Style Presets */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.75rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: cyberpunkTheme.colors.text.primary,
              }}>
                Style Presets
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {stylePresets.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => setTags(preset.tags)}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                      background: cyberpunkTheme.colors.background.secondary,
                      color: cyberpunkTheme.colors.text.primary,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      fontSize: '0.8rem',
                    }}
                  >
                    {preset.emoji} {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Fields */}
            {mode !== 'custom' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: cyberpunkTheme.colors.text.primary,
                }}>
                  {mode === 'instrumental' ? 'Music Description' : 'Song Description'}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the music you want to create..."
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                    background: cyberpunkTheme.colors.background.secondary,
                    color: cyberpunkTheme.colors.text.primary,
                    fontSize: '0.9rem',
                    minHeight: '120px',
                    resize: 'vertical',
                  }}
                />
              </div>
            )}

            {mode === 'custom' && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: cyberpunkTheme.colors.text.primary,
                }}>
                  Song Lyrics
                </label>
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder="Enter your song lyrics here..."
                  style={{
                    width: '100%',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                    background: cyberpunkTheme.colors.background.secondary,
                    color: cyberpunkTheme.colors.text.primary,
                    fontSize: '0.9rem',
                    minHeight: '200px',
                    resize: 'vertical',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: cyberpunkTheme.colors.text.primary,
                }}>
                  Style Tags
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="pop, upbeat, electronic"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                    background: cyberpunkTheme.colors.background.secondary,
                    color: cyberpunkTheme.colors.text.primary,
                    fontSize: '0.9rem',
                  }}
                />
              </div>
              <div>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: cyberpunkTheme.colors.text.primary,
                }}>
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Untitled"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                    background: cyberpunkTheme.colors.background.secondary,
                    color: cyberpunkTheme.colors.text.primary,
                    fontSize: '0.9rem',
                  }}
                />
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              style={{
                width: '100%',
                padding: '1rem',
                borderRadius: '12px',
                border: 'none',
                background: isGenerating ? cyberpunkTheme.colors.background.tertiary : cyberpunkTheme.colors.gradients.primary,
                color: '#fff',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                transition: 'all 0.2s',
              }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Generating Music...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Generate Music
                </>
              )}
            </button>
          </div>

          {/* Right: Generated Tracks */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                color: cyberpunkTheme.colors.text.primary,
              }}>
                Generated Tracks ({tracks.length})
              </h2>
              <button
                onClick={handleRefreshStatus}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                  background: cyberpunkTheme.colors.background.secondary,
                  color: cyberpunkTheme.colors.text.secondary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.85rem',
                }}
              >
                <RefreshCw size={16} />
                Refresh
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tracks.length === 0 ? (
                <div style={{
                  padding: '3rem',
                  textAlign: 'center',
                  color: cyberpunkTheme.colors.text.tertiary,
                  background: cyberpunkTheme.colors.background.secondary,
                  borderRadius: '12px',
                  border: `1px dashed ${cyberpunkTheme.colors.border.primary}`,
                }}>
                  <Music size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                  <p>No tracks generated yet</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    Create your first track using the controls on the left
                  </p>
                </div>
              ) : (
                tracks.map((track) => (
                  <div
                    key={track.id}
                    style={{
                      padding: '1rem',
                      borderRadius: '12px',
                      background: cyberpunkTheme.colors.background.secondary,
                      border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                    }}
                  >
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      {/* Album Art */}
                      <div style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        background: cyberpunkTheme.colors.background.tertiary,
                        overflow: 'hidden',
                      }}>
                        {track.image_url && (
                          <img
                            src={track.image_url}
                            alt={track.title}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                      </div>

                      {/* Track Info */}
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontWeight: 600,
                          color: cyberpunkTheme.colors.text.primary,
                          marginBottom: '0.25rem',
                        }}>
                          {track.title}
                        </div>
                        <div style={{
                          fontSize: '0.8rem',
                          color: cyberpunkTheme.colors.text.tertiary,
                          marginBottom: '0.5rem',
                        }}>
                          {track.tags}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            background: track.status === 'complete' ? '#10b98120' : cyberpunkTheme.colors.background.tertiary,
                            color: track.status === 'complete' ? '#10b981' : cyberpunkTheme.colors.text.tertiary,
                          }}>
                            {track.status}
                          </span>
                          {track.duration > 0 && (
                            <span style={{
                              fontSize: '0.75rem',
                              color: cyberpunkTheme.colors.text.tertiary,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}>
                              <Clock size={12} />
                              {Math.floor(track.duration / 60)}:{(track.duration % 60).toString().padStart(2, '0')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      {track.status === 'complete' && track.audio_url && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => setPlayingTrack(playingTrack === track.id ? null : track.id)}
                            style={{
                              padding: '0.5rem',
                              borderRadius: '8px',
                              border: 'none',
                              background: cyberpunkTheme.colors.primary.cyan,
                              color: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            {playingTrack === track.id ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                          <a
                            href={track.audio_url}
                            download
                            style={{
                              padding: '0.5rem',
                              borderRadius: '8px',
                              border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                              background: cyberpunkTheme.colors.background.tertiary,
                              color: cyberpunkTheme.colors.text.primary,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Download size={16} />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
