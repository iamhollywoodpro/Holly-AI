'use client';

import { useState } from 'react';
import { 
  Mic2, Upload, FileAudio, Sparkles, TrendingUp, Target, 
  Award, AlertCircle, CheckCircle, Loader2, Music, ArrowLeft,
  Radio, Zap, Users, ListMusic, Star
} from 'lucide-react';
import { sovereignTheme } from '@/styles/themes/sovereign';
import { motion, AnimatePresence } from 'framer-motion';

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

const C = sovereignTheme.colors;

function ScoreCircle({ score, label, color }: { score: number; label: string; color?: string }) {
  const c = color ?? C.primary.gold;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '90px', height: '90px', borderRadius: '50%',
        border: `3px solid ${c}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 0.5rem',
        background: `conic-gradient(${c} ${score * 3.6}deg, ${C.background.tertiary} 0deg)`,
        boxShadow: `0 0 15px ${c}30`,
      }}>
        <div style={{
          width: '76px', height: '76px', borderRadius: '50%',
          background: C.background.secondary, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '1.35rem', fontWeight: '900', color: c,
        }}>
          {score}
        </div>
      </div>
      <div style={{ fontSize: '0.8rem', color: C.text.secondary, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
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
  if (v.startsWith('high'))   return C.primary.gold;
  if (v.startsWith('medium')) return C.text.secondary;
  return C.primary.copper;
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
    <div className="relative overflow-x-hidden min-h-screen" style={{ background: C.background.primary, color: C.text.primary }}>
      {/* Dynamic gradients background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-20%] left-[10%] w-[600px] h-[600px] rounded-full bg-[#2D8B5E]/10 blur-[150px]" />
        <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#C47A4A]/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-[400px] h-[400px] rounded-full bg-[#1F3D30]/8 blur-[100px]" />
      </div>

      {/* Header */}
      <div className="relative z-10" style={{ background: 'rgba(18, 17, 15, 0.4)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${C.border.primary}`, padding: '1.5rem 2rem' }}>
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
            <Mic2 size={28} style={{ color: C.primary.gold }} />
            <h1 style={{
              fontSize: '1.75rem', fontWeight: '900',
              color: C.primary.gold, textTransform: 'uppercase', letterSpacing: '0.2em'
            }}>
              AURA A&R Lab
            </h1>
          </div>
          <p style={{ color: C.text.secondary, fontSize: '0.9rem', marginLeft: '3.5rem', fontStyle: 'italic' }}>
            Sovereign Professional Analysis — Expert-level sentient feedback
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: analysis ? '340px 1fr' : '480px', gap: '2rem', justifyContent: analysis ? undefined : 'center' }}>

          {/* ── Input Panel ── */}
          <div className="sdi-glass-warm shadow-2xl relative z-10" style={{
            padding: '1.75rem', borderRadius: '16px',
            background: 'rgba(18, 17, 15, 0.75)', border: `1px solid rgba(212, 168, 83, 0.25)`,
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
                  <FileAudio size={36} style={{ margin: '0 auto 0.5rem', color: C.primary.emerald }} />
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
                padding: '0.65rem', borderRadius: '8px', background: `${C.primary.copper}20`,
                border: `1px solid ${C.primary.copper}`, color: C.primary.copper, fontSize: '0.83rem',
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
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01, y: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="sdi-glass-warm shadow-xl relative z-10"
                style={{
                  padding: '1.75rem', borderRadius: '16px',
                  background: 'rgba(18, 17, 15, 0.75)', border: `1px solid rgba(212, 168, 83, 0.25)`,
                }}
              >
                <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Overall Scores</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                  <ScoreCircle score={analysis.overall_score}       label="Overall"    color={C.primary.gold} />
                  <ScoreCircle score={analysis.production_quality}  label="Production" color={C.primary.gold} />
                  <ScoreCircle score={analysis.commercial_viability} label="Commercial" color={C.primary.gold} />
                  <ScoreCircle score={analysis.artistic_merit}      label="Artistic"   color={C.primary.gold} />
                  {analysis.hit_potential != null
                    ? <ScoreCircle score={analysis.hit_potential}   label="Hit Potential" color={C.primary.copper} />
                    : <div />}
                </div>
              </motion.div>

              {/* A&R Verdict */}
              {analysis.a_and_r_verdict && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01, y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="shadow-xl relative z-10"
                  style={{
                    padding: '1.25rem 1.5rem', borderRadius: '12px',
                    background: 'rgba(201, 107, 139, 0.08)', border: `1px solid rgba(201, 107, 139, 0.25)`,
                    backdropFilter: 'blur(12px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <Star size={18} style={{ color: C.primary.gold }} />
                    <span style={{ fontWeight: 700, color: C.primary.gold, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sovereign Verdict</span>
                    {analysis.model_version && (
                      <span style={{ fontSize: '0.72rem', color: C.text.tertiary, marginLeft: 'auto' }}>{analysis.model_version}</span>
                    )}
                  </div>
                  <p style={{ color: C.text.primary, fontSize: '0.92rem', lineHeight: 1.6, margin: 0 }}>
                    {analysis.a_and_r_verdict}
                  </p>
                </motion.div>
              )}

              {/* Radio / Sync / Market row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {[
                  { icon: Radio,     label: 'Radio Viability',  val: analysis.radio_viability },
                  { icon: Zap,       label: 'Sync Potential',   val: analysis.sync_potential  },
                  { icon: TrendingUp, label: 'Market Potential', val: analysis.market_potential },
                ].map(({ icon: Icon, label, val }) => val ? (
                  <motion.div
                    key={label}
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="sdi-glass shadow-md relative z-10"
                    style={{
                      padding: '1.25rem', borderRadius: '12px',
                      background: 'rgba(18, 17, 15, 0.65)', border: `1px solid rgba(212, 168, 83, 0.15)`,
                    }}
                  >
                    <Icon size={20} style={{ color: viabilityColor(val), marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.75rem', color: C.text.tertiary, marginBottom: '0.25rem' }}>{label}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: C.text.primary }}>{val}</div>
                  </motion.div>
                ) : null)}
              </div>

              {/* Genre / Audience / Similar Artists */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                {[
                  { icon: Music,  label: 'Genre',            val: analysis.genre_fit },
                  { icon: Target, label: 'Target Audience',  val: analysis.target_audience },
                  { icon: Users,  label: 'Similar Artists',  val: analysis.similar_artists?.join(', ') ?? null },
                ].map(({ icon: Icon, label, val }) => val ? (
                  <motion.div
                    key={label}
                    whileHover={{ scale: 1.02, y: -2 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="sdi-glass shadow-md relative z-10"
                    style={{
                      padding: '1.25rem', borderRadius: '12px',
                      background: 'rgba(18, 17, 15, 0.65)', border: `1px solid rgba(212, 168, 83, 0.15)`,
                    }}
                  >
                    <Icon size={20} style={{ color: C.primary.emerald, marginBottom: '0.5rem' }} />
                    <div style={{ fontSize: '0.75rem', color: C.text.tertiary, marginBottom: '0.25rem' }}>{label}</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: C.text.primary }}>{val}</div>
                  </motion.div>
                ) : null)}
              </div>

              {/* Playlist Targets */}
              {analysis.playlist_targets?.length ? (
                <motion.div
                  whileHover={{ scale: 1.01, y: -1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="sdi-glass shadow-md relative z-10"
                  style={{
                    padding: '1.25rem 1.5rem', borderRadius: '12px',
                    background: 'rgba(18, 17, 15, 0.65)', border: `1px solid rgba(212, 168, 83, 0.15)`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <ListMusic size={18} style={{ color: C.primary.emerald }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Playlist Targets</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {analysis.playlist_targets.map((p, i) => (
                      <Badge key={i} text={p} color={C.primary.emerald} />
                    ))}
                  </div>
                </motion.div>
              ) : null}

              {/* Strengths + Weaknesses + Recommendations row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                {/* Strengths */}
                <motion.div
                  whileHover={{ scale: 1.01, y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="sdi-glass shadow-md relative z-10"
                  style={{
                    padding: '1.25rem 1.5rem', borderRadius: '12px',
                    background: 'rgba(18, 17, 15, 0.65)', border: `1px solid rgba(212, 168, 83, 0.15)`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <CheckCircle size={18} style={{ color: '#10b981' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Strengths</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: C.text.secondary, fontSize: '0.87rem' }}>
                    {analysis.strengths.map((s, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{s}</li>)}
                  </ul>
                </motion.div>

                {/* Weaknesses */}
                <motion.div
                  whileHover={{ scale: 1.01, y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="sdi-glass shadow-md relative z-10"
                  style={{
                    padding: '1.25rem 1.5rem', borderRadius: '12px',
                    background: 'rgba(18, 17, 15, 0.65)', border: `1px solid rgba(212, 168, 83, 0.15)`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <AlertCircle size={18} style={{ color: '#ef4444' }} />
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Areas to Improve</span>
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', color: C.text.secondary, fontSize: '0.87rem' }}>
                    {analysis.weaknesses.map((w, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{w}</li>)}
                  </ul>
                </motion.div>
              </div>

              {/* Recommendations */}
              <motion.div
                whileHover={{ scale: 1.01, y: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="sdi-glass shadow-md relative z-10"
                style={{
                  padding: '1.25rem 1.5rem', borderRadius: '12px',
                  background: 'rgba(18, 17, 15, 0.65)', border: `1px solid rgba(212, 168, 83, 0.15)`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Award size={18} style={{ color: C.primary.gold }} />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase' }}>Recommendations</span>
                </div>
                <ol style={{ margin: 0, paddingLeft: '1.5rem', color: C.text.secondary, fontSize: '0.87rem' }}>
                  {analysis.recommendations.map((r, i) => (
                    <li key={i} style={{ marginBottom: '0.5rem' }}>{r}</li>
                  ))}
                </ol>
              </motion.div>

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
