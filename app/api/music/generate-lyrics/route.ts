import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import Groq from 'groq-sdk';

/**
 * POST /api/music/generate-lyrics
 *
 * Multi-language Lyrics Generation — 100% FREE via Groq (Llama 3.3 70B)
 * Supports 12 languages with authentic cultural & musical context.
 *
 * Body:
 * {
 *   theme:     string              — what the song is about
 *   style?:    string              — genre/style (e.g. pop, hip-hop, R&B)
 *   mood?:     string              — emotional tone
 *   language?: string             — target language (default: english)
 * }
 */

export const runtime = 'nodejs';

// ── Supported languages with cultural guidance ────────────────────────────────
const LANGUAGE_CONFIGS: Record<string, {
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

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { theme, style, mood, language = 'english' } = body;

    if (!theme) {
      return NextResponse.json({ success: false, error: 'Theme is required' }, { status: 400 });
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) {
      return NextResponse.json(
        { success: false, error: 'GROQ_API_KEY not configured' },
        { status: 503 }
      );
    }

    // Resolve language config — fallback to English if unknown
    const langKey = language.toLowerCase().replace(/\s+/g, '-');
    const langConfig = LANGUAGE_CONFIGS[langKey] ?? LANGUAGE_CONFIGS['english'];

    const systemPrompt = `You are a world-class professional songwriter and lyricist with deep expertise in ${langConfig.name} music.
${langConfig.culturalContext}
${langConfig.scriptNote ? langConfig.scriptNote : ''}
Always write authentic, culturally-grounded lyrics that respect the musical traditions of the language.`;

    const userPrompt = `${langConfig.instruction}

Write a complete song about: "${theme}"
Genre/Style: ${style || 'pop'}
Mood: ${mood || 'emotional, heartfelt'}

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

    console.log(`[Lyrics API] Generating ${langConfig.name} lyrics for theme: "${theme}"`);

    const groq = new Groq({ apiKey: groqKey });
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.92,
      max_tokens: 1400,
    });

    const lyrics = completion.choices[0]?.message?.content;

    if (!lyrics) {
      return NextResponse.json({ success: false, error: 'Failed to generate lyrics' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        lyrics: lyrics.trim(),
        language: langConfig.name,
        languageCode: langKey,
        provider: 'groq-llama-3.3-70b',
      },
    });

  } catch (error: any) {
    console.error('[Lyrics API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET — return supported languages list
export async function GET() {
  const languages = Object.entries(LANGUAGE_CONFIGS).map(([key, cfg]) => ({
    code: key,
    name: cfg.name,
    nativeName: cfg.nativeName,
  }));

  return NextResponse.json({ success: true, languages });
}
