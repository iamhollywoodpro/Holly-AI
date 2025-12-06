/**
 * Oracle Cloud AI Speech Service
 * MAYA1 Voice Text-to-Speech Integration
 */

import { oracleConfig, aiSpeechConfig } from './config';
import { signRequest } from './auth';

export interface SpeechRequest {
  text: string;
  voice?: string;
  languageCode?: string;
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
  outputFormat?: 'MP3' | 'WAV' | 'OGG';
}

export interface SpeechResponse {
  audioContent: string; // Base64 encoded audio
  contentType: string;
  duration: number;
}

/**
 * Generate speech using Oracle AI Speech with MAYA1 voice
 */
export async function generateSpeech(request: SpeechRequest): Promise<SpeechResponse> {
  try {
    const endpoint = `${aiSpeechConfig.endpoint}/20220101/actions/synthesizeSpeech`;
    
    // Prepare request body
    const requestBody = {
      compartmentId: oracleConfig.compartmentId || oracleConfig.tenancyId,
      text: request.text,
      voiceId: request.voice || aiSpeechConfig.voice.id,
      languageCode: request.languageCode || aiSpeechConfig.voice.languageCode,
      audioFormat: request.outputFormat || aiSpeechConfig.voice.audioEncoding,
      sampleRateHertz: aiSpeechConfig.voice.sampleRateHertz,
      speechSettings: {
        speakingRate: request.speakingRate ?? aiSpeechConfig.synthesis.speakingRate,
        pitch: request.pitch ?? aiSpeechConfig.synthesis.pitch,
        volumeGainDb: request.volumeGainDb ?? aiSpeechConfig.synthesis.volumeGainDb
      }
    };
    
    const body = JSON.stringify(requestBody);
    
    // Sign the request
    const { headers } = await signRequest('POST', '/20220101/actions/synthesizeSpeech', body);
    
    // Make API call
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Oracle AI Speech API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    
    return {
      audioContent: data.audioContent,
      contentType: getContentType(request.outputFormat || 'MP3'),
      duration: data.durationInSeconds || 0
    };
  } catch (error) {
    console.error('Error generating speech:', error);
    throw error;
  }
}

/**
 * Generate speech and return as audio blob
 */
export async function generateSpeechBlob(request: SpeechRequest): Promise<Blob> {
  const response = await generateSpeech(request);
  
  // Decode base64 audio content
  const binaryString = atob(response.audioContent);
  const bytes = new Uint8Array(binaryString.length);
  
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return new Blob([bytes], { type: response.contentType });
}

/**
 * Generate speech and return as data URL for immediate playback
 */
export async function generateSpeechDataURL(request: SpeechRequest): Promise<string> {
  const response = await generateSpeech(request);
  return `data:${response.contentType};base64,${response.audioContent}`;
}

/**
 * Test Oracle AI Speech connection
 */
export async function testConnection(): Promise<{ success: boolean; message: string; duration?: number }> {
  try {
    const startTime = Date.now();
    
    await generateSpeech({
      text: 'Hello, I am HOLLY, your AI development assistant.',
      voice: 'MAYA1'
    });
    
    const duration = Date.now() - startTime;
    
    return {
      success: true,
      message: 'Successfully connected to Oracle AI Speech with MAYA1 voice',
      duration
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * List available voices
 */
export async function listVoices(): Promise<any> {
  try {
    const endpoint = `${aiSpeechConfig.endpoint}/20220101/voices`;
    
    // Sign the request
    const { headers } = await signRequest('GET', '/20220101/voices');
    
    // Make API call
    const response = await fetch(endpoint, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Failed to list voices: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error listing voices:', error);
    throw error;
  }
}

/**
 * Get content type for audio format
 */
function getContentType(format: string): string {
  const contentTypes: Record<string, string> = {
    'MP3': 'audio/mpeg',
    'WAV': 'audio/wav',
    'OGG': 'audio/ogg'
  };
  
  return contentTypes[format] || 'audio/mpeg';
}

/**
 * HOLLY-specific speech generation shortcuts
 */
export const HOLLY = {
  /**
   * Generate HOLLY's greeting
   */
  async greet(name: string = 'Hollywood'): Promise<string> {
    return generateSpeechDataURL({
      text: `Good evening, ${name}! I'm HOLLY, your AI development partner. How can I assist you today?`,
      voice: 'MAYA1',
      speakingRate: 1.0
    });
  },
  
  /**
   * Generate HOLLY's confirmation
   */
  async confirm(action: string): Promise<string> {
    return generateSpeechDataURL({
      text: `Understood, ${action}. I'm on it, Hollywood.`,
      voice: 'MAYA1'
    });
  },
  
  /**
   * Generate HOLLY's completion message
   */
  async complete(task: string): Promise<string> {
    return generateSpeechDataURL({
      text: `Task complete, Hollywood. ${task} is ready for your review.`,
      voice: 'MAYA1'
    });
  },
  
  /**
   * Generate HOLLY's error message
   */
  async error(issue: string): Promise<string> {
    return generateSpeechDataURL({
      text: `Hollywood, I've encountered an issue: ${issue}. Let me know how you'd like to proceed.`,
      voice: 'MAYA1',
      pitch: -2.0 // Slightly lower pitch for errors
    });
  }
};
