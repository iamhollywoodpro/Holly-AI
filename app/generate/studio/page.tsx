'use client';

/**
 * HOLLY Generation Studio — Phase 11
 *
 * Full multi-modal creation suite:
 *   - Image generation (Holly Modal FLUX.1-schnell → Pollinations fallback — 100% free)
 *   - Video generation (Holly Modal CogVideoX-5B)
 *   - Music video creation (storyboard + frame generation)
 *   - Audio-visual sync planner
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'image' | 'video' | 'music-video' | 'av-sync';
type ImageModel = 'auto' | 'flux-1-1-pro' | 'flux-schnell' | 'flux-dev' | 'stable-diffusion-xl' | 'pollinations';
type VideoModel = 'auto' | 'cogvideox';
type AspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
type MusicVideoStyle = 'cinematic' | 'visualizer' | 'lyric-video' | 'performance' | 'abstract' | 'animated' | 'documentary';

interface GenerationResult {
  success: boolean;
  url?: string;
  modality?: string;
  provider?: string;
  model?: string;
  duration?: number;
  estimatedCost?: number;
  error?: string;
  suggestion?: string;
  metadata?: Record<string, unknown>;
}

interface MusicVideoScene {
  sceneNumber: number;
  title: string;
  description: string;
  imageUrl?: string;
  videoUrl?: string;
  mood: string;
  colorNotes: string;
  generationStatus: 'pending' | 'generating' | 'complete' | 'failed';
}

interface MusicVideoResult {
  projectId: string;
  songTitle: string;
  style: string;
  mood: string;
  concept: string;
  colorPalette: string;
  directorNotes: string;
  scenes: MusicVideoScene[];
  generationComplete: boolean;
  technicalSpec: { aspectRatio: string; resolution: string; colorGrade: string; editingStyle: string; frameRate?: number };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GenerationStudio() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('image');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [musicVideoResult, setMusicVideoResult] = useState<MusicVideoResult | null>(null);
  const [providerStatus, setProviderStatus] = useState<Record<string, unknown> | null>(null);

  // Image state
  const [imagePrompt, setImagePrompt] = useState('');
  const [imageModel, setImageModel] = useState<ImageModel>('auto');
  const [imageAspect, setImageAspect] = useState<AspectRatio>('1:1');
  const [imageStyle, setImageStyle] = useState('');
  const [imageNegative, setImageNegative] = useState('');

  // Video state
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoModel, setVideoModel] = useState<VideoModel>('auto');
  const [videoAspect, setVideoAspect] = useState<AspectRatio>('16:9');
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoCameraMovement, setVideoCameraMovement] = useState('');

  // Music video state
  const [mvSongTitle, setMvSongTitle] = useState('');
  const [mvSongPrompt, setMvSongPrompt] = useState('');
  const [mvStyle, setMvStyle] = useState<MusicVideoStyle>('cinematic');
  const [mvMood, setMvMood] = useState('');
  const [mvArtistRef, setMvArtistRef] = useState('');
  const [mvSceneCount, setMvSceneCount] = useState(4);
  const [mvGenerateVideo, setMvGenerateVideo] = useState(false);

  // AV Sync state
  const [avConcept, setAvConcept] = useState('');
  const [avSyncMode, setAvSyncMode] = useState<'beat' | 'lyric' | 'ambient'>('beat');

  // Load provider status
  useEffect(() => {
    fetch('/api/multimodal/status')
      .then(r => r.json())
      .then(setProviderStatus)
      .catch(() => null);
  }, []);

  // Auth redirect
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/');
    }
  }, [isLoaded, isSignedIn, router]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const generateImage = useCallback(async () => {
    if (!imagePrompt.trim()) return;
    setIsGenerating(true);
    setResult(null);
    try {
      const res = await fetch('/api/multimodal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modality: 'image',
          prompt: imagePrompt,
          model: imageModel,
          aspectRatio: imageAspect,
          style: imageStyle || undefined,
          negativePrompt: imageNegative || undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: 'Network error. Please try again.' });
    } finally {
      setIsGenerating(false);
    }
  }, [imagePrompt, imageModel, imageAspect, imageStyle, imageNegative]);

  const generateVideo = useCallback(async () => {
    if (!videoPrompt.trim()) return;
    setIsGenerating(true);
    setResult(null);
    try {
      const res = await fetch('/api/multimodal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modality: 'video',
          prompt: videoPrompt,
          model: videoModel,
          aspectRatio: videoAspect,
          duration: videoDuration,
          cameraMovement: videoCameraMovement || undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: 'Network error. Please try again.' });
    } finally {
      setIsGenerating(false);
    }
  }, [videoPrompt, videoModel, videoAspect, videoDuration, videoCameraMovement]);

  const generateMusicVideo = useCallback(async () => {
    if (!mvSongPrompt.trim()) return;
    setIsGenerating(true);
    setMusicVideoResult(null);
    try {
      const res = await fetch('/api/multimodal/music-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songTitle: mvSongTitle || 'Untitled',
          songPrompt: mvSongPrompt,
          style: mvStyle,
          mood: mvMood || undefined,
          artistReference: mvArtistRef || undefined,
          sceneCount: mvSceneCount,
          generateVideo: mvGenerateVideo,
          aspectRatio: '16:9',
        }),
      });
      const data = await res.json();
      if (data.success && data.musicVideo) {
        setMusicVideoResult(data.musicVideo);
      } else {
        setResult({ success: false, error: data.error || 'Music video generation failed' });
      }
    } catch {
      setResult({ success: false, error: 'Network error. Please try again.' });
    } finally {
      setIsGenerating(false);
    }
  }, [mvSongTitle, mvSongPrompt, mvStyle, mvMood, mvArtistRef, mvSceneCount, mvGenerateVideo]);

  const generateAVSync = useCallback(async () => {
    if (!avConcept.trim()) return;
    setIsGenerating(true);
    setResult(null);
    try {
      const res = await fetch('/api/multimodal/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modality: 'audio_visual',
          prompt: avConcept,
          syncMode: avSyncMode,
          audioUrl: 'placeholder',
          videoUrl: 'placeholder',
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: 'Network error. Please try again.' });
    } finally {
      setIsGenerating(false);
    }
  }, [avConcept, avSyncMode]);

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/chat')}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              ← Back to HOLLY
            </button>
            <div className="w-px h-5 bg-gray-700" />
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-xs font-bold">H</span>
              </div>
              <span className="font-semibold text-white">Generation Studio</span>
              <span className="text-xs bg-purple-900/60 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/40">
                Phase 11
              </span>
            </div>
          </div>

          {providerStatus && (
            <ProviderStatusBadge status={providerStatus} />
          )}
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 p-1 bg-gray-900 rounded-xl border border-gray-800 w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id as Tab); setResult(null); setMusicVideoResult(null); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Controls */}
          <div>
            <AnimatePresence mode="wait">
              {activeTab === 'image' && (
                <motion.div
                  key="image"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  <SectionHeader
                    title="Image Generation"
                    subtitle="Create stunning visuals using FLUX, Stable Diffusion, or Pollinations — 100% FREE"
                    icon="🎨"
                  />

                  <PromptTextarea
                    value={imagePrompt}
                    onChange={setImagePrompt}
                    placeholder="Describe the image you want to create...&#10;&#10;Example: A midnight recording session in a vintage Los Angeles studio, warm incandescent light, analog tape machines, a lone musician at a grand piano, cinematic photography, film grain"
                    rows={5}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <SelectField
                      label="Model"
                      value={imageModel}
                      onChange={v => setImageModel(v as ImageModel)}
                      options={IMAGE_MODELS}
                    />
                    <SelectField
                      label="Aspect Ratio"
                      value={imageAspect}
                      onChange={v => setImageAspect(v as AspectRatio)}
                      options={ASPECT_RATIOS}
                    />
                  </div>

                  <InputField
                    label="Style (optional)"
                    value={imageStyle}
                    onChange={setImageStyle}
                    placeholder="e.g. cinematic, dark fantasy, watercolor, anime..."
                  />

                  <InputField
                    label="Negative Prompt (optional)"
                    value={imageNegative}
                    onChange={setImageNegative}
                    placeholder="What to avoid: blur, text, watermark..."
                  />

                  <GenerateButton
                    onClick={generateImage}
                    loading={isGenerating}
                    disabled={!imagePrompt.trim()}
                    label="Generate Image"
                    icon="🎨"
                  />
                </motion.div>
              )}

              {activeTab === 'video' && (
                <motion.div
                  key="video"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  <SectionHeader
                    title="Video Generation"
                    subtitle="Create video clips with Holly's CogVideoX-5B GPU on Modal"
                    icon="🎬"
                  />

                  {/* Cold-start latency notice */}
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
                    <span className="text-lg leading-none mt-0.5">⏱️</span>
                    <div>
                      <span className="font-semibold">Cold-start notice:</span>{' '}
                      CogVideoX-5B on Modal GPU may take <strong>60–90 seconds</strong> to respond on the first request
                      after idle. Subsequent requests are fast (~15–30 s). If the request times out, try again — the
                      GPU will already be warm.
                    </div>
                  </div>

                  <PromptTextarea
                    value={videoPrompt}
                    onChange={setVideoPrompt}
                    placeholder="Describe the video you want...&#10;&#10;Example: A Black female vocalist performing in a smoky jazz club, low-key lighting, intimate close-ups, the music visible on her face, slow dolly push-in, cinematic"
                    rows={5}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <SelectField
                      label="Model"
                      value={videoModel}
                      onChange={v => setVideoModel(v as VideoModel)}
                      options={VIDEO_MODELS}
                    />
                    <SelectField
                      label="Aspect Ratio"
                      value={videoAspect}
                      onChange={v => setVideoAspect(v as AspectRatio)}
                      options={ASPECT_RATIOS}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">
                      Duration: <span className="text-purple-400">{videoDuration}s</span>
                    </label>
                    <input
                      type="range"
                      min={3}
                      max={15}
                      value={videoDuration}
                      onChange={e => setVideoDuration(Number(e.target.value))}
                      className="w-full accent-purple-500"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>3s</span>
                      <span>15s</span>
                    </div>
                  </div>

                  <SelectField
                    label="Camera Movement (optional)"
                    value={videoCameraMovement}
                    onChange={setVideoCameraMovement}
                    options={CAMERA_MOVEMENTS}
                  />

                  <GenerateButton
                    onClick={generateVideo}
                    loading={isGenerating}
                    disabled={!videoPrompt.trim()}
                    label="Generate Video"
                    icon="🎬"
                  />

                  <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg text-xs text-amber-300">
                    ⚡ Video generation requires FAL_KEY or REPLICATE_API_KEY. Videos may take 2–5 minutes to generate.
                  </div>
                </motion.div>
              )}

              {activeTab === 'music-video' && (
                <motion.div
                  key="music-video"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  <SectionHeader
                    title="Music Video Creator"
                    subtitle="Build a full visual storyboard with key frame images for your song"
                    icon="🎥"
                  />

                  <InputField
                    label="Song Title"
                    value={mvSongTitle}
                    onChange={setMvSongTitle}
                    placeholder="e.g. Purple Rain, Midnight Garden..."
                  />

                  <PromptTextarea
                    value={mvSongPrompt}
                    onChange={setMvSongPrompt}
                    placeholder="Describe your song's concept, lyrics, or emotional themes...&#10;&#10;Example: A slow R&B ballad about long-distance love, missing someone at 3am, urban isolation, warmth in memory, building to a powerful emotional release in the chorus"
                    rows={4}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <SelectField
                      label="Video Style"
                      value={mvStyle}
                      onChange={v => setMvStyle(v as MusicVideoStyle)}
                      options={MV_STYLES}
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-300">
                        Scenes: <span className="text-purple-400">{mvSceneCount}</span>
                      </label>
                      <input
                        type="range"
                        min={2}
                        max={8}
                        value={mvSceneCount}
                        onChange={e => setMvSceneCount(Number(e.target.value))}
                        className="w-full accent-purple-500"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>2</span>
                        <span>8</span>
                      </div>
                    </div>
                  </div>

                  <InputField
                    label="Mood / Emotional Tone (optional)"
                    value={mvMood}
                    onChange={setMvMood}
                    placeholder="e.g. triumphant melancholy, sensual groove, spiritual awakening..."
                  />

                  <InputField
                    label="Visual Reference (optional)"
                    value={mvArtistRef}
                    onChange={setMvArtistRef}
                    placeholder="e.g. Prince's Purple Rain era, 90s Hype Williams, Wong Kar-wai films..."
                  />

                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div
                      onClick={() => setMvGenerateVideo(!mvGenerateVideo)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        mvGenerateVideo ? 'bg-purple-600' : 'bg-gray-700'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                        mvGenerateVideo ? 'left-5.5 translate-x-0.5' : 'left-0.5'
                      }`} />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-200">Generate video clips</span>
                      <span className="text-xs text-gray-500 block">Slower + more expensive. Requires FAL_KEY.</span>
                    </div>
                  </label>

                  <GenerateButton
                    onClick={generateMusicVideo}
                    loading={isGenerating}
                    disabled={!mvSongPrompt.trim()}
                    label="Create Music Video"
                    icon="🎥"
                  />
                </motion.div>
              )}

              {activeTab === 'av-sync' && (
                <motion.div
                  key="av-sync"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-5"
                >
                  <SectionHeader
                    title="Audio-Visual Sync Planner"
                    subtitle="Design a synchronization strategy for your audio and visual elements"
                    icon="🔊"
                  />

                  <PromptTextarea
                    value={avConcept}
                    onChange={setAvConcept}
                    placeholder="Describe your audio-visual concept...&#10;&#10;Example: A high-energy trap track with heavy 808s and fast hi-hats — I want the visuals to reflect the rhythm, with hard cuts on the kick and abstract shapes reacting to the high frequencies"
                    rows={5}
                  />

                  <div className="space-y-3">
                    <label className="text-sm font-medium text-gray-300">Sync Mode</label>
                    <div className="grid grid-cols-3 gap-3">
                      {AV_SYNC_MODES.map(mode => (
                        <button
                          key={mode.id}
                          onClick={() => setAvSyncMode(mode.id as 'beat' | 'lyric' | 'ambient')}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            avSyncMode === mode.id
                              ? 'border-purple-500 bg-purple-950/50 text-white'
                              : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600'
                          }`}
                        >
                          <div className="text-xl mb-1">{mode.icon}</div>
                          <div className="text-sm font-medium">{mode.label}</div>
                          <div className="text-xs mt-1 opacity-70">{mode.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <GenerateButton
                    onClick={generateAVSync}
                    loading={isGenerating}
                    disabled={!avConcept.trim()}
                    label="Generate Sync Plan"
                    icon="🔊"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Results */}
          <div>
            <AnimatePresence mode="wait">
              {isGenerating && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center gap-6 p-12 bg-gray-900/50 rounded-2xl border border-gray-800"
                >
                  <div className="w-16 h-16 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
                  <div className="text-center">
                    <p className="text-white font-medium">Generating{activeTab === 'video' ? ' (may take 2–5 min)' : ''}...</p>
                    <p className="text-gray-400 text-sm mt-1">HOLLY is creating your vision</p>
                  </div>
                  <GeneratingMessages tab={activeTab} />
                </motion.div>
              )}

              {!isGenerating && result && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  {result.success ? (
                    <SuccessResult result={result} activeTab={activeTab} />
                  ) : (
                    <ErrorResult result={result} />
                  )}
                </motion.div>
              )}

              {!isGenerating && musicVideoResult && (
                <motion.div
                  key="mv-result"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <MusicVideoResultView result={musicVideoResult} />
                </motion.div>
              )}

              {!isGenerating && !result && !musicVideoResult && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center gap-4 p-12 bg-gray-900/30 rounded-2xl border border-dashed border-gray-700"
                >
                  <div className="text-5xl opacity-40">
                    {activeTab === 'image' ? '🎨' : activeTab === 'video' ? '🎬' : activeTab === 'music-video' ? '🎥' : '🔊'}
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 font-medium">Your creation will appear here</p>
                    <p className="text-gray-600 text-sm mt-1">Fill in the prompt and hit Generate</p>
                  </div>
                  {providerStatus && <ProvidersPreview status={providerStatus} />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-10 h-10 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
    </div>
  );
}

function SectionHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: string }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h2>
      <p className="text-gray-400 text-sm mt-1">{subtitle}</p>
    </div>
  );
}

function PromptTextarea({ value, onChange, placeholder, rows }: {
  value: string; onChange: (v: string) => void; placeholder: string; rows: number;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">Prompt</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm resize-none focus:outline-none focus:border-purple-500 transition-colors"
      />
    </div>
  );
}

function InputField({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-300">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors appearance-none"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function GenerateButton({ onClick, loading, disabled, label, icon }: {
  onClick: () => void; loading: boolean; disabled: boolean; label: string; icon: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg"
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>Generating...</span>
        </>
      ) : (
        <>
          <span>{icon}</span>
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

function SuccessResult({ result, activeTab }: { result: GenerationResult; activeTab: Tab }) {
  return (
    <div className="space-y-4">
      {/* Image result */}
      {result.url && activeTab === 'image' && (
        <div className="rounded-2xl overflow-hidden border border-gray-700">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.url}
            alt="Generated image"
            className="w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      {/* Video result */}
      {result.url && activeTab === 'video' && (
        <div className="rounded-2xl overflow-hidden border border-gray-700 bg-black">
          <video
            src={result.url}
            controls
            autoPlay
            loop
            muted
            className="w-full"
          />
        </div>
      )}

      {/* AV Sync plan */}
      {activeTab === 'av-sync' && result.metadata && (
        <AVSyncPlanView plan={result.metadata as Record<string, unknown>} />
      )}

      {/* Metadata */}
      <div className="p-4 bg-gray-900/60 rounded-xl border border-gray-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-green-400 font-medium text-sm flex items-center gap-1">
            ✓ Generated successfully
          </span>
          {result.estimatedCost !== undefined && (
            <span className="text-gray-400 text-xs">
              ~${result.estimatedCost.toFixed(3)}
            </span>
          )}
        </div>
        {result.provider && (
          <p className="text-xs text-gray-500">
            Provider: <span className="text-gray-300">{result.provider}</span>
            {result.model && <> · Model: <span className="text-gray-300">{result.model}</span></>}
          </p>
        )}
        {result.url && (
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-400 hover:text-purple-300 underline block"
          >
            Open in new tab ↗
          </a>
        )}
      </div>
    </div>
  );
}

function ErrorResult({ result }: { result: GenerationResult }) {
  return (
    <div className="p-5 bg-red-950/30 border border-red-800/50 rounded-2xl space-y-3">
      <p className="text-red-400 font-medium flex items-center gap-2">
        <span>⚠</span> Generation Failed
      </p>
      <p className="text-red-300 text-sm">{result.error}</p>
      {result.suggestion && (
        <p className="text-amber-300 text-sm p-3 bg-amber-950/30 rounded-lg border border-amber-800/40">
          💡 {result.suggestion}
        </p>
      )}
    </div>
  );
}

function MusicVideoResultView({ result }: { result: MusicVideoResult }) {
  const [activeScene, setActiveScene] = useState(0);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-gradient-to-br from-purple-950/50 to-pink-950/30 rounded-2xl border border-purple-700/40">
        <h3 className="font-bold text-lg text-white">{result.songTitle}</h3>
        <p className="text-purple-300 text-sm mt-1">{result.style} · {result.mood}</p>
        <p className="text-gray-400 text-xs mt-2">{result.concept}</p>
      </div>

      {/* Scene Gallery */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gray-300">Storyboard — {result.scenes.length} Scenes</h4>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {result.scenes.map((scene, i) => (
            <button
              key={i}
              onClick={() => setActiveScene(i)}
              className={`flex-shrink-0 w-20 h-20 rounded-xl border overflow-hidden transition-all ${
                activeScene === i ? 'border-purple-500 scale-105' : 'border-gray-700 opacity-70 hover:opacity-100'
              }`}
            >
              {scene.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={scene.imageUrl} alt={scene.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-xs text-gray-500">
                  {scene.generationStatus === 'failed' ? '✗' : scene.sceneNumber}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Active scene detail */}
        {result.scenes[activeScene] && (
          <div className="rounded-xl overflow-hidden border border-gray-700">
            {result.scenes[activeScene].imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.scenes[activeScene].imageUrl}
                alt={result.scenes[activeScene].title}
                className="w-full object-cover max-h-64"
              />
            )}
            <div className="p-4 bg-gray-900/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-white">
                  Scene {result.scenes[activeScene].sceneNumber}: {result.scenes[activeScene].title}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  result.scenes[activeScene].generationStatus === 'complete'
                    ? 'bg-green-900/60 text-green-300'
                    : 'bg-gray-800 text-gray-400'
                }`}>
                  {result.scenes[activeScene].generationStatus}
                </span>
              </div>
              <p className="text-gray-400 text-xs">{result.scenes[activeScene].description}</p>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>Mood: {result.scenes[activeScene].mood}</span>
                <span>Color: {result.scenes[activeScene].colorNotes}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Director Notes */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium text-gray-300 hover:text-white list-none flex items-center gap-2 p-3 bg-gray-900/50 rounded-xl border border-gray-800">
          <span className="group-open:rotate-90 transition-transform">›</span>
          Director&apos;s Notes
        </summary>
        <div className="mt-2 p-4 bg-gray-900/30 rounded-xl border border-gray-800 text-xs text-gray-400 whitespace-pre-line">
          {result.directorNotes}
        </div>
      </details>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800">
          <div className="text-gray-500 mb-1">Color Palette</div>
          <div className="text-gray-200">{result.colorPalette}</div>
        </div>
        <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-800">
          <div className="text-gray-500 mb-1">Technical Spec</div>
          <div className="text-gray-200">{result.technicalSpec.resolution} · {result.technicalSpec.frameRate}fps</div>
        </div>
      </div>
    </div>
  );
}

function AVSyncPlanView({ plan }: { plan: Record<string, unknown> }) {
  const syncPlan = plan.syncPlan as Record<string, unknown> | undefined;
  if (!syncPlan) return null;

  return (
    <div className="p-5 bg-gray-900/70 rounded-2xl border border-gray-700 space-y-4">
      <h3 className="font-bold text-white flex items-center gap-2">
        🔊 Sync Plan: {String(syncPlan.type || '').replace(/_/g, ' ').toUpperCase()}
      </h3>
      <p className="text-gray-300 text-sm">{String(syncPlan.description || '')}</p>
      <div className="space-y-2">
        {Object.entries(syncPlan)
          .filter(([k]) => !['type', 'description', 'concept'].includes(k))
          .map(([k, v]) => (
            <div key={k} className="flex gap-3 text-sm">
              <span className="text-purple-400 font-medium capitalize min-w-28">
                {k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:
              </span>
              <span className="text-gray-300">{String(v)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

function ProviderStatusBadge({ status }: { status: Record<string, unknown> }) {
  const caps = status.capabilities as Record<string, boolean> | undefined;
  if (!caps) return null;

  const available = Object.values(caps).filter(Boolean).length;
  const total = Object.keys(caps).length;

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-2 h-2 rounded-full ${available > 3 ? 'bg-green-400' : available > 1 ? 'bg-yellow-400' : 'bg-red-400'}`} />
      <span className="text-gray-400">{available}/{total} capabilities</span>
    </div>
  );
}

function ProvidersPreview({ status }: { status: Record<string, unknown> }) {
  const keys = (status.keyConfiguration as { configured?: string[]; missing?: Array<{ key: string }> } | undefined);
  if (!keys) return null;

  return (
    <div className="text-center space-y-2">
      {(keys.configured?.length ?? 0) > 0 && (
        <p className="text-xs text-green-400">
          ✓ {keys.configured?.join(', ')} configured
        </p>
      )}
      {(keys.missing?.length ?? 0) > 0 && (
        <p className="text-xs text-gray-500">
          Add {keys.missing?.slice(0, 2).map(k => k.key).join(', ')} for more power
        </p>
      )}
    </div>
  );
}

function GeneratingMessages({ tab }: { tab: Tab }) {
  const messages: Record<Tab, string[]> = {
    image: [
      'Composing the visual elements...',
      'Applying the aesthetic layer...',
      'Rendering the final image...',
    ],
    video: [
      'Initializing video generation pipeline...',
      'Building temporal coherence...',
      'Rendering frames (this takes a few minutes)...',
    ],
    'music-video': [
      'Analyzing your song concept...',
      'Building the storyboard...',
      'Generating key frame images...',
    ],
    'av-sync': [
      'Analyzing the sync requirements...',
      'Designing the synchronization strategy...',
    ],
  };

  const [idx, setIdx] = useState(0);
  const msgList = messages[tab] || messages.image;

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % msgList.length), 2500);
    return () => clearInterval(t);
  }, [msgList]);

  return (
    <motion.p
      key={idx}
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -5 }}
      className="text-gray-500 text-sm text-center"
    >
      {msgList[idx]}
    </motion.p>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'image', label: 'Image', icon: '🎨' },
  { id: 'video', label: 'Video', icon: '🎬' },
  { id: 'music-video', label: 'Music Video', icon: '🎥' },
  { id: 'av-sync', label: 'AV Sync', icon: '🔊' },
] as const;

