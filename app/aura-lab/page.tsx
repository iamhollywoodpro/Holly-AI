'use client';

import { useState } from 'react';
import { 
  Mic2, Upload, FileAudio, Sparkles, TrendingUp, Target, 
  Award, AlertCircle, CheckCircle, Loader2, Music, ArrowLeft,
  Radio, Zap, Users, ListMusic, Star
} from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface AnalysisResult {
  // Core scores
  overall_score: number;
  production_quality: number;
  commercial_viability: number;
  artistic_merit: number;
  hit_potential?: number;
  // Narrative fields
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  market_potential: string;
  target_audience: string;
  genre_fit: string;
  // Extended A&R fields
  playlist_targets?: string[];
  similar_artists?: string[];
  radio_viability?: string;
  sync_potential?: string;
  a_and_r_verdict?: string;
  model_version?: string;
  analyzed_at?: string;
}

const C = cyberpunkTheme.colors;

function ScoreCircle({ score, label, color }: { score: number; label: string; color?: string }) {
  const c = color ?? C.primary.cyan;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '90px', height: '90px', borderRadius: '50%',
        border: `3px solid ${c}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 0.5rem',
        background: `conic-gradient(${c} ${score * 3.6}deg, ${C.background.tertiary} 0deg)`,
      }}>
        <div style={{
          width: '76px', height: '76px', borderRadius: '50%',
          background: C.background.secondary, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '1.35rem', fontWeight: 'bold', color: c,
        }}>
          {score}
        </div>
      </div>
      <div style={{ fontSize: '0.8rem', color: C.text.secondary, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem',
      fontWeight: 600, background: `${color}20`, color: color, border: `1px solid ${color}40`,
      display: 'inline-block',
    }}>
      {text}
    </span>
  );
}

function viabilityColor(val?: string): string {
  if (!val) return C.text.secondary;
  const v = val.toLowerCase();
  if (v.startsWith('high'))   return '#10b981';
  if (v.startsWith('medium')) return '#f59e0b';
  return '#ef4444';
}

export default function AuraLabPage() {
  const [file, setFile]           = useState<File | null>(null);
  const [audioUrl, setAudioUrl]   = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [lyrics, setLyrics]       = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis]   = useState<AnalysisResult | null>(null);
  const [error, setError]         = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setAudioUrl(''); setError(''); }
  };

  const handleAnalyze = async () => {
    if (!file && !audioUrl && !trackTitle && !lyrics) {
      setError('Provide at least one of: audio file, URL, track title, or lyrics');
      return;
    }
    setIsAnalyzing(true); setError(''); setAnalysis(null);
    try {
      const formData = new FormData();
      if (file)        formData.append('file', file);
      if (audioUrl)    formData.append('audioUrl', audioUrl);
      if (trackTitle)  formData.append('trackTitle', trackTitle);
      if (artistName)  formData.append('artistName', artistName);
      if (lyrics)      formData.append('lyrics', lyrics);

      const res  = await fetch('/api/aura-analyze', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.success && data.analysis) {
        setAnalysis(data.analysis);
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (err) {
      console.error('Analysis error:', err);
      setError('Failed to analyze track');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.background.primary, color: C.text.primary }}>
      {/* Header */}
      <div style={{ background: C.background.secondary, borderBottom: `1px solid ${C.border.primary}`, padding: '1.5rem 2rem' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.25rem' }}>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                padding: '0.4rem', borderRadius: '8px', border: `1px solid ${C.border.primary}`,
                background: C.background.tertiary, color: C.text.primary, cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              <ArrowLeft size={18} />
            </button>
            <Mic2 size={28} style={{ color: C.primary.pink }} />
            <h1 style={{
              fontSize: '1.75rem', fontWeight: 'bold',
              background: C.gradients.holographic,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              AURA A&R Lab
            </h1>
          </div>
          <p style={{ color: C.text.secondary, fontSize: '0.9rem', marginLeft: '3.5rem' }}>
            Professional A&R analysis powered by Groq Llama-3.3-70B — honest, expert-level feedback
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: analysis ? '340px 1fr' : '480px', gap: '2rem', justifyContent: analysis ? undefined : 'center' }}>

          {/* ── Input Panel ── */}
          <div style={{
            padding: '1.75rem', borderRadius: '16px',
            background: C.background.secondary, border: `1px solid ${C.border.primary}`,
            height: 'fit-content',
          }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.25rem', color: C.text.primary }}>
              Submit Track
            </h2>

            {/* Track title + artist */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                { label: 'Track Title', val: trackTitle, set: setTrackTitle, ph: 'e.g. Electric Soul' },
                { label: 'Artist Name', val: artistName, set: setArtistName, ph: 'e.g. Holly AI' },
              ].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: C.text.secondary, marginBottom: '0.3rem' }}>{label}</label>
                  <input
                    type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    style={{
                      width: '100%', padding: '0.6rem', borderRadius: '8px',
                      border: `1px solid ${C.border.primary}`, background: C.background.tertiary,
                      color: C.text.primary, fontSize: '0.85rem', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* File upload */}
            <label style={{
              display: 'block', padding: '2rem 1.5rem', borderRadius: '12px',
              border: `2px dashed ${C.border.primary}`, background: C.background.tertiary,
              cursor: 'pointer', textAlign: 'center', marginBottom: '1rem',
            }}>
              <input type="file" accept="audio/*" onChange={handleFileChange} style={{ display: 'none' }} />
              {file ? (
                <>
                  <FileAudio size={36} style={{ margin: '0 auto 0.5rem', color: C.primary.cyan }} />
                  <div style={{ color: C.text.primary, fontWeight: 500, fontSize: '0.9rem' }}>{file.name}</div>
                  <div style={{ fontSize: '0.78rem', color: C.text.tertiary }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                </>
              ) : (
                <>
                  <Upload size={36} style={{ margin: '0 auto 0.5rem', color: C.text.tertiary }} />
                  <div style={{ color: C.text.primary, fontWeight: 500, fontSize: '0.9rem' }}>Click to upload audio</div>
                  <div style={{ fontSize: '0.78rem', color: C.text.tertiary }}>MP3, WAV, FLAC…</div>
                </>
              )}
            </label>

            {/* OR + URL */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.75rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: C.border.primary }} />
              <span style={{ fontSize: '0.78rem', color: C.text.tertiary }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: C.border.primary }} />
            </div>
            <input
              type="text" value={audioUrl}
              onChange={e => { setAudioUrl(e.target.value); setFile(null); setError(''); }}
              placeholder="https://example.com/track.mp3"
              style={{
                width: '100%', padding: '0.6rem', borderRadius: '8px',
                border: `1px solid ${C.border.primary}`, background: C.background.tertiary,
                color: C.text.primary, fontSize: '0.85rem', marginBottom: '1rem', boxSizing: 'border-box',
              }}
            />

            {/* Lyrics textarea */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: C.text.secondary, marginBottom: '0.3rem' }}>
                Lyrics (optional — improves analysis quality)
              </label>
              <textarea
                value={lyrics} onChange={e => setLyrics(e.target.value)}
                placeholder="Paste lyrics here..."
                rows={5}
                style={{
                  width: '100%', padding: '0.6rem', borderRadius: '8px',
                  border: `1px solid ${C.border.primary}`, background: C.background.tertiary,
                  color: C.text.primary, fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '0.65rem', borderRadius: '8px', background: '#ef444420',
                border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.83rem',
                marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <AlertCircle size={15} /> {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || (!file && !audioUrl && !trackTitle && !lyrics)}
              style={{
                width: '100%', padding: '0.85rem', borderRadius: '12px', border: 'none',
                background: isAnalyzing || (!file && !audioUrl && !trackTitle && !lyrics)
                  ? C.background.tertiary : C.gradients.primary,
                color: '#fff', fontSize: '0.95rem', fontWeight: 600,
                cursor: isAnalyzing || (!file && !audioUrl && !trackTitle && !lyrics) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              }}
            >
              {isAnalyzing ? <><Loader2 size={18} className="animate-spin" /> Analyzing...</> : <><Sparkles size={18} /> Analyze Track</>}
            </button>
          </div>

          {/* ── Results Panel ── */}
          {analysis && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

              {/* Score row */}
              <div style={{
                padding: '1.75rem', borderRadius: '16px',
                background: C.background.secondary, border: `1px solid ${C.border.primary}`,
              }}>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Overall Scores</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                  <ScoreCircle score={analysis.overall_score}       label="Overall"    color={C.primary.cyan} />
                  <ScoreCircle score={analysis.production_quality}  label="Production" color="#a78bfa" />
                  <ScoreCircle score={analysis.commercial_viability} label="Commercial" color="#f472b6" />
                  <ScoreCircle score={analysis.artistic_merit}      label="Artistic"   color="#34d399" />
                  {analysis.hit_potential != null
                    ? <ScoreCircle score={analysis.hit_potential}   label="Hit Potential" color="#fbbf24" />
                    : <div />}
                </div>
              </div>

              {/* A&R Verdict */}
              {analysis.a_and_r_verdict && (
                <div style={{
                  padding: '1.25rem 1.5rem', borderRadius: '12px',
                  background: `${C.primary.pink}12`, border: `1px solid ${C.primary.pink}40`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <Star size={18} style={{ color: C.primary.pink }} />
                    <span style={{ fontWeight: 700, color: C.primary.pink, fontSize: '0.9rem' }}>A&R Verdict</span>
                    {analysis.model_version && (
                      <span style={{ fontSize: '0.72rem', color: C.text.tertiary, marginLeft: 'auto' }}>{analysis.model_version}</span>
                    )}
                  </div>
                  <p style={{ color: C.text.primary, fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
                    {analysis.a_and_r_verdict}
                  </p>
                </div>
              )}

              {/* Radio / Sync / Market row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {[
                  { icon: Radio,     label: 'Radio Viability',  val: analysis.radio_viability },
                  { icon: Zap,       label: 'Sync Potential',   val: analysis.sync_potential  },
                  { icon: TrendingUp, label: 'Market Potential', val: analysis.market_potential },
                ].map(({ icon: Icon, label, val }) => val ? (
                  <div key={label} style={{
                    padding: '1.25rem', borderRadius: '12px',
                    background: C.background.secondary, border: `1px solid ${C.border.primary}`,
                  }}>
                    <Icon size={20} style={{ color: viabilityColor(val), marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.75rem', color: C.text.tertiary, marginBottom: '0.25rem' }}>{label}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: C.text.primary }}>{val}</div>
                  </div>
                ) : null)}
              </div>

              {/* Genre / Audience / Similar Artists */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {[
                  { icon: Music,  label: 'Genre',            val: analysis.genre_fit },
                  { icon: Target, label: 'Target Audience',  val: analysis.target_audience },
                  { icon: Users,  label: 'Similar Artists',  val: analysis.similar_artists?.join(', ') ?? null },
                ].map(({ icon: Icon, label, val }) => val ? (
                  <div key={label} style={{
                    padding: '1.25rem', borderRadius: '12px',
                    background: C.background.secondary, border: `1px solid ${C.border.primary}`,
                  }}>
                    <Icon size={20} style={{ color: C.primary.cyan, marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.75rem', color: C.text.tertiary, marginBottom: '0.25rem' }}>{label}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: C.text.primary }}>{val}</div>
                  </div>
                ) : null)}
              </div>

              {/* Playlist Targets */}
              {analysis.playlist_targets?.length ? (
                <div style={{
                  padding: '1.25rem 1.5rem', borderRadius: '12px',
                  background: C.background.secondary, border: `1px solid ${C.border.primary}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <ListMusic size={18} style={{ color: C.primary.cyan }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Playlist Targets</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {analysis.playlist_targets.map((p, i) => (
                      <Badge key={i} text={p} color={C.primary.cyan} />
                    ))}
                  </div>
                </div>
              ) : null}

              {/* Strengths + Weaknesses + Recommendations row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Strengths */}
                <div style={{
                  padding: '1.25rem 1.5rem', borderRadius: '12px',
                  background: C.background.secondary, border: `1px solid ${C.border.primary}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <CheckCircle size={18} style={{ color: '#10b981' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Strengths</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: C.text.secondary, fontSize: '0.87rem' }}>
                    {analysis.strengths.map((s, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{s}</li>)}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div style={{
                  padding: '1.25rem 1.5rem', borderRadius: '12px',
                  background: C.background.secondary, border: `1px solid ${C.border.primary}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <AlertCircle size={18} style={{ color: '#ef4444' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Areas to Improve</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: C.text.secondary, fontSize: '0.87rem' }}>
                    {analysis.weaknesses.map((w, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{w}</li>)}
                  </ul>
                </div>
              </div>

              {/* Recommendations */}
              <div style={{
                padding: '1.25rem 1.5rem', borderRadius: '12px',
                background: C.background.secondary, border: `1px solid ${C.border.primary}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Award size={18} style={{ color: C.primary.pink }} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Recommendations</span>
                </div>
                <ol style={{ margin: 0, paddingLeft: '1.5rem', color: C.text.secondary, fontSize: '0.87rem' }}>
                  {analysis.recommendations.map((r, i) => (
                    <li key={i} style={{ marginBottom: '0.5rem' }}>{r}</li>
                  ))}
                </ol>
              </div>

              {analysis.analyzed_at && (
                <div style={{ textAlign: 'right', fontSize: '0.72rem', color: C.text.tertiary }}>
                  Analyzed {new Date(analysis.analyzed_at).toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
