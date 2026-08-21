/**
 * Holly's Lyric Brain — the songwriter, extracted (2026-08-21).
 *
 * Multi-language lyric writing via the smart-router cascade (Groq Llama 3.3
 * free lane primary). This is the WRITER half of the music architecture:
 * lyric-brain authors human-sounding songs; ACE-Step only renders them.
 *
 * Previously lived inline in /api/music/generate-lyrics — extracted so the
 * MCP music hub can call it in-process (no HTTP auth round-trip).
 */

import { smartRoute } from '@/lib/ai/smart-router';
import { cascadeCollect } from '@/lib/ai/cascade';

// ── Supported languages with cultural guidance ────────────────────────────────

export const LANGUAGE_CONFIGS: Record<string, {
  name: string;
  nativeName: string;
  instruction: string;
  culturalContext: string;
  scriptNote?: string;
}> = {
  english: {
    name: 'English',
    nativeName: 'English',
    instruction: 'Write the lyrics entirely in English.',
    culturalContext: 'Western pop/rock/hip-hop traditions. Use vivid imagery, metaphors, and relatable themes.',
  },
  arabic: {
    name: 'Arabic',
    nativeName: 'العربية',
    instruction: 'Write the lyrics entirely in Arabic (العربية). Use authentic Arabic poetic traditions.',
    culturalContext: 'Draw from Arabic maqam traditions, Khaleeji, Tarab, and modern Arabic pop. Use classic Arabic poetic devices (tajnis, tawriya). Emotional depth is central.',
    scriptNote: 'Write in Arabic script (right-to-left).',
  },
  'brazilian-portuguese': {
    name: 'Brazilian Portuguese',
    nativeName: 'Português Brasileiro',
    instruction: 'Write the lyrics entirely in Brazilian Portuguese (Português Brasileiro).',
    culturalContext: 'Draw from Samba, Bossa Nova, Funk Carioca, Forró, and Brazilian pop traditions. Warm, rhythmic, and emotionally rich.',
  },
  french: {
    name: 'French',
    nativeName: 'Français',
    instruction: 'Write the lyrics entirely in French (Français).',
    culturalContext: 'Draw from French chanson, variété française, and modern French pop. Poetic, romantic, and sophisticated.',
  },
  german: {
    name: 'German',
    nativeName: 'Deutsch',
    instruction: 'Write the lyrics entirely in German (Deutsch).',
    culturalContext: 'Draw from Schlager, Neue Deutsche Welle, and modern German pop/hip-hop. Can be deeply introspective or high-energy.',
  },
  greek: {
    name: 'Greek',
    nativeName: 'Ελληνικά',
    instruction: 'Write the lyrics entirely in Greek (Ελληνικά).',
    culturalContext: 'Draw from Laïká, Rebetiko, Entechno, and modern Greek pop. Deeply emotional, Mediterranean soul.',
    scriptNote: 'Write in Greek script.',
  },
  hindi: {
    name: 'Hindi',
    nativeName: 'हिंदी',
    instruction: 'Write the lyrics entirely in Hindi (हिंदी). Use Devanagari script.',
    culturalContext: 'Draw from Bollywood film songs, Ghazals, Filmi, and modern Hindi pop. Rich poetic tradition with raga-inspired emotional arcs.',
    scriptNote: 'Write in Devanagari script (हिंदी).',
  },
  italian: {
    name: 'Italian',
    nativeName: 'Italiano',
    instruction: 'Write the lyrics entirely in Italian (Italiano).',
    culturalContext: 'Draw from Italian pop (Canzone italiana), classical opera influences, and modern Italian music. Lyrical, passionate, and melodic.',
  },
  japanese: {
    name: 'Japanese',
    nativeName: '日本語',
    instruction: 'Write the lyrics entirely in Japanese (日本語). Mix kanji, hiragana, and katakana naturally.',
    culturalContext: 'Draw from J-Pop, City Pop, Visual Kei, and Japanese folk traditions. Poetic restraint, seasonal imagery (kigo), and emotional nuance (mono no aware).',
    scriptNote: 'Write in Japanese script mixing kanji, hiragana, katakana.',
  },
  korean: {
    name: 'Korean',
    nativeName: '한국어',
    instruction: 'Write the lyrics entirely in Korean (한국어). Use Hangul script.',
    culturalContext: 'Draw from K-Pop, K-R&B, Trot, and Korean indie. Hooky, emotionally intense, with contrast between vulnerability and confidence.',
    scriptNote: 'Write in Hangul (한글) script.',
  },
  malayalam: {
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    instruction: 'Write the lyrics entirely in Malayalam (മലയാളം).',
    culturalContext: 'Draw from Kerala film music (Mollywood), classical Carnatic traditions, Mappila Pattu, and Nadanpattu folk. Rich in nature imagery and emotional depth.',
    scriptNote: 'Write in Malayalam script.',
  },
  spanish: {
    name: 'Spanish',
    nativeName: 'Español',
    instruction: 'Write the lyrics entirely in Spanish (Español).',
    culturalContext: 'Draw from Latin pop, Reggaeton, Flamenco, Bachata, and Salsa traditions. Passionate, rhythmic, and vivid storytelling.',
  },
};

// ── Writing ──────────────────────────────────────────────────────────────────

export interface WriteLyricsParams {
  /** What the song is about. */
  theme: string;
  /** Genre/style (e.g. pop, hip-hop, R&B). */
  style?: string;
  /** Emotional tone. */
  mood?: string;
  /** Target language (default: english). */
  language?: string;
}

export interface WrittenLyrics {
  lyrics: string;
  language: string;
  languageCode: string;
  provider: string;
  model: string;
}

export async function writeLyrics(params: WriteLyricsParams): Promise<WrittenLyrics> {
  const langKey = (params.language ?? 'english').toLowerCase().replace(/\s+/g, '-');
  const langConfig = LANGUAGE_CONFIGS[langKey] ?? LANGUAGE_CONFIGS['english'];

  const systemPrompt = `You are a world-class professional songwriter and lyricist with deep expertise in ${langConfig.name} music.
${langConfig.culturalContext}
${langConfig.scriptNote ? langConfig.scriptNote : ''}
Always write authentic, culturally-grounded lyrics that respect the musical traditions of the language.`;

  const userPrompt = `${langConfig.instruction}

Write a complete song about: "${params.theme}"
Genre/Style: ${params.style || 'pop'}
Mood: ${params.mood || 'emotional, heartfelt'}

Structure the lyrics with clearly labeled sections:
[Verse 1]
...

[Chorus]
...

[Verse 2]
...

[Chorus]
...

[Bridge]
...

[Chorus]
...

Make the lyrics emotionally resonant, culturally authentic, and lyrically powerful. Use the rich poetic devices of ${langConfig.name} music.`;

  const routeResult = await smartRoute(userPrompt, { taskHint: 'creative' });

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    { role: 'user'   as const, content: userPrompt },
  ];

  const { text, model: usedModel } = await cascadeCollect(
    routeResult.waterfall,
    messages,
    { temperature: 0.92, maxTokens: 1400 },
  );

  if (!text) {
    throw new Error('Lyric brain produced nothing — all writers failed');
  }

  return {
    lyrics: text.trim(),
    language: langConfig.name,
    languageCode: langKey,
    provider: usedModel.displayName,
    model: usedModel.model,
  };
}
