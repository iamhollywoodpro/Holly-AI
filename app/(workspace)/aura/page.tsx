'use client';

import { useState } from 'react';
import {
  Sparkles, Upload, FileAudio, Music, TrendingUp, Target,
  Award, AlertCircle, CheckCircle, Loader2, ArrowLeft,
  Radio, Zap, Users, ListMusic, Star, RefreshCw, BarChart3
} from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

const C = cyberpunkTheme.colors;

type AuraTab = 'quick' | 'full' | 'recommendations' | 'hit-potential';

interface QuickAnalysis {
  overall_score: number;
  production_quality: number;
  commercial_viability: number;
  artistic_merit: number;
  hit_potential: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  market_potential: string;
  target_audience: string;
  genre_fit: string;
  playlist_targets?: string[];
  similar_artists?: string[];
  radio_viability?: string;
  sync_potential?: string;
  a_and_r_verdict?: string;
  model_version?: string;
  analyzed_at?: string;
}

interface HubAnalysis {
  structure: { sections: string[]; tempo: string; timeSignature: string; estimatedDuration: string };
  melody: { range: string; complexity: string; hooks: string[]; intervals: string[]; key: string; mode: string };
  lyrics: { themes: string[]; sentiment: string; rhymeScheme: string; vocabulary: string; wordCount: number; uniqueWords: number; chorus: string | null };
  patterns: string[];
  trends: string[];
  overallScore: number;
  summary: string;
}

interface HubRecommendations {
  recommendations: Array<{ area: string; priority: string; suggestion: string; rationale: string; example?: string }>;
  chordProgressions: Array<{ name: string; chords: string[]; genre: string; mood: string; description: string }>;
  melodyIdeas: string[];
  lyricsEdits: Array<{ original: string; suggested: string; reason: string }>;
  productionTips: string[];
  summary: string;
}

interface HubHitPotential {
  hitScore: number;
  verdict: string;
  confidence: number;
  marketAnalysis: { genreTrend: string; audienceMatch: number; platformFit: Record<string, number>; seasonality: string; competitionLevel: string };
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  comparables: Array<{ title: string; artist: string; reason: string }>;
  recommendation: string;
}

function ScoreCircle({ score, label, color }: { score: number; label: string; color?: string }) {
  const c = color ?? C.primary.cyan;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '50%',
        border: `3px solid ${c}`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 0.5rem',
        background: `conic-gradient(${c} ${score * 3.6}deg, ${C.background.tertiary} 0deg)`,
      }}>
        <div style={{
          width: '66px', height: '66px', borderRadius: '50%',
          background: C.background.secondary, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', color: c,
        }}>
          {score}
        </div>
      </div>
      <div style={{ fontSize: '0.75rem', color: C.text.secondary, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span style={{
      padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem',
      fontWeight: 600, background: `${color}20`, color, border: `1px solid ${color}40`,
      display: 'inline-block',
    }}>
      {text}
    </span>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      padding: '1.25rem 1.5rem', borderRadius: '12px',
      background: C.background.secondary, border: `1px solid ${C.border.primary}`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color }: { icon: any; title: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
      <Icon size={18} style={{ color: color ?? C.primary.cyan }} />
      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{title}</span>
    </div>
  );
}

