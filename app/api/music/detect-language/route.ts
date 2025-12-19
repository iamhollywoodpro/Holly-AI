// ============================================
// LANGUAGE DETECTION API ROUTE
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import type { DetectLanguageRequest, DetectLanguageResponse, Language } from '@/types/music';

export const runtime = 'nodejs';


// Language keywords and patterns
const LANGUAGE_PATTERNS: Record<Language, RegExp[]> = {
  'en': [/\b(the|and|is|are|was|were|will|have|has|had|do|does|did|can|could|would|should|may|might)\b/gi],
  'ml': [/[അ-ഔക-ഹ]/g, /\b(ആണ്|ഉണ്ട്|ആയി|കൊണ്ട്|എന്ന്|എങ്കിൽ)\b/g],
  'hi': [/[अ-ऋक-ह]/g, /\b(है|हैं|था|थे|होगा|होंगे|और|का|की|को|में)\b/g],
  'pt': [/\b(o|a|os|as|de|para|com|por|em|que|não|ser|ter|estar)\b/gi],
  'es': [/\b(el|la|los|las|de|para|con|por|en|que|no|ser|estar|tener)\b/gi],
  'it': [/\b(il|lo|la|i|gli|le|di|a|da|in|con|su|per|tra|fra|che|non|essere|avere)\b/gi],
  'pt-br': [/\b(você|tá|pra|pro|né|cara|legal|massa|maneiro)\b/gi],
  'el': [/[Α-Ωα-ω]/g, /\b(είναι|ήταν|θα|και|με|για|από|στο|στη)\b/gi],
  'ja': [/[ぁ-んァ-ヶー一-龯]/g, /\b(です|ます|した|する|ある|いる|の|は|が|を|に|で)\b/g],
  'ko': [/[가-힣]/g, /\b(이|가|은|는|을|를|의|에|에서|로|와|과)\b/g],
  'ar': [/[ء-ي]/g, /\b(في|من|إلى|على|هو|هي|أن|ما|كان|يكون)\b/g],
  'fr': [/\b(le|la|les|un|une|des|de|à|pour|avec|dans|sur|par|que|qui|ne|pas|être|avoir)\b/gi],
  'de': [/\b(der|die|das|den|dem|des|ein|eine|und|oder|aber|nicht|sein|haben|werden)\b/gi],
};

// Common words by language
const COMMON_WORDS: Record<Language, string[]> = {
  'en': ['love', 'heart', 'soul', 'dream', 'night', 'day', 'time', 'feel', 'want', 'need'],
  'ml': ['സ്നേഹം', 'ഹൃദയം', 'സ്വപ്നം', 'രാത്രി', 'പകൽ', 'കാലം', 'തോന്നൽ'],
  'hi': ['प्यार', 'दिल', 'सपना', 'रात', 'दिन', 'समय', 'लगता', 'चाहिए'],
  'pt': ['amor', 'coração', 'sonho', 'noite', 'dia', 'tempo', 'sentir', 'querer'],
  'es': ['amor', 'corazón', 'sueño', 'noche', 'día', 'tiempo', 'sentir', 'querer'],
  'it': ['amore', 'cuore', 'sogno', 'notte', 'giorno', 'tempo', 'sentire', 'volere'],
  'pt-br': ['amor', 'coração', 'sonho', 'noite', 'dia', 'tempo', 'sentir', 'querer', 'você'],
  'el': ['αγάπη', 'καρδιά', 'όνειρο', 'νύχτα', 'μέρα', 'χρόνος'],
  'ja': ['愛', '心', '夢', '夜', '日', '時間', '感じる'],
  'ko': ['사랑', '마음', '꿈', '밤', '낮', '시간', '느낌'],
  'ar': ['حب', 'قلب', 'حلم', 'ليل', 'نهار', 'وقت'],
  'fr': ['amour', 'cœur', 'rêve', 'nuit', 'jour', 'temps', 'sentir', 'vouloir'],
  'de': ['liebe', 'herz', 'traum', 'nacht', 'tag', 'zeit', 'fühlen', 'wollen'],
};

function detectLanguageFromText(text: string): Language {
  if (!text || text.trim().length === 0) {
    return 'en'; // Default to English
  }

  const scores: Record<Language, number> = {
    'en': 0, 'ml': 0, 'hi': 0, 'pt': 0, 'es': 0, 'it': 0, 
    'pt-br': 0, 'el': 0, 'ja': 0, 'ko': 0, 'ar': 0, 'fr': 0, 'de': 0,
  };

  const normalizedText = text.toLowerCase();

  // Check for language-specific characters and patterns
  for (const [lang, patterns] of Object.entries(LANGUAGE_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = normalizedText.match(pattern);
      if (matches) {
        scores[lang as Language] += matches.length;
      }
    }
  }

  // Check for common words
  for (const [lang, words] of Object.entries(COMMON_WORDS)) {
    for (const word of words) {
      if (normalizedText.includes(word.toLowerCase())) {
        scores[lang as Language] += 2; // Higher weight for common words
      }
    }
  }

  // Differentiate between Portuguese variants
  if (scores['pt'] > 0 || scores['pt-br'] > 0) {
    // Brazilian Portuguese indicators
    const brazilianIndicators = ['você', 'tá', 'pra', 'pro', 'né', 'cara'];
    const hasBrazilianIndicators = brazilianIndicators.some(word => 
      normalizedText.includes(word)
    );
    
    if (hasBrazilianIndicators) {
      scores['pt-br'] += 5;
    } else {
      scores['pt'] += 2;
    }
  }

  // Find language with highest score
  let maxScore = 0;
  let detectedLang: Language = 'en';

  for (const [lang, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedLang = lang as Language;
    }
  }

  // If no clear winner, default to English
  if (maxScore === 0) {
    return 'en';
  }

  return detectedLang;
}

function calculateConfidence(text: string, detectedLang: Language): number {
  const patterns = LANGUAGE_PATTERNS[detectedLang] || [];
  let totalMatches = 0;

  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches) {
      totalMatches += matches.length;
    }
  }

  // Calculate confidence based on match density
  const wordCount = text.split(/\s+/).length;
  const confidence = Math.min((totalMatches / wordCount) * 100, 100);

  return Math.round(confidence);
}

export async function POST(request: NextRequest) {
  try {
    const body: DetectLanguageRequest = await request.json() as any;
    const { text } = body as any;

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const detectedLanguage = detectLanguageFromText(text);
    const confidence = calculateConfidence(text, detectedLanguage);

    // Get all language scores for alternative suggestions
    const allScores: Array<{ language: Language; confidence: number }> = [];
    
    for (const lang of Object.keys(LANGUAGE_PATTERNS) as Language[]) {
      const langConfidence = calculateConfidence(text, lang);
      if (langConfidence > 0) {
        allScores.push({ language: lang, confidence: langConfidence });
      }
    }

    // Sort by confidence
    allScores.sort((a, b) => b.confidence - a.confidence);

    const response: DetectLanguageResponse = {
      language: detectedLanguage,
      confidence: confidence,
      detected_languages: allScores.slice(0, 3), // Top 3 suggestions
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Language detection error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
