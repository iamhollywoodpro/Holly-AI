// ============================================
// LYRICS GENERATION API ROUTE
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import type { GenerateLyricsRequest, GenerateLyricsResponse, Language } from '@/types/music';

// Import language configs
import { englishConfig } from '@/lib/music/languages/english/english-config';
import { malayalamConfig } from '@/lib/music/languages/malayalam/malayalam-config';
import { hindiConfig } from '@/lib/music/languages/hindi/hindi-config';
import { portugueseEUConfig } from '@/lib/music/languages/portuguese-eu/portuguese-eu-config';
import { spanishConfig } from '@/lib/music/languages/spanish/spanish-config';
import { italianConfig } from '@/lib/music/languages/italian/italian-config';
import { brazilianPortugueseConfig } from '@/lib/music/languages/brazilian-portuguese/brazilian-portuguese-config';
import { greekConfig } from '@/lib/music/languages/greek/greek-config';
import { japaneseConfig } from '@/lib/music/languages/japanese/japanese-config';
import { koreanConfig } from '@/lib/music/languages/korean/korean-config';
import { arabicConfig } from '@/lib/music/languages/arabic/arabic-config';
import { frenchConfig } from '@/lib/music/languages/french/french-config';
import { germanConfig } from '@/lib/music/languages/german/german-config';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const LANGUAGE_CONFIGS = {
  'en': englishConfig,
  'ml': malayalamConfig,
  'hi': hindiConfig,
  'pt': portugueseEUConfig,
  'es': spanishConfig,
  'it': italianConfig,
  'pt-br': brazilianPortugueseConfig,
  'el': greekConfig,
  'ja': japaneseConfig,
  'ko': koreanConfig,
  'ar': arabicConfig,
  'fr': frenchConfig,
  'de': germanConfig,
};

function buildLyricsPrompt(
  theme: string,
  style: string,
  language: Language,
  length: 'short' | 'medium' | 'long'
): string {
  const config = LANGUAGE_CONFIGS[language];
  
  const lengthGuide = {
    short: '8-12 lines (1 verse + 1 chorus)',
    medium: '16-24 lines (2 verses + 2 choruses + optional bridge)',
    long: '24-32 lines (3 verses + 3 choruses + bridge)',
  };

  // Get relevant musical tradition
  const relevantTradition = config.musicalTraditions.find(t => 
    t.name.toLowerCase().includes(style.toLowerCase())
  ) || config.musicalTraditions[0];

  // Get relevant poetic devices
  const poeticDevices = config.poeticDevices.slice(0, 3)
    .map(d => `- ${d.name}: ${d.description}`)
    .join('\n');

  return `You are HOLLY, an expert songwriter with deep cultural knowledge of ${config.nativeName} (${config.name}) music.

TASK: Write song lyrics in ${config.name} language.

MUSICAL TRADITION (${relevantTradition.name}):
${relevantTradition.description}
Characteristics: ${relevantTradition.characteristics.join(', ')}

POETIC DEVICES TO USE:
${poeticDevices}

REQUIREMENTS:
- Theme: ${theme || 'love and longing'}
- Style: ${style}
- Language: ${config.name} (${language})
- Length: ${lengthGuide[length]}
- Use authentic ${config.name} expressions (NOT direct translations)
- Incorporate cultural context naturally
- Use appropriate poetic devices from the tradition

EXAMPLES OF AUTHENTIC PHRASES:
${config.lyricExamples.filter(ex => ex.type === 'authentic').slice(0, 3).map(ex => `✓ ${ex.text}`).join('\n')}

AVOID THESE (Too literal/translated):
${config.lyricExamples.filter(ex => ex.type === 'avoid').slice(0, 3).map(ex => `✗ ${ex.text}`).join('\n')}

OUTPUT FORMAT:
[Verse 1]
...lyrics...

[Chorus]
...lyrics...

[Verse 2]
...lyrics...

[Chorus]
...lyrics...

Write the lyrics now, ensuring cultural authenticity and emotional depth:`;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateLyricsRequest = await request.json() as any;
    const { 
      theme = 'love and longing', 
      style, 
      language = 'en',
      length = 'medium' 
    } = body;

    if (!style) {
      return NextResponse.json(
        { error: 'Style is required' },
        { status: 400 }
      );
    }

    // Validate language
    if (!LANGUAGE_CONFIGS[language]) {
      return NextResponse.json(
        { error: `Unsupported language: ${language}` },
        { status: 400 }
      );
    }

    // Build prompt
    const prompt = buildLyricsPrompt(theme, style, language, length);

    // Generate lyrics with Claude
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.8, // Higher temperature for creativity
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const lyrics = message.content[0].type === 'text' 
      ? message.content[0].text 
      : '';

    if (!lyrics) {
      throw new Error('Failed to generate lyrics');
    }

    // Get cultural notes for the language
    const config = LANGUAGE_CONFIGS[language];
    // Cultural notes removed - not in LanguageConfig interface

    const response: GenerateLyricsResponse = {
      lyrics: lyrics.trim(),
      detected_language: language,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Lyrics generation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate lyrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
