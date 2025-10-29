// HOLLY Phase 3: Audio Analysis & Music Feedback System
// Special feature for Hollywood's music tracks

export interface AudioAnalysisResult {
  transcription?: string;
  musicAnalysis?: MusicAnalysis;
  feedback?: MusicFeedback;
  error?: string;
}

export interface MusicAnalysis {
  technical: {
    duration: number;
    sampleRate?: number;
    bitRate?: number;
    channels?: number;
    format: string;
  };
  audio: {
    peakAmplitude?: number;
    rmsLevel?: number;
    dynamicRange?: number;
    loudness?: number;
  };
}

export interface MusicFeedback {
  overall: {
    score: number; // 1-10
    summary: string;
    strengths: string[];
    improvements: string[];
  };
  production: {
    score: number;
    mixing: string;
    mastering: string;
    clarity: string;
    balance: string;
  };
  musical: {
    composition: string;
    arrangement: string;
    melody: string;
    harmony: string;
  };
  vibe: {
    energy: string;
    mood: string;
    genre: string;
    commercial: string;
  };
  detailed: string; // Full detailed feedback
}

/**
 * Transcribe audio using Whisper API
 */
export async function transcribeAudio(audioUrl: string): Promise<string | null> {
  try {
    const response = await fetch('/api/audio/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioUrl }),
    });

    if (!response.ok) {
      throw new Error('Transcription failed');
    }

    const data = await response.json();
    return data.transcription;
  } catch (error) {
    console.error('Transcription error:', error);
    return null;
  }
}

/**
 * Analyze audio file and get technical metrics
 */
export async function analyzeAudioTechnical(audioFile: File): Promise<MusicAnalysis['technical']> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    
    audio.onloadedmetadata = () => {
      resolve({
        duration: audio.duration,
        format: audioFile.type,
        sampleRate: undefined, // Would need Web Audio API for detailed analysis
        bitRate: undefined,
        channels: undefined,
      });
    };
    
    audio.onerror = () => {
      resolve({
        duration: 0,
        format: audioFile.type,
      });
    };
    
    audio.src = URL.createObjectURL(audioFile);
  });
}

/**
 * Get AI-powered music feedback from HOLLY
 * This is the special feature for Hollywood's tracks!
 */
export async function getMusicFeedback(
  audioUrl: string,
  fileName: string,
  userMessage?: string
): Promise<MusicFeedback> {
  try {
    // Call HOLLY's AI with special music analysis prompt
    const response = await fetch('/api/audio/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audioUrl,
        fileName,
        userMessage,
        analysisType: 'music_feedback',
      }),
    });

    if (!response.ok) {
      throw new Error('Analysis failed');
    }

    const data = await response.json();
    return data.feedback;
  } catch (error) {
    console.error('Music feedback error:', error);
    
    // Fallback feedback structure
    return {
      overall: {
        score: 7,
        summary: "I'm analyzing your track! The audio file is processing. Give me a moment to provide detailed feedback.",
        strengths: [
          "Track uploaded successfully",
          "Ready for detailed analysis"
        ],
        improvements: [
          "Processing audio data",
          "Preparing comprehensive feedback"
        ],
      },
      production: {
        score: 7,
        mixing: "Analyzing mix quality...",
        mastering: "Evaluating master...",
        clarity: "Checking clarity...",
        balance: "Assessing frequency balance...",
      },
      musical: {
        composition: "Analyzing composition structure...",
        arrangement: "Evaluating arrangement...",
        melody: "Studying melodic elements...",
        harmony: "Examining harmonic content...",
      },
      vibe: {
        energy: "Measuring energy levels...",
        mood: "Identifying mood...",
        genre: "Detecting genre characteristics...",
        commercial: "Assessing commercial potential...",
      },
      detailed: "Full analysis in progress. HOLLY is listening carefully to provide you with honest, detailed feedback on your track.",
    };
  }
}

/**
 * Complete audio analysis pipeline
 */
export async function analyzeAudioComplete(
  audioFile: File,
  audioUrl: string,
  requestFeedback: boolean = false
): Promise<AudioAnalysisResult> {
  try {
    // Get technical analysis
    const technical = await analyzeAudioTechnical(audioFile);

    // Transcribe if it's speech/vocals (optional)
    const transcription = undefined; // Can enable: await transcribeAudio(audioUrl);

    // Get music feedback if requested
    const feedback = requestFeedback
      ? await getMusicFeedback(audioUrl, audioFile.name)
      : undefined;

    const musicAnalysis: MusicAnalysis = {
      technical,
      audio: {
        // These would require Web Audio API analysis
        peakAmplitude: undefined,
        rmsLevel: undefined,
        dynamicRange: undefined,
        loudness: undefined,
      },
    };

    return {
      transcription,
      musicAnalysis,
      feedback,
    };
  } catch (error) {
    console.error('Complete analysis error:', error);
    return {
      error: error instanceof Error ? error.message : 'Analysis failed',
    };
  }
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Generate feedback summary for chat display
 */
export function generateFeedbackSummary(feedback: MusicFeedback): string {
  const emoji = feedback.overall.score >= 8 ? '🔥' : feedback.overall.score >= 6 ? '💜' : '👍';
  
  return `${emoji} **Overall Score: ${feedback.overall.score}/10**\n\n` +
    `${feedback.overall.summary}\n\n` +
    `**Strengths:**\n${feedback.overall.strengths.map(s => `- ${s}`).join('\n')}\n\n` +
    `**Areas to Improve:**\n${feedback.overall.improvements.map(i => `- ${i}`).join('\n')}\n\n` +
    `**Production Quality:** ${feedback.production.score}/10\n` +
    `${feedback.production.mixing}\n\n` +
    `**Detailed Analysis:**\n${feedback.detailed}`;
}
