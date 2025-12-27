'use client';

import { useState } from 'react';
import { 
  Mic2, Upload, FileAudio, Sparkles, TrendingUp, Target, 
  Award, AlertCircle, CheckCircle, Loader2, Music, ArrowLeft
} from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface AnalysisResult {
  overall_score: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  market_potential: string;
  target_audience: string;
  genre_fit: string;
  production_quality: number;
  commercial_viability: number;
  artistic_merit: number;
}

export default function AuraLabPage() {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setAudioUrl('');
      setError('');
    }
  };

  const handleAnalyze = async () => {
    if (!file && !audioUrl) {
      setError('Please upload a file or provide an audio URL');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setAnalysis(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else {
        formData.append('audioUrl', audioUrl);
      }

      const response = await fetch('/api/aura-analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

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

  const ScoreCircle = ({ score, label }: { score: number; label: string }) => (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        border: `4px solid ${cyberpunkTheme.colors.primary.cyan}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 0.5rem',
        background: `conic-gradient(${cyberpunkTheme.colors.primary.cyan} ${score * 3.6}deg, ${cyberpunkTheme.colors.background.tertiary} 0deg)`,
      }}>
        <div style={{
          width: '85px',
          height: '85px',
          borderRadius: '50%',
          background: cyberpunkTheme.colors.background.secondary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          color: cyberpunkTheme.colors.primary.cyan,
        }}>
          {score}
        </div>
      </div>
      <div style={{
        fontSize: '0.85rem',
        color: cyberpunkTheme.colors.text.secondary,
        fontWeight: 500,
      }}>
        {label}
      </div>
    </div>
  );

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
            <Mic2 size={32} style={{ color: cyberpunkTheme.colors.primary.pink }} />
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              background: cyberpunkTheme.colors.gradients.holographic,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              AURA A&R Lab
            </h1>
          </div>
          <p style={{ color: cyberpunkTheme.colors.text.secondary, fontSize: '0.95rem' }}>
            Professional music analysis powered by AI - Get expert feedback on your tracks
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: analysis ? '1fr 2fr' : '1fr', gap: '2rem' }}>
          {/* Left: Upload & Controls */}
          <div>
            <div style={{
              padding: '2rem',
              borderRadius: '16px',
              background: cyberpunkTheme.colors.background.secondary,
              border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
            }}>
              <h2 style={{
                fontSize: '1.25rem',
                fontWeight: 600,
                marginBottom: '1.5rem',
                color: cyberpunkTheme.colors.text.primary,
              }}>
                Upload Track
              </h2>

              {/* File Upload */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  padding: '3rem 2rem',
                  borderRadius: '12px',
                  border: `2px dashed ${cyberpunkTheme.colors.border.primary}`,
                  background: cyberpunkTheme.colors.background.tertiary,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s',
                }}>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  {file ? (
                    <div>
                      <FileAudio size={48} style={{ margin: '0 auto 1rem', color: cyberpunkTheme.colors.primary.cyan }} />
                      <div style={{ color: cyberpunkTheme.colors.text.primary, fontWeight: 500 }}>
                        {file.name}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: cyberpunkTheme.colors.text.tertiary, marginTop: '0.25rem' }}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Upload size={48} style={{ margin: '0 auto 1rem', color: cyberpunkTheme.colors.text.tertiary }} />
                      <div style={{ color: cyberpunkTheme.colors.text.primary, fontWeight: 500, marginBottom: '0.5rem' }}>
                        Click to upload audio file
                      </div>
                      <div style={{ fontSize: '0.85rem', color: cyberpunkTheme.colors.text.tertiary }}>
                        MP3, WAV, FLAC, or other audio formats
                      </div>
                    </div>
                  )}
                </label>
              </div>

              {/* OR Divider */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                margin: '1.5rem 0',
              }}>
                <div style={{ flex: 1, height: '1px', background: cyberpunkTheme.colors.border.primary }} />
                <span style={{ color: cyberpunkTheme.colors.text.tertiary, fontSize: '0.85rem' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: cyberpunkTheme.colors.border.primary }} />
              </div>

              {/* URL Input */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: cyberpunkTheme.colors.text.primary,
                }}>
                  Audio URL
                </label>
                <input
                  type="text"
                  value={audioUrl}
                  onChange={(e) => {
                    setAudioUrl(e.target.value);
                    setFile(null);
                    setError('');
                  }}
                  placeholder="https://example.com/track.mp3"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                    background: cyberpunkTheme.colors.background.tertiary,
                    color: cyberpunkTheme.colors.text.primary,
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: '#ef444420',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  fontSize: '0.85rem',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                }}>
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Analyze Button */}
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || (!file && !audioUrl)}
                style={{
                  width: '100%',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: 'none',
                  background: isAnalyzing || (!file && !audioUrl) 
                    ? cyberpunkTheme.colors.background.tertiary 
                    : cyberpunkTheme.colors.gradients.primary,
                  color: '#fff',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: isAnalyzing || (!file && !audioUrl) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  transition: 'all 0.2s',
                }}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Analyzing Track...
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    Analyze Track
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right: Analysis Results */}
          {analysis && (
            <div>
              {/* Overall Scores */}
              <div style={{
                padding: '2rem',
                borderRadius: '16px',
                background: cyberpunkTheme.colors.background.secondary,
                border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                marginBottom: '1.5rem',
              }}>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  marginBottom: '2rem',
                  color: cyberpunkTheme.colors.text.primary,
                }}>
                  Overall Analysis
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '2rem' }}>
                  <ScoreCircle score={analysis.overall_score} label="Overall" />
                  <ScoreCircle score={analysis.production_quality} label="Production" />
                  <ScoreCircle score={analysis.commercial_viability} label="Commercial" />
                  <ScoreCircle score={analysis.artistic_merit} label="Artistic" />
                </div>
              </div>

              {/* Market Info */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                marginBottom: '1.5rem',
              }}>
                {[
                  { icon: Target, label: 'Target Audience', value: analysis.target_audience },
                  { icon: TrendingUp, label: 'Market Potential', value: analysis.market_potential },
                  { icon: Music, label: 'Genre Fit', value: analysis.genre_fit },
                ].map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '1.5rem',
                      borderRadius: '12px',
                      background: cyberpunkTheme.colors.background.secondary,
                      border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                    }}
                  >
                    <item.icon size={24} style={{ color: cyberpunkTheme.colors.primary.cyan, marginBottom: '0.75rem' }} />
                    <div style={{
                      fontSize: '0.8rem',
                      color: cyberpunkTheme.colors.text.tertiary,
                      marginBottom: '0.25rem',
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: cyberpunkTheme.colors.text.primary,
                    }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>

              {/* Strengths */}
              <div style={{
                padding: '1.5rem',
                borderRadius: '12px',
                background: cyberpunkTheme.colors.background.secondary,
                border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                marginBottom: '1rem',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}>
                  <CheckCircle size={20} style={{ color: '#10b981' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: cyberpunkTheme.colors.text.primary }}>
                    Strengths
                  </h3>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: cyberpunkTheme.colors.text.secondary }}>
                  {analysis.strengths.map((strength, i) => (
                    <li key={i} style={{ marginBottom: '0.5rem' }}>{strength}</li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div style={{
                padding: '1.5rem',
                borderRadius: '12px',
                background: cyberpunkTheme.colors.background.secondary,
                border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                marginBottom: '1rem',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}>
                  <AlertCircle size={20} style={{ color: '#ef4444' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: cyberpunkTheme.colors.text.primary }}>
                    Areas for Improvement
                  </h3>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: cyberpunkTheme.colors.text.secondary }}>
                  {analysis.weaknesses.map((weakness, i) => (
                    <li key={i} style={{ marginBottom: '0.5rem' }}>{weakness}</li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div style={{
                padding: '1.5rem',
                borderRadius: '12px',
                background: cyberpunkTheme.colors.background.secondary,
                border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '1rem',
                }}>
                  <Award size={20} style={{ color: cyberpunkTheme.colors.primary.pink }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: cyberpunkTheme.colors.text.primary }}>
                    Recommendations
                  </h3>
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.5rem', color: cyberpunkTheme.colors.text.secondary }}>
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i} style={{ marginBottom: '0.5rem' }}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