export default function AuraWorkspacePage() {
  const [tab, setTab] = useState<AuraTab>('quick');
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [trackTitle, setTrackTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [genre, setGenre] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');

  const [quickResult, setQuickResult] = useState<QuickAnalysis | null>(null);
  const [hubAnalysis, setHubAnalysis] = useState<HubAnalysis | null>(null);
  const [hubRecs, setHubRecs] = useState<HubRecommendations | null>(null);
  const [hubHit, setHubHit] = useState<HubHitPotential | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setAudioUrl(''); setError(''); }
  };

  const runAnalysis = async () => {
    const isQuick = tab === 'quick';

    if (isQuick && !file && !audioUrl && !trackTitle && !lyrics) {
      setError('Provide at least one of: audio file, URL, track title, or lyrics');
      return;
    }
    if (!isQuick && !trackTitle) {
      setError('Track title is required for this analysis');
      return;
    }

    setIsAnalyzing(true);
    setError('');

    // Map tab → task parameter
    const taskMap: Record<AuraTab, string> = {
      quick:             'quick',
      full:              'full-analysis',
      recommendations:   'recommendations',
      'hit-potential':   'hit-potential',
    };
    const task = taskMap[tab];

    try {
      // Quick tab may have a file — use FormData. Others use JSON.
      let body: BodyInit;
      let headers: HeadersInit = {};

      if (tab === 'quick' && file) {
        const fd = new FormData();
        fd.append('task', task);
        fd.append('file', file);
        if (audioUrl)   fd.append('audioUrl', audioUrl);
        if (trackTitle) fd.append('trackTitle', trackTitle);
        if (artistName) fd.append('artistName', artistName);
        if (genre)      fd.append('genre', genre);
        if (lyrics)     fd.append('lyrics', lyrics);
        body = fd;
      } else {
        headers = { 'Content-Type': 'application/json' };
        body = JSON.stringify({ task, audioUrl, trackTitle, artistName, genre, lyrics });
      }

      const res  = await fetch('/api/aura-analyze', { method: 'POST', headers, body, credentials: 'include' });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Analysis failed');
        return;
      }

      const a = data.analysis;

      if (tab === 'quick')            setQuickResult(a);
      if (tab === 'full')             setHubAnalysis(a);
      if (tab === 'recommendations')  setHubRecs(a);
      if (tab === 'hit-potential')    setHubHit(a);

    } catch (err) {
      setError('Failed to analyze track. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasAnyResult = quickResult || hubAnalysis || hubRecs || hubHit;

  const tabs: { id: AuraTab; label: string; icon: any }[] = [
    { id: 'quick', label: 'Quick A&R', icon: Zap },
    { id: 'full', label: 'Full Analysis', icon: BarChart3 },
    { id: 'recommendations', label: 'Recommendations', icon: Award },
    { id: 'hit-potential', label: 'Hit Potential', icon: TrendingUp },
  ];

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
            <Music size={28} style={{ color: C.primary.pink }} />
            <h1 style={{
              fontSize: '1.75rem', fontWeight: 'bold',
              background: C.gradients.holographic,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              AURA 2.0
            </h1>
            <span style={{
              fontSize: '0.65rem', padding: '0.2rem 0.5rem', borderRadius: '4px',
              background: `${C.primary.pink}20`, color: C.primary.pink, fontWeight: 700,
              border: `1px solid ${C.primary.pink}40`, marginLeft: '-0.5rem',
            }}>
              A&R INTELLIGENCE
            </span>
          </div>
          <p style={{ color: C.text.secondary, fontSize: '0.9rem', marginLeft: '3.5rem' }}>
            Professional A&R analysis — Song structure, recommendations, and hit potential scoring
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                padding: '0.6rem 1.2rem', borderRadius: '10px',
                background: tab === id ? `${C.primary.cyan}15` : C.background.secondary,
                border: `1px solid ${tab === id ? `${C.primary.cyan}50` : C.border.primary}`,
                color: tab === id ? C.primary.cyan : C.text.tertiary,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.85rem', fontWeight: 600,
              }}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: hasAnyResult ? '380px 1fr' : '500px', gap: '2rem', justifyContent: hasAnyResult ? undefined : 'center' }}>
          {/* Input Panel */}
          <Card>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.25rem', color: C.text.primary }}>
              {tab === 'quick' ? 'Quick A&R Scan' : tab === 'full' ? 'Full Song Analysis' : tab === 'recommendations' ? 'Get Recommendations' : 'Hit Potential Score'}
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              {[
                { label: 'Track Title', val: trackTitle, set: setTrackTitle, ph: 'e.g. Electric Soul' },
                { label: 'Artist Name', val: artistName, set: setArtistName, ph: 'e.g. Holly AI' },
              ].map(({ label, val, set, ph }) => (
                <div key={label}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: C.text.secondary, marginBottom: '0.3rem' }}>{label}</label>
                  <input
                    type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                    style={{
                      width: '100%', padding: '0.55rem', borderRadius: '8px',
                      border: `1px solid ${C.border.primary}`, background: C.background.tertiary,
                      color: C.text.primary, fontSize: '0.85rem', boxSizing: 'border-box',
                    }}
                  />
                </div>
              ))}
            </div>

            {(tab === 'quick') && (
              <>
                <label style={{
                  display: 'block', padding: '1.5rem', borderRadius: '12px',
                  border: `2px dashed ${C.border.primary}`, background: C.background.tertiary,
                  cursor: 'pointer', textAlign: 'center', marginBottom: '1rem',
                }}>
                  <input type="file" accept="audio/*" onChange={handleFileChange} style={{ display: 'none' }} />
                  {file ? (
                    <>
                      <FileAudio size={32} style={{ margin: '0 auto 0.5rem', color: C.primary.cyan }} />
                      <div style={{ color: C.text.primary, fontWeight: 500, fontSize: '0.85rem' }}>{file.name}</div>
                      <div style={{ fontSize: '0.75rem', color: C.text.tertiary }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </>
                  ) : (
                    <>
                      <Upload size={32} style={{ margin: '0 auto 0.5rem', color: C.text.tertiary }} />
                      <div style={{ color: C.text.primary, fontWeight: 500, fontSize: '0.85rem' }}>Upload audio</div>
                      <div style={{ fontSize: '0.75rem', color: C.text.tertiary }}>MP3, WAV, FLAC</div>
                    </>
                  )}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '0.75rem 0' }}>
                  <div style={{ flex: 1, height: '1px', background: C.border.primary }} />
                  <span style={{ fontSize: '0.75rem', color: C.text.tertiary }}>OR</span>
                  <div style={{ flex: 1, height: '1px', background: C.border.primary }} />
                </div>
                <input
                  type="text" value={audioUrl}
                  onChange={e => { setAudioUrl(e.target.value); setFile(null); setError(''); }}
                  placeholder="https://example.com/track.mp3"
                  style={{
                    width: '100%', padding: '0.55rem', borderRadius: '8px',
                    border: `1px solid ${C.border.primary}`, background: C.background.tertiary,
                    color: C.text.primary, fontSize: '0.85rem', marginBottom: '1rem', boxSizing: 'border-box',
                  }}
                />
              </>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: C.text.secondary, marginBottom: '0.3rem' }}>
                Genre {tab !== 'quick' && '(required for Hit Potential)'}
              </label>
              <input
                type="text" value={genre} onChange={e => setGenre(e.target.value)}
                placeholder="e.g. synthpop, hip-hop, R&B"
                style={{
                  width: '100%', padding: '0.55rem', borderRadius: '8px',
                  border: `1px solid ${C.border.primary}`, background: C.background.tertiary,
                  color: C.text.primary, fontSize: '0.85rem', boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: C.text.secondary, marginBottom: '0.3rem' }}>
                Lyrics (optional)
              </label>
              <textarea
                value={lyrics} onChange={e => setLyrics(e.target.value)}
                placeholder="Paste lyrics here for deeper analysis..."
                rows={4}
                style={{
                  width: '100%', padding: '0.55rem', borderRadius: '8px',
                  border: `1px solid ${C.border.primary}`, background: C.background.tertiary,
                  color: C.text.primary, fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <div style={{
                padding: '0.6rem', borderRadius: '8px', background: '#ef444420',
                border: '1px solid #ef4444', color: '#ef4444', fontSize: '0.8rem',
                marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem',
              }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            <button
              onClick={runAnalysis}
              disabled={isAnalyzing || (tab === 'quick' ? (!file && !audioUrl && !trackTitle && !lyrics) : !trackTitle)}
              style={{
                width: '100%', padding: '0.8rem', borderRadius: '12px', border: 'none',
                background: isAnalyzing || (tab === 'quick' ? (!file && !audioUrl && !trackTitle && !lyrics) : !trackTitle)
                  ? C.background.tertiary : C.gradients.primary,
                color: '#fff', fontSize: '0.9rem', fontWeight: 600,
                cursor: isAnalyzing || (tab === 'quick' ? (!file && !audioUrl && !trackTitle && !lyrics) : !trackTitle) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              }}
            >
              {isAnalyzing ? <><Loader2 size={16} className="animate-spin" /> Analyzing...</> : <><Sparkles size={16} /> {tab === 'quick' ? 'Quick Scan' : 'Run Analysis'}</>}
            </button>
          </Card>

          {/* Results */}
          {hasAnyResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Quick Analysis Results */}
              {quickResult && (
                <>
                  <Card>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.25rem' }}>Overall Scores</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.75rem' }}>
                      <ScoreCircle score={quickResult.overall_score} label="Overall" color={C.primary.cyan} />
                      <ScoreCircle score={quickResult.production_quality} label="Production" color="#a78bfa" />
                      <ScoreCircle score={quickResult.commercial_viability} label="Commercial" color="#f472b6" />
                      <ScoreCircle score={quickResult.artistic_merit} label="Artistic" color="#34d399" />
                      {quickResult.hit_potential != null && <ScoreCircle score={quickResult.hit_potential} label="Hit" color="#fbbf24" />}
                    </div>
                  </Card>

                  {quickResult.a_and_r_verdict && (
                    <Card style={{ background: `${C.primary.pink}08`, borderColor: `${C.primary.pink}30` }}>
                      <SectionHeader icon={Star} title="A&R Verdict" color={C.primary.pink} />
                      <p style={{ color: C.text.primary, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{quickResult.a_and_r_verdict}</p>
                    </Card>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <Card>
                      <SectionHeader icon={CheckCircle} title="Strengths" color="#10b981" />
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', color: C.text.secondary, fontSize: '0.85rem' }}>
                        {quickResult.strengths.map((s, i) => <li key={i} style={{ marginBottom: '0.35rem' }}>{s}</li>)}
                      </ul>
                    </Card>
                    <Card>
                      <SectionHeader icon={AlertCircle} title="Areas to Improve" color="#ef4444" />
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', color: C.text.secondary, fontSize: '0.85rem' }}>
                        {quickResult.weaknesses.map((w, i) => <li key={i} style={{ marginBottom: '0.35rem' }}>{w}</li>)}
                      </ul>
                    </Card>
                  </div>

                  <Card>
                    <SectionHeader icon={Award} title="Recommendations" color={C.primary.pink} />
                    <ol style={{ margin: 0, paddingLeft: '1.5rem', color: C.text.secondary, fontSize: '0.85rem' }}>
                      {quickResult.recommendations.map((r, i) => <li key={i} style={{ marginBottom: '0.4rem' }}>{r}</li>)}
                    </ol>
                  </Card>
                </>
              )}

              {/* Hub: Song Analysis */}
              {hubAnalysis && (
                <>
                  <Card>
                    <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>Song Structure & Analysis</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <h3 style={{ fontSize: '0.8rem', color: C.text.tertiary, marginBottom: '0.5rem' }}>Structure</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {hubAnalysis.structure.sections.map((s, i) => <Badge key={i} text={s} color={C.primary.cyan} />)}
                        </div>
                        <p style={{ fontSize: '0.82rem', color: C.text.secondary, marginTop: '0.5rem' }}>
                          Tempo: {hubAnalysis.structure.tempo} | {hubAnalysis.structure.timeSignature} | ~{hubAnalysis.structure.estimatedDuration}
                        </p>
                      </div>
                      <div>
                        <h3 style={{ fontSize: '0.8rem', color: C.text.tertiary, marginBottom: '0.5rem' }}>Melody</h3>
                        <p style={{ fontSize: '0.82rem', color: C.text.secondary }}>
                          Key: {hubAnalysis.melody.key} ({hubAnalysis.melody.mode}) | Range: {hubAnalysis.melody.range}
                        </p>
                        <p style={{ fontSize: '0.82rem', color: C.text.secondary, marginTop: '0.3rem' }}>
                          Complexity: {hubAnalysis.melody.complexity}
                        </p>
                        {hubAnalysis.melody.hooks.length > 0 && (
                          <div style={{ marginTop: '0.3rem' }}>
                            {hubAnalysis.melody.hooks.map((h, i) => <Badge key={i} text={h} color="#a78bfa" />)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ marginTop: '0.75rem' }}>
                      <h3 style={{ fontSize: '0.8rem', color: C.text.tertiary, marginBottom: '0.4rem' }}>Lyrics</h3>
                      <p style={{ fontSize: '0.82rem', color: C.text.secondary }}>
                        Themes: {hubAnalysis.lyrics.themes.join(', ')} | Sentiment: {hubAnalysis.lyrics.sentiment} | {hubAnalysis.lyrics.wordCount} words
                      </p>
                    </div>
                    {hubAnalysis.patterns.length > 0 && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <h3 style={{ fontSize: '0.8rem', color: C.text.tertiary, marginBottom: '0.4rem' }}>Patterns</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                          {hubAnalysis.patterns.map((p, i) => <Badge key={i} text={p} color="#34d399" />)}
                        </div>
                      </div>
                    )}
                    <p style={{ fontSize: '0.85rem', color: C.text.primary, marginTop: '0.75rem', fontStyle: 'italic' }}>
                      {hubAnalysis.summary}
                    </p>
                  </Card>
                </>
              )}

              {/* Hub: Recommendations */}
              {hubRecs && (
                <Card>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>Recommendations</h2>

                  {hubRecs.chordProgressions.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '0.8rem', color: C.text.tertiary, marginBottom: '0.5rem' }}>Chord Progressions</h3>
                      {hubRecs.chordProgressions.map((cp, i) => (
                        <div key={i} style={{
                          padding: '0.75rem', marginBottom: '0.5rem', borderRadius: '8px',
                          background: C.background.tertiary, border: `1px solid ${C.border.primary}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: C.primary.cyan }}>{cp.name}</span>
                            <span style={{ fontSize: '0.72rem', color: C.text.tertiary }}>{cp.mood} · {cp.genre}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            {cp.chords.map((ch, j) => <Badge key={j} text={ch} color={C.primary.cyan} />)}
                          </div>
                          <p style={{ fontSize: '0.8rem', color: C.text.secondary, marginTop: '0.3rem' }}>{cp.description}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {hubRecs.lyricsEdits.length > 0 && (
                    <div style={{ marginBottom: '1rem' }}>
                      <h3 style={{ fontSize: '0.8rem', color: C.text.tertiary, marginBottom: '0.5rem' }}>Lyric Suggestions</h3>
                      {hubRecs.lyricsEdits.map((le, i) => (
                        <div key={i} style={{ padding: '0.5rem 0.75rem', marginBottom: '0.4rem', borderRadius: '6px', background: C.background.tertiary }}>
                          <span style={{ fontSize: '0.8rem', color: '#ef4444', textDecoration: 'line-through' }}>{le.original}</span>
                          <span style={{ margin: '0 0.5rem', color: C.text.tertiary }}>→</span>
                          <span style={{ fontSize: '0.8rem', color: '#10b981' }}>{le.suggested}</span>
                          <p style={{ fontSize: '0.72rem', color: C.text.tertiary, margin: '0.2rem 0 0' }}>{le.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {hubRecs.productionTips.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: '0.8rem', color: C.text.tertiary, marginBottom: '0.5rem' }}>Production Tips</h3>
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', color: C.text.secondary, fontSize: '0.82rem' }}>
                        {hubRecs.productionTips.map((t, i) => <li key={i} style={{ marginBottom: '0.3rem' }}>{t}</li>)}
                      </ul>
                    </div>
                  )}

                  <p style={{ fontSize: '0.85rem', color: C.text.primary, marginTop: '0.75rem', fontStyle: 'italic' }}>{hubRecs.summary}</p>
                </Card>
              )}

              {/* Hub: Hit Potential */}
              {hubHit && (
                <Card>
                  <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1rem' }}>Hit Potential Analysis</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{
                        fontSize: '3rem', fontWeight: 'bold',
                        color: hubHit.hitScore >= 70 ? '#10b981' : hubHit.hitScore >= 40 ? '#f59e0b' : '#ef4444',
                      }}>
                        {hubHit.hitScore}
                      </div>
                      <div style={{
                        fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase',
                        color: hubHit.verdict === 'high' ? '#10b981' : hubHit.verdict === 'medium' ? '#f59e0b' : '#ef4444',
                      }}>
                        {hubHit.verdict} potential
                      </div>
                      <div style={{ fontSize: '0.72rem', color: C.text.tertiary }}>
                        Confidence: {(hubHit.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '0.8rem', color: C.text.tertiary, marginBottom: '0.4rem' }}>Platform Fit</h3>
                      {Object.entries(hubHit.marketAnalysis.platformFit).map(([platform, score]) => (
                        <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <span style={{ fontSize: '0.78rem', color: C.text.secondary, width: '90px' }}>{platform}</span>
                          <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: C.background.tertiary }}>
                            <div style={{ width: `${score}%`, height: '100%', borderRadius: '3px', background: C.primary.cyan }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', color: C.text.secondary, width: '30px' }}>{score}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {hubHit.comparables.length > 0 && (
                    <div style={{ marginBottom: '0.75rem' }}>
                      <h3 style={{ fontSize: '0.8rem', color: C.text.tertiary, marginBottom: '0.4rem' }}>Comparable Tracks</h3>
                      {hubHit.comparables.map((c, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                          <Music size={14} style={{ color: C.primary.cyan }} />
                          <span style={{ fontSize: '0.82rem', color: C.text.primary, fontWeight: 500 }}>{c.title}</span>
                          <span style={{ fontSize: '0.75rem', color: C.text.tertiary }}>by {c.artist}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p style={{ fontSize: '0.85rem', color: C.text.primary, fontStyle: 'italic', margin: 0 }}>{hubHit.recommendation}</p>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