const IMAGE_MODELS = [
  { value: 'auto', label: 'Auto (Best Available)' },
  { value: 'flux-1-1-pro', label: 'FLUX 1.1 Pro — Best quality' },
  { value: 'flux-schnell', label: 'FLUX Schnell — Fast' },
  { value: 'flux-dev', label: 'FLUX Dev — Balanced' },
  { value: 'stable-diffusion-xl', label: 'Stable Diffusion XL' },
  { value: 'pollinations', label: 'Pollinations FLUX — Free, no key' },
];

const VIDEO_MODELS = [
  { value: 'auto', label: 'Auto (Best Available)' },
  { value: 'cogvideox', label: 'CogVideoX-5B (Holly Modal GPU)' },
];

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1 — Square' },
  { value: '16:9', label: '16:9 — Landscape' },
  { value: '9:16', label: '9:16 — Portrait / Story' },
  { value: '4:3', label: '4:3 — Classic' },
  { value: '3:4', label: '3:4 — Portrait' },
];

const MV_STYLES = [
  { value: 'cinematic', label: 'Cinematic — Film quality' },
  { value: 'visualizer', label: 'Visualizer — Abstract/reactive' },
  { value: 'lyric-video', label: 'Lyric Video — Text forward' },
  { value: 'performance', label: 'Performance — Live concert' },
  { value: 'abstract', label: 'Abstract — Pure visual art' },
  { value: 'animated', label: 'Animated — Illustrated' },
  { value: 'documentary', label: 'Documentary — Authentic' },
];

const CAMERA_MOVEMENTS = [
  { value: '', label: 'None (auto)' },
  { value: 'slow pan', label: 'Slow Pan' },
  { value: 'tracking shot', label: 'Tracking Shot' },
  { value: 'crane shot', label: 'Crane Shot' },
  { value: 'dolly zoom', label: 'Dolly Zoom' },
  { value: 'handheld', label: 'Handheld' },
  { value: 'static', label: 'Static' },
  { value: 'aerial', label: 'Aerial / Drone' },
];

const AV_SYNC_MODES = [
  {
    id: 'beat',
    icon: '🥁',
    label: 'Beat Sync',
    description: 'Cuts and flashes aligned to kick, snare, and rhythm',
  },
  {
    id: 'lyric',
    icon: '🎤',
    label: 'Lyric Sync',
    description: 'Kinetic typography timed to vocal phrasing',
  },
  {
    id: 'ambient',
    icon: '🌊',
    label: 'Ambient Sync',
    description: 'Visual mood follows energy envelope and harmonic shifts',
  },
];
