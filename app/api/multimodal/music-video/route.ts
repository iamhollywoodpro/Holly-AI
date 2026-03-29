/**
 * HOLLY Music Video Generation API — Phase 11
 *
 * POST /api/multimodal/music-video
 *
 * Orchestrates full music video creation:
 *   1. Parse song concept, style, mood
 *   2. Generate visual scene descriptions (storyboard)
 *   3. Generate key frame images (FLUX via Fal.ai or Pollinations \u2014 free)
 *   4. Optionally generate video clips per scene (Kling / Wan / Replicate)
 *   5. Return structured music video package
 *
 * Body:
 *   songTitle?: string
 *   songPrompt: string          — description of song or lyrics excerpt
 *   style: MusicVideoStyle      — cinematic | visualizer | lyric-video | performance | abstract | animated | documentary
 *   mood?: string               — emotional tone
 *   artistReference?: string    — visual inspiration (e.g. "Prince's Purple Rain era")
 *   colorPalette?: string       — color direction
 *   sceneCount?: number         — 3–8 key scenes (default 4)
 *   generateVideo?: boolean     — also generate video clips (slower, costs more)
 *   audioUrl?: string           — uploaded audio for sync metadata
 *   aspectRatio?: string        — '16:9' (default) | '9:16' | '1:1'
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  generateImage,
  generateVideo,
  type ImageGenerationRequest,
  type VideoGenerationRequest,
  type MusicVideoStyle,
  type AspectRatio,
} from '@/lib/multimodal/generation-engine';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MusicVideoScene {
  sceneNumber: number;
  title: string;
  description: string;
  imagePrompt: string;
  videoPrompt?: string;
  duration: number;      // seconds
  mood: string;
  colorNotes: string;
  cameraMovement?: string;
  imageUrl?: string;
  videoUrl?: string;
  generationStatus: 'pending' | 'generating' | 'complete' | 'failed';
}

interface MusicVideoPackage {
  projectId: string;
  songTitle: string;
  style: MusicVideoStyle;
  mood: string;
  concept: string;
  colorPalette: string;
  totalDuration: number;
  scenes: MusicVideoScene[];
  directorNotes: string;
  technicalSpec: {
    aspectRatio: AspectRatio;
    frameRate: number;
    resolution: string;
    colorGrade: string;
    editingStyle: string;
  };
  generationComplete: boolean;
  audioUrl?: string;
}

// ─── POST Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth
  let userId: string | null = null;
  try {
    const session = await auth();
    userId = session?.userId ?? null;
  } catch {
    userId = process.env.NODE_ENV === 'development' ? 'dev-user' : null;
  }

  if (!userId) {
    return NextResponse.json(
      { error: 'Authentication required', code: 'UNAUTHENTICATED' },
      { status: 401 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const songPrompt = (body.songPrompt as string | undefined)?.trim();
  if (!songPrompt) {
    return NextResponse.json({ error: 'songPrompt is required' }, { status: 400 });
  }

  const style = (body.style as MusicVideoStyle) || 'cinematic';
  const songTitle = (body.songTitle as string) || 'Untitled';
  const mood = (body.mood as string) || detectMood(songPrompt);
  const colorPalette = (body.colorPalette as string) || deriveColorPalette(mood);
  const artistRef = body.artistReference as string | undefined;
  const sceneCount = Math.min(Math.max((body.sceneCount as number) || 4, 2), 8);
  const generateVideoClips = (body.generateVideo as boolean) || false;
  const audioUrl = body.audioUrl as string | undefined;
  const aspectRatio: AspectRatio = (body.aspectRatio as AspectRatio) || '16:9';

  try {
    // 1. Build storyboard
    const storyboard = buildStoryboard(
      songTitle,
      songPrompt,
      style,
      mood,
      colorPalette,
      artistRef,
      sceneCount,
      aspectRatio
    );

    // 2. Generate key frame images for each scene
    const scenesWithImages = await Promise.allSettled(
      storyboard.scenes.map(scene => generateSceneImage(scene, aspectRatio, artistRef))
    );

    // 3. Merge image results back
    const enrichedScenes: MusicVideoScene[] = storyboard.scenes.map((scene, i) => {
      const imgResult = scenesWithImages[i];
      if (imgResult.status === 'fulfilled' && imgResult.value.success) {
        return {
          ...scene,
          imageUrl: imgResult.value.url,
          generationStatus: 'complete' as const,
        };
      }
      return { ...scene, generationStatus: 'failed' as const };
    });

    // 4. Optionally generate short video clips (expensive — user must opt in)
    if (generateVideoClips) {
      const clipPromises = enrichedScenes.map(scene =>
        generateSceneVideoClip(scene, aspectRatio)
      );
      const clipResults = await Promise.allSettled(clipPromises);

      clipResults.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value?.success) {
          enrichedScenes[i].videoUrl = res.value.url;
        }
      });
    }

    const packageResult: MusicVideoPackage = {
      ...storyboard,
      scenes: enrichedScenes,
      generationComplete: enrichedScenes.every(s => s.generationStatus === 'complete'),
      audioUrl,
    };

    return NextResponse.json({ success: true, musicVideo: packageResult });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Music video generation failed';
    console.error('[multimodal/music-video] Error:', message);
    return NextResponse.json({ error: message, code: 'MUSIC_VIDEO_FAILED' }, { status: 500 });
  }
}

// ─── Storyboard Builder ───────────────────────────────────────────────────────

function buildStoryboard(
  songTitle: string,
  songPrompt: string,
  style: MusicVideoStyle,
  mood: string,
  colorPalette: string,
  artistRef: string | undefined,
  sceneCount: number,
  aspectRatio: AspectRatio
): Omit<MusicVideoPackage, 'generationComplete' | 'audioUrl'> {
  const projectId = `mv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const styleConfig = STYLE_CONFIGS[style] || STYLE_CONFIGS.cinematic;
  const concept = deriveConceptStatement(songPrompt, style, mood);
  const directorNotes = buildDirectorNotes(songPrompt, style, mood, artistRef);

  const scenes = generateSceneDescriptions(
    songPrompt,
    style,
    mood,
    colorPalette,
    artistRef,
    sceneCount
  );

  return {
    projectId,
    songTitle,
    style,
    mood,
    concept,
    colorPalette,
    totalDuration: scenes.reduce((t, s) => t + s.duration, 0),
    scenes,
    directorNotes,
    technicalSpec: {
      aspectRatio,
      frameRate: 24,
      resolution: aspectRatio === '9:16' ? '1080x1920' : '1920x1080',
      colorGrade: styleConfig.colorGrade,
      editingStyle: styleConfig.editingStyle,
    },
  };
}

// ─── Scene Description Generation ────────────────────────────────────────────

function generateSceneDescriptions(
  songPrompt: string,
  style: MusicVideoStyle,
  mood: string,
  colorPalette: string,
  artistRef: string | undefined,
  count: number
): MusicVideoScene[] {
  const styleConfig = STYLE_CONFIGS[style] || STYLE_CONFIGS.cinematic;
  const artistSuffix = artistRef ? `, inspired by ${artistRef}` : '';

  // Scene arc: intro → build → climax → resolution
  const arcPositions = ['intro', 'build', 'pre_climax', 'climax', 'post_climax', 'resolution', 'outro', 'coda'];

  return Array.from({ length: count }, (_, i) => {
    const arcPos = arcPositions[Math.floor((i / (count - 1)) * (arcPositions.length - 1))] || 'climax';
    const arcConfig = ARC_CONFIGS[arcPos as keyof typeof ARC_CONFIGS] || ARC_CONFIGS.climax;

    const cameraMovement = styleConfig.cameraMovements[i % styleConfig.cameraMovements.length];

    const imagePrompt = buildImagePrompt(
      songPrompt, style, mood, colorPalette, arcConfig, cameraMovement, artistSuffix
    );

    const videoPrompt = buildVideoPrompt(
      songPrompt, style, mood, arcConfig, cameraMovement
    );

    return {
      sceneNumber: i + 1,
      title: arcConfig.title,
      description: arcConfig.description(songPrompt, mood),
      imagePrompt,
      videoPrompt,
      duration: arcConfig.duration,
      mood: arcConfig.mood(mood),
      colorNotes: arcConfig.colorNote(colorPalette),
      cameraMovement,
      generationStatus: 'pending' as const,
    };
  });
}

function buildImagePrompt(
  songPrompt: string,
  style: MusicVideoStyle,
  mood: string,
  colorPalette: string,
  arcConfig: ArcConfig,
  cameraMovement: string,
  artistSuffix: string
): string {
  const styleConfig = STYLE_CONFIGS[style] || STYLE_CONFIGS.cinematic;

  return [
    styleConfig.visualPrefix,
    arcConfig.description(songPrompt, mood),
    `${cameraMovement} shot`,
    `${colorPalette} color palette`,
    arcConfig.colorNote(colorPalette),
    styleConfig.technicalQuality,
    artistSuffix,
  ].filter(Boolean).join(', ');
}

function buildVideoPrompt(
  songPrompt: string,
  style: MusicVideoStyle,
  mood: string,
  arcConfig: ArcConfig,
  cameraMovement: string
): string {
  return `${arcConfig.description(songPrompt, mood)}, ${cameraMovement} camera movement, ${mood} atmosphere, ${STYLE_CONFIGS[style]?.motionStyle || 'smooth motion'}`;
}

// ─── Image Generation per Scene ───────────────────────────────────────────────

async function generateSceneImage(
  scene: MusicVideoScene,
  aspectRatio: AspectRatio,
  artistRef?: string
): Promise<{ success: boolean; url?: string }> {
  try {
    const result = await generateImage({
      prompt: scene.imagePrompt,
      model: 'auto',
      aspectRatio,
      style: 'cinematic',
      enhance: true,
      negativePrompt: 'text, watermark, logo, blur, amateur, low quality, pixelated',
    } as ImageGenerationRequest);

    return { success: result.success, url: result.url };
  } catch {
    return { success: false };
  }
}

// ─── Video Clip Generation per Scene ─────────────────────────────────────────

async function generateSceneVideoClip(
  scene: MusicVideoScene,
  aspectRatio: AspectRatio
): Promise<{ success: boolean; url?: string } | null> {
  if (!scene.videoPrompt) return null;

  try {
    const result = await generateVideo({
      prompt: scene.videoPrompt,
      model: 'auto',
      aspectRatio,
      duration: Math.min(scene.duration, 5),
      cameraMovement: scene.cameraMovement,
      referenceImageUrl: scene.imageUrl,
    } as VideoGenerationRequest);

    return { success: result.success, url: result.url };
  } catch {
    return { success: false };
  }
}

// ─── Style Configurations ─────────────────────────────────────────────────────

interface StyleConfig {
  visualPrefix: string;
  colorGrade: string;
  editingStyle: string;
  motionStyle: string;
  technicalQuality: string;
  cameraMovements: string[];
}

const STYLE_CONFIGS: Record<MusicVideoStyle, StyleConfig> = {
  cinematic: {
    visualPrefix: 'Cinematic film photography, anamorphic lens, shallow depth of field',
    colorGrade: 'Film emulsion grade — warm shadows, desaturated highlights',
    editingStyle: 'Slow cuts aligned to musical phrases, cross-dissolves at transitions',
    motionStyle: 'slow cinematic pan',
    technicalQuality: 'film grain, professional cinema camera, 4K, award-winning cinematography',
    cameraMovements: ['slow pan', 'tracking shot', 'crane shot', 'dolly zoom', 'handheld'],
  },
  visualizer: {
    visualPrefix: 'Abstract audio-reactive digital art, particle systems, frequency visualization',
    colorGrade: 'Neon glows on dark background, high saturation, luminescent',
    editingStyle: 'Beat-synchronized cuts, rapid flash on transients, waveform morphing',
    motionStyle: 'pulsing motion',
    technicalQuality: 'perfect rendering, 8K digital art, mesmerizing, professional motion graphics',
    cameraMovements: ['zoom in', 'rotation', 'spiral pull', 'warp', 'static focus'],
  },
  'lyric-video': {
    visualPrefix: 'Kinetic typography, bold font design, text animation, graphic design',
    colorGrade: 'High contrast, brand-color forward, clean backgrounds',
    editingStyle: 'Text appears on syllable beats, fades on breath pauses',
    motionStyle: 'text animation',
    technicalQuality: 'crisp vectors, professional motion graphics, typographically excellent',
    cameraMovements: ['static', 'gentle zoom', 'slide', 'fade', 'morph'],
  },
  performance: {
    visualPrefix: 'Live performance photography, stage lighting, audience energy, concert atmosphere',
    colorGrade: 'Stage wash colors — deep blues, warm spotlights, dramatic shadows',
    editingStyle: 'Multi-camera cuts following vocal energy, close-ups on emotional moments',
    motionStyle: 'handheld energy',
    technicalQuality: 'professional concert photography, real venue, atmospheric, powerful presence',
    cameraMovements: ['handheld', 'close-up', 'wide establishing', 'OTS', 'crowd reverse'],
  },
  abstract: {
    visualPrefix: 'Abstract expressionist art, emotional shapes, flowing forms, pure visual poetry',
    colorGrade: 'Painterly, canvas-like, bold color fields, texture over detail',
    editingStyle: 'Feeling-based cuts, not beat-based — edit to emotional arc',
    motionStyle: 'organic flow',
    technicalQuality: 'gallery-quality art, museum-worthy, emotionally resonant, textured',
    cameraMovements: ['morphing', 'flowing', 'dissolving', 'breathing', 'pulsing'],
  },
  animated: {
    visualPrefix: '2D animation, illustration style, character design, vibrant world-building',
    colorGrade: 'Saturated illustration colors, flat shading or cel-shading',
    editingStyle: 'Animation timing on dialogue/lyrics, comedic holds, smooth transitions',
    motionStyle: 'animated movement',
    technicalQuality: 'professional animation, studio quality, character consistency, detailed backgrounds',
    cameraMovements: ['pan across', 'character close-up', 'environment wide', 'animated zoom', 'cut to'],
  },
  documentary: {
    visualPrefix: 'Documentary photography, candid moments, behind-the-scenes authenticity',
    colorGrade: 'Natural, desaturated, honest — no heavy grading, real locations',
    editingStyle: 'Observational cuts, breathing room between shots, natural pacing',
    motionStyle: 'documentary natural',
    technicalQuality: 'photojournalism quality, authentic, unposed, emotionally true',
    cameraMovements: ['observational handheld', 'candid', 'environmental portrait', 'reaction close-up', 'establishing'],
  },
};

// ─── Arc Configurations ───────────────────────────────────────────────────────

interface ArcConfig {
  title: string;
  description: (songPrompt: string, mood: string) => string;
  duration: number;
  mood: (baseMood: string) => string;
  colorNote: (palette: string) => string;
}

const ARC_CONFIGS: Record<string, ArcConfig> = {
  intro: {
    title: 'Opening — Establish',
    description: (sp, mood) => `Establishing shot introducing the world of "${sp.slice(0, 40)}...", ${mood} atmosphere, sense of arrival`,
    duration: 8,
    mood: m => `quiet ${m}`,
    colorNote: p => `${p} in shadow, slowly revealing`,
  },
  build: {
    title: 'Rising — Build',
    description: (sp, mood) => `Building energy, movement entering the frame, ${mood} growing more intense, forward momentum`,
    duration: 10,
    mood: m => `building ${m}`,
    colorNote: p => `${p} brightening, contrast increasing`,
  },
  pre_climax: {
    title: 'Pre-Climax — Tension',
    description: (sp, mood) => `Tension before the peak, close-up emotion, the world of "${sp.slice(0, 30)}..." at a turning point`,
    duration: 8,
    mood: m => `intense ${m}`,
    colorNote: p => `${p} saturating, edges sharpening`,
  },
  climax: {
    title: 'Climax — Peak',
    description: (sp, mood) => `Full emotional peak — the core of the story, maximum visual power, ${mood} at its height`,
    duration: 12,
    mood: m => `peak ${m}`,
    colorNote: p => `${p} fully saturated, maximum drama`,
  },
  post_climax: {
    title: 'Post-Climax — Release',
    description: (sp, mood) => `After the peak, emotional release, ${mood} transforming, world changed`,
    duration: 8,
    mood: m => `releasing ${m}`,
    colorNote: p => `${p} softening, breath`,
  },
  resolution: {
    title: 'Resolution — Settling',
    description: (sp, mood) => `Coming down, making sense of the journey, ${mood} finding resolution, stillness entering`,
    duration: 10,
    mood: m => `resolved ${m}`,
    colorNote: p => `${p} in warm low light`,
  },
  outro: {
    title: 'Outro — Echo',
    description: (sp, mood) => `Final image, echo of the opening, the world of the song at rest, ${mood} fading to memory`,
    duration: 8,
    mood: m => `quiet ${m} memory`,
    colorNote: p => `${p} fading, desaturating toward black`,
  },
  coda: {
    title: 'Coda — Reflection',
    description: (sp, mood) => `A final reflective moment — perhaps the artist alone, or a last beauty shot that lingers`,
    duration: 6,
    mood: m => `contemplative ${m}`,
    colorNote: p => `${p} single point of light`,
  },
};

// ─── Helper Functions ─────────────────────────────────────────────────────────

function detectMood(songPrompt: string): string {
  const lower = songPrompt.toLowerCase();
  if (lower.match(/love|romance|tender|longing|ache|miss/)) return 'romantic melancholy';
  if (lower.match(/power|rise|triumph|strength|overcome/)) return 'triumphant and powerful';
  if (lower.match(/party|dance|feel good|celebration|joy/)) return 'euphoric celebration';
  if (lower.match(/dark|shadow|lost|broken|pain|hurt/)) return 'brooding darkness';
  if (lower.match(/spiritual|soul|god|faith|light|higher/)) return 'spiritual transcendence';
  if (lower.match(/groove|funk|rhythm|bass|body/)) return 'sensual groove';
  if (lower.match(/rebel|fight|resist|free|revolution/)) return 'rebellious energy';
  return 'evocative and cinematic';
}

function deriveColorPalette(mood: string): string {
  const palettes: Record<string, string> = {
    'romantic melancholy': 'deep burgundy, soft mauve, candlelight gold',
    'triumphant and powerful': 'electric blue, gold, stark white',
    'euphoric celebration': 'bright coral, neon yellow, warm amber',
    'brooding darkness': 'charcoal, deep indigo, blood red accents',
    'spiritual transcendence': 'celestial white, deep purple, golden light',
    'sensual groove': 'midnight blue, warm skin tones, amber glow',
    'rebellious energy': 'stark black, electric red, concrete grey',
    'evocative and cinematic': 'teal, amber, rich chocolate',
  };
  return palettes[mood] || 'rich cinematic tones, warm shadows, cool highlights';
}

function deriveConceptStatement(songPrompt: string, style: MusicVideoStyle, mood: string): string {
  return `A ${style} visual narrative exploring "${songPrompt.slice(0, 60)}" through ${mood} imagery. ` +
    `Each frame is designed to amplify the emotional truth of the music, creating a visual language ` +
    `that exists in conversation with the sound rather than simply illustrating it.`;
}

function buildDirectorNotes(
  songPrompt: string,
  style: MusicVideoStyle,
  mood: string,
  artistRef?: string
): string {
  const styleConfig = STYLE_CONFIGS[style] || STYLE_CONFIGS.cinematic;
  const refNote = artistRef ? `\n\nVisual reference: ${artistRef} — not literal imitation but spiritual kinship in approach.` : '';

  return `DIRECTOR'S VISION\n\n` +
    `This video lives in the emotional truth of ${mood}. ${deriveConceptStatement(songPrompt, style, mood)}\n\n` +
    `Color Strategy: ${styleConfig.colorGrade}\n` +
    `Editing Approach: ${styleConfig.editingStyle}\n` +
    `Camera Language: ${styleConfig.cameraMovements.join(', ')}\n` +
    `Technical Standard: ${styleConfig.technicalQuality}` +
    refNote;
}

// ─── GET — Style presets / info ───────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    styles: Object.entries(STYLE_CONFIGS).map(([id, cfg]) => ({
      id,
      name: id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      description: cfg.colorGrade,
      editingStyle: cfg.editingStyle,
    })),
    moodExamples: [
      'romantic melancholy', 'triumphant and powerful', 'euphoric celebration',
      'brooding darkness', 'spiritual transcendence', 'sensual groove',
      'rebellious energy', 'evocative and cinematic',
    ],
    sceneRange: { min: 2, max: 8, default: 4 },
  });
}
