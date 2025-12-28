/**
 * Azure Speech Service TTS API Route
 * Server-side endpoint for Microsoft Azure TTS generation
 * Uses the same neural voices as Edge TTS but works in serverless environments
 */

import { NextRequest, NextResponse } from 'next/server';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

// Language to voice mapping with proper dialects
const VOICE_MAP: Record<string, string> = {
  // English
  'en': 'en-US-AriaNeural',
  'en-US': 'en-US-AriaNeural',
  'en-GB': 'en-GB-SoniaNeural',
  'en-AU': 'en-AU-NatashaNeural',
  'en-IN': 'en-IN-NeerjaNeural',
  
  // Malayalam (native support!)
  'ml': 'ml-IN-SobhanaNeural',
  'ml-IN': 'ml-IN-SobhanaNeural',
  
  // Hindi
  'hi': 'hi-IN-SwaraNeural',
  'hi-IN': 'hi-IN-SwaraNeural',
  
  // Spanish
  'es': 'es-ES-ElviraNeural',
  'es-ES': 'es-ES-ElviraNeural',
  'es-MX': 'es-MX-DaliaNeural',
  'es-AR': 'es-AR-ElenaNeural',
  
  // French
  'fr': 'fr-FR-DeniseNeural',
  'fr-FR': 'fr-FR-DeniseNeural',
  'fr-CA': 'fr-CA-SylvieNeural',
  
  // German
  'de': 'de-DE-KatjaNeural',
  'de-DE': 'de-DE-KatjaNeural',
  'de-AT': 'de-AT-IngridNeural',
  
  // Italian
  'it': 'it-IT-ElsaNeural',
  'it-IT': 'it-IT-ElsaNeural',
  
  // Portuguese
  'pt': 'pt-BR-FranciscaNeural',
  'pt-BR': 'pt-BR-FranciscaNeural',
  'pt-PT': 'pt-PT-RaquelNeural',
  
  // Chinese
  'zh': 'zh-CN-XiaoxiaoNeural',
  'zh-CN': 'zh-CN-XiaoxiaoNeural',
  'zh-TW': 'zh-TW-HsiaoChenNeural',
  'zh-HK': 'zh-HK-HiuMaanNeural',
  
  // Japanese
  'ja': 'ja-JP-NanamiNeural',
  'ja-JP': 'ja-JP-NanamiNeural',
  
  // Korean
  'ko': 'ko-KR-SunHiNeural',
  'ko-KR': 'ko-KR-SunHiNeural',
  
  // Arabic
  'ar': 'ar-SA-ZariyahNeural',
  'ar-SA': 'ar-SA-ZariyahNeural',
  'ar-EG': 'ar-EG-SalmaNeural',
  
  // Russian
  'ru': 'ru-RU-SvetlanaNeural',
  'ru-RU': 'ru-RU-SvetlanaNeural',
  
  // Tamil
  'ta': 'ta-IN-PallaviNeural',
  'ta-IN': 'ta-IN-PallaviNeural',
  
  // Telugu
  'te': 'te-IN-ShrutiNeural',
  'te-IN': 'te-IN-ShrutiNeural',
  
  // Bengali
  'bn': 'bn-IN-TanishaaNeural',
  'bn-IN': 'bn-IN-TanishaaNeural',
  
  // Urdu
  'ur': 'ur-IN-GulNeural',
  'ur-IN': 'ur-IN-GulNeural',
  
  // Kannada
  'kn': 'kn-IN-SapnaNeural',
  'kn-IN': 'kn-IN-SapnaNeural',
  
  // Gujarati
  'gu': 'gu-IN-DhwaniNeural',
  'gu-IN': 'gu-IN-DhwaniNeural',
  
  // Marathi
  'mr': 'mr-IN-AarohiNeural',
  'mr-IN': 'mr-IN-AarohiNeural',
};

/**
 * Detect language from text (basic heuristic)
 */
