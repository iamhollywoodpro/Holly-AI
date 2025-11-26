/**
 * HOLLY TTS Service - Hybrid Architecture
 * Kokoro-82M with API + Self-Hosted Fallback
 * Voice: af_heart (Warm, Confident, Intelligent)
 */

// Configuration
const TTS_CONFIG = {
  primaryProvider: 'api' as 'api' | 'selfhosted',
  voice: 'af_heart',
  speed: 1.0,
  lang: 'en-us',
  
  api: {
    endpoint: 'https://api-inference.huggingface.co/models/hexgrad/Kokoro-82M',
    token: process.env.HUGGINGFACE_API_KEY || '',
    timeout: 10000,
    maxRetries: 2
  },
  
  selfHosted: {
    enabled: false, // Will be enabled in Phase 2
    endpoint: process.env.TTS_SELFHOSTED_URL || 'http://localhost:8765'
  },
  
  health: {
    apiFailures: 0,
    selfHostedFailures: 0,
    lastApiSuccess: null as number | null,
    lastSelfHostedSuccess: null as number | null
  }
};

export interface TTSResult {
  audio: Blob;
  provider: 'api' | 'selfhosted';
  duration: number;
  voice: string;
  wasFallback?: boolean;
}

export interface TTSOptions {
  voice?: string;
  speed?: number;
  lang?: string;
  forceProvider?: 'api' | 'selfhosted';
}

/**
 * Generate speech with HOLLY's voice
 */
export async function generateHollySpeech(
  text: string,
  options: TTSOptions = {}
): Promise<TTSResult> {
  const startTime = Date.now();
  
  console.log(`[HOLLY TTS] Generating speech for: "${text.substring(0, 50)}..."`);
  
  const mergedOptions = {
    voice: options.voice || TTS_CONFIG.voice,
    speed: options.speed || TTS_CONFIG.speed,
    lang: options.lang || TTS_CONFIG.lang,
    forceProvider: options.forceProvider
  };
  
  try {
    const provider = determineProvider(mergedOptions.forceProvider);
    
    let audioBlob: Blob;
    
    if (provider === 'api') {
      audioBlob = await generateViaAPI(text, mergedOptions);
      TTS_CONFIG.health.apiFailures = 0;
      TTS_CONFIG.health.lastApiSuccess = Date.now();
    } else {
      audioBlob = await generateViaSelfHosted(text, mergedOptions);
      TTS_CONFIG.health.selfHostedFailures = 0;
      TTS_CONFIG.health.lastSelfHostedSuccess = Date.now();
    }
    
    const duration = Date.now() - startTime;
    console.log(`[HOLLY TTS] ✅ Success via ${provider} in ${duration}ms`);
    
    return {
      audio: audioBlob,
      provider,
      duration,
      voice: mergedOptions.voice
    };
    
  } catch (error) {
    console.error(`[HOLLY TTS] ❌ Primary provider failed:`, error);
    
    // Try fallback
    try {
      const fallbackProvider = TTS_CONFIG.primaryProvider === 'api' ? 'selfhosted' : 'api';
      console.log(`[HOLLY TTS] 🔄 Attempting fallback to ${fallbackProvider}...`);
      
      let audioBlob: Blob;
      if (fallbackProvider === 'api') {
        audioBlob = await generateViaAPI(text, mergedOptions);
      } else {
        audioBlob = await generateViaSelfHosted(text, mergedOptions);
      }
      
      const duration = Date.now() - startTime;
      console.log(`[HOLLY TTS] ✅ Fallback success via ${fallbackProvider} in ${duration}ms`);
      
      return {
        audio: audioBlob,
        provider: fallbackProvider,
        duration,
        voice: mergedOptions.voice,
        wasFallback: true
      };
      
    } catch (fallbackError) {
      console.error(`[HOLLY TTS] ❌ All providers failed:`, fallbackError);
      throw new Error('HOLLY voice generation failed on all providers');
    }
  }
}

/**
 * Determine which provider to use
 */
function determineProvider(forceProvider?: 'api' | 'selfhosted'): 'api' | 'selfhosted' {
  if (forceProvider) {
    return forceProvider;
  }
  
  // If API has been failing, switch to self-hosted
  if (TTS_CONFIG.health.apiFailures >= 3 && TTS_CONFIG.selfHosted.enabled) {
    console.log('[HOLLY TTS] API degraded, using self-hosted');
    return 'selfhosted';
  }
  
  // If self-hosted is unavailable, use API
  if (!TTS_CONFIG.selfHosted.enabled) {
    return 'api';
  }
  
  return TTS_CONFIG.primaryProvider;
}

/**
 * Generate via Hugging Face API
 */
async function generateViaAPI(text: string, options: TTSOptions): Promise<Blob> {
  const { endpoint, token, timeout, maxRetries } = TTS_CONFIG.api;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[HOLLY TTS] API attempt ${attempt}/${maxRetries}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            voice: options.voice,
            speed: options.speed,
            lang: options.lang
          }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }
      
      const audioBlob = await response.blob();
      
      if (audioBlob.size === 0) {
        throw new Error('API returned empty audio');
      }
      
      return audioBlob;
      
    } catch (error) {
      console.error(`[HOLLY TTS] API attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        TTS_CONFIG.health.apiFailures++;
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error('API max retries exceeded');
}

/**
 * Generate via self-hosted server
 */
async function generateViaSelfHosted(text: string, options: TTSOptions): Promise<Blob> {
  if (!TTS_CONFIG.selfHosted.enabled) {
    throw new Error('Self-hosted provider is not enabled');
  }
  
  try {
    const response = await fetch(`${TTS_CONFIG.selfHosted.endpoint}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        voice: options.voice,
        speed: options.speed,
        lang: options.lang
      })
    });
    
    if (!response.ok) {
      throw new Error(`Self-hosted returned ${response.status}`);
    }
    
    return await response.blob();
    
  } catch (error) {
    TTS_CONFIG.health.selfHostedFailures++;
    throw new Error(`Self-hosted generation failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

/**
 * Get TTS health status
 */
export function getTTSHealth() {
  return {
    ...TTS_CONFIG.health,
    primaryProvider: TTS_CONFIG.primaryProvider,
    apiEnabled: true,
    selfHostedEnabled: TTS_CONFIG.selfHosted.enabled,
    voice: TTS_CONFIG.voice
  };
}

/**
 * Reset health metrics
 */
export function resetTTSHealth() {
  TTS_CONFIG.health.apiFailures = 0;
  TTS_CONFIG.health.selfHostedFailures = 0;
  console.log('[HOLLY TTS] Health metrics reset');
}

/**
 * Switch primary provider
 */
export function switchPrimaryProvider(provider: 'api' | 'selfhosted') {
  TTS_CONFIG.primaryProvider = provider;
  console.log(`[HOLLY TTS] Primary provider switched to: ${provider}`);
}

/**
 * Enable/disable self-hosted
 */
export function enableSelfHosted() {
  TTS_CONFIG.selfHosted.enabled = true;
  console.log('[HOLLY TTS] Self-hosted provider enabled');
}

export function disableSelfHosted() {
  TTS_CONFIG.selfHosted.enabled = false;
  console.log('[HOLLY TTS] Self-hosted provider disabled');
}

export default {
  generateHollySpeech,
  getTTSHealth,
  resetTTSHealth,
  switchPrimaryProvider,
  enableSelfHosted,
  disableSelfHosted
};