function detectLanguage(text: string): string {
  // Malayalam detection (Unicode range: 0D00-0D7F)
  if (/[\u0D00-\u0D7F]/.test(text)) {
    return 'ml-IN';
  }
  
  // Hindi detection (Devanagari: 0900-097F)
  if (/[\u0900-\u097F]/.test(text)) {
    return 'hi-IN';
  }
  
  // Tamil detection (0B80-0BFF)
  if (/[\u0B80-\u0BFF]/.test(text)) {
    return 'ta-IN';
  }
  
  // Telugu detection (0C00-0C7F)
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return 'te-IN';
  }
  
  // Bengali detection (0980-09FF)
  if (/[\u0980-\u09FF]/.test(text)) {
    return 'bn-IN';
  }
  
  // Kannada detection (0C80-0CFF)
  if (/[\u0C80-\u0CFF]/.test(text)) {
    return 'kn-IN';
  }
  
  // Gujarati detection (0A80-0AFF)
  if (/[\u0A80-\u0AFF]/.test(text)) {
    return 'gu-IN';
  }
  
  // Arabic detection (0600-06FF)
  if (/[\u0600-\u06FF]/.test(text)) {
    return 'ar-SA';
  }
  
  // Chinese detection (4E00-9FFF)
  if (/[\u4E00-\u9FFF]/.test(text)) {
    return 'zh-CN';
  }
  
  // Japanese detection (Hiragana: 3040-309F, Katakana: 30A0-30FF)
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) {
    return 'ja-JP';
  }
  
  // Korean detection (Hangul: AC00-D7AF)
  if (/[\uAC00-\uD7AF]/.test(text)) {
    return 'ko-KR';
  }
  
  // Russian detection (Cyrillic: 0400-04FF)
  if (/[\u0400-\u04FF]/.test(text)) {
    return 'ru-RU';
  }
  
  // Default to English
  return 'en-US';
}

/**
 * Get voice for language
 */
function getVoiceForLanguage(language: string): string {
  return VOICE_MAP[language] || VOICE_MAP['en-US'];
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice, language, rate, pitch, volume } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Check for Azure Speech Service credentials
    const speechKey = process.env.AZURE_SPEECH_KEY;
    const speechRegion = process.env.AZURE_SPEECH_REGION || 'eastus';

    if (!speechKey) {
      console.error('[Azure TTS API] AZURE_SPEECH_KEY not found in environment');
      return NextResponse.json(
        { error: 'Azure Speech Service not configured' },
        { status: 500 }
      );
    }

    // Detect language if not provided
    const detectedLanguage = language || detectLanguage(text);
    const selectedVoice = voice || getVoiceForLanguage(detectedLanguage);

    console.log('[Azure TTS API] Detected language:', detectedLanguage);
    console.log('[Azure TTS API] Using voice:', selectedVoice);
    console.log('[Azure TTS API] Text length:', text.length);

    // Create speech config
    const speechConfig = sdk.SpeechConfig.fromSubscription(speechKey, speechRegion);
    speechConfig.speechSynthesisVoiceName = selectedVoice;
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;

    // Create SSML with rate, pitch, volume
    const ssml = `
      <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${detectedLanguage}">
        <voice name="${selectedVoice}">
          <prosody rate="${rate || '+0%'}" pitch="${pitch || '+0Hz'}" volume="${volume || '+0%'}">
            ${text}
          </prosody>
        </voice>
      </speak>
    `.trim();

    // Synthesize speech
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

    return new Promise<NextResponse>((resolve) => {
      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            console.log('[Azure TTS API] Audio generated, buffer size:', result.audioData.byteLength);
            
            // Return audio as response
            resolve(new NextResponse(result.audioData, {
              status: 200,
              headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': result.audioData.byteLength.toString(),
              },
            }));
          } else {
            console.error('[Azure TTS API] Speech synthesis failed:', result.errorDetails);
            resolve(NextResponse.json(
              { error: `Speech synthesis failed: ${result.errorDetails}` },
              { status: 500 }
            ));
          }
          synthesizer.close();
        },
        (error) => {
          console.error('[Azure TTS API] Error:', error);
          synthesizer.close();
          resolve(NextResponse.json(
            { error: error.toString() },
            { status: 500 }
          ));
        }
      );
    });
  } catch (error) {
    console.error('[Azure TTS API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'TTS generation failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to list available voices
export async function GET() {
  return NextResponse.json({
    languages: Object.keys(VOICE_MAP),
    voices: VOICE_MAP,
    service: 'Azure Speech Service (same voices as Edge TTS)',
  });
}
