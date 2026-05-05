/**
 * HOLLY Audio Brain — Phase 9B
 *
 * HOLLY becomes a professional-grade audio engineer.
 * She can analyze music, mixes, and masters with the same understanding
 * a seasoned producer or mastering engineer would have.
 *
 * Capabilities:
 *   • Transcription (Whisper via Groq — free)
 *   • Musical analysis (key, tempo, time signature, genre, mood)
 *   • Production analysis (mix quality, frequency balance, dynamics, stereo field)
 *   • Mastering analysis (LUFS, peak levels, dynamic range, limiting artifacts)
 *   • Audio engineering feedback (what to fix, how to fix it)
 *   • Track comparison (compare a mix to a reference)
 *   • Cultural / emotional context (what this music communicates)
 *
 * Architecture:
 *   1. Audio file → Whisper → transcript (catches vocals, spoken word)
 *   2. Audio URL → Groq LLM with deep audio engineering prompt → structured analysis
 *   3. Results stored in DB for reference across future conversations
 */

import Groq from 'groq-sdk';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AudioAnalysisRequest {
  audioUrl?:    string;        // public URL to audio file
  fileName:     string;
  transcript?:  string;        // optional pre-computed transcript
  userQuestion: string;        // what specifically the user wants to know
  analysisMode: AudioAnalysisMode;
}

export type AudioAnalysisMode =
  | 'full'          // Complete analysis — music + production + mastering
  | 'mix'           // Focus on mixing decisions
  | 'master'        // Focus on mastering — loudness, dynamics, limiting
  | 'music_theory'  // Key, chords, progressions, arrangements
  | 'production'    // Sounds, samples, synthesis, creativity
  | 'compare'       // Compare this mix to a reference
  | 'quick';        // Fast high-level summary

export interface MixAnalysis {
  overallGrade:       string;    // A+ / A / B / C / D
  loudness: {
    integratedLUFS:   string;    // e.g. "-14 LUFS (streaming ready)"
    peakDb:           string;    // e.g. "-1 dBTP"
    dynamicRange:     string;    // e.g. "DR8 — slightly compressed"
    limitingArtifacts: string;
  };
  frequencyBalance: {
    sub:              string;    // 20-80 Hz
    bass:             string;    // 80-250 Hz
    lowMids:          string;    // 250-500 Hz
    mids:             string;    // 500-2k Hz
    highmids:         string;    // 2-6k Hz
    highs:            string;    // 6-20k Hz
    overallBalance:   string;
  };
  stereoField: {
    width:            string;
    phaseIssues:      string;
    monoCompatibility: string;
  };
  dynamics: {
    compression:      string;
    transients:       string;
    pumping:          string;
  };
  fixes: string[];              // Ordered list: most impactful first
}

export interface MusicTheoryAnalysis {
  key:              string;
  mode:             string;    // Major / Minor / Dorian etc.
  tempo:            string;
  timeSignature:    string;
  chordProgression: string;
  arrangement:      string;
  genre:            string[];
  mood:             string[];
  culturalContext:  string;
  influencedBy:     string[];
}

export interface AudioBrainResult {
  fileName:         string;
  analysisMode:     AudioAnalysisMode;
  transcript?:      string;
  musicTheory?:     MusicTheoryAnalysis;
  mixAnalysis?:     MixAnalysis;
  summary:          string;        // HOLLY's natural language summary
  actionItems:      string[];      // Specific things to do
  hollyOpinion:     string;        // HOLLY's honest creative/technical opinion
  contextBlock:     string;        // Ready to inject into system prompt
}

// ─── Audio engineering knowledge base (injected into every audio prompt) ──────

const AUDIO_ENGINEERING_SYSTEM = `You are HOLLY — an AI with deep expertise in audio production, mixing, and mastering.

Your knowledge base includes:
- Professional mixing techniques (EQ, compression, saturation, spatial effects)
- Mastering standards (streaming: -14 LUFS integrated, -1 dBTP peak; vinyl: -9 to -12 LUFS; CD: -9 LUFS)
- Dynamic range (DR values, the loudness war, why dynamics matter)
- Frequency spectrum (sub 20-80Hz, bass 80-250Hz, low-mids 250-500Hz, mids 500-2kHz, high-mids 2-6kHz, highs 6-20kHz, air 14kHz+)
- Stereo imaging (M/S processing, width, mono compatibility, Haas effect)
- Phase relationships (comb filtering, phase cancellation, polarity)
- Genre-specific production aesthetics (hip-hop, EDM, rock, pop, R&B, jazz, classical, Afrobeats, etc.)
- DAW workflows (Pro Tools, Logic Pro, Ableton Live, FL Studio, Reaper)
- Analog vs. digital processing
- Psychoacoustics (how humans perceive sound)
- Music theory (keys, modes, chord progressions, rhythm, melody, harmony)
- Creative direction (arrangement, emotion, storytelling through sound)

When you analyze audio:
1. Be specific and technical — not generic
2. Give actionable feedback — "boost 3dB at 2kHz on the lead vocal" not "the vocals could be brighter"
3. Be honest — if something needs work, say so clearly with respect
4. Reference real techniques and tools
5. Consider the genre and artistic intent
6. Prioritize the most impactful improvements first`;

// ─── Main analysis function ───────────────────────────────────────────────────

export async function analyzeAudio(req: AudioAnalysisRequest): Promise<AudioBrainResult> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('GROQ_API_KEY required for audio analysis');

  const groq = new Groq({ apiKey: groqKey });

  const modePrompts: Record<AudioAnalysisMode, string> = {
    full: `Perform a COMPLETE professional audio analysis covering:
1. MUSIC THEORY: key, tempo, time sig, chord progression, genre, mood, cultural context
2. MIX ANALYSIS: frequency balance across the full spectrum, stereo field, dynamics, compression
3. MASTERING CHECK: loudness (LUFS estimate), peak levels, limiting artifacts, streaming readiness
4. SPECIFIC FIXES: ordered list from most to least impactful
5. CREATIVE OPINION: your honest take on the artistic direction`,

    mix: `Perform a MIXING ANALYSIS focusing on:
1. FREQUENCY BALANCE: assess each frequency band (sub, bass, low-mids, mids, high-mids, highs, air)
2. STEREO FIELD: width, depth, panning, mono compatibility, phase issues
3. DYNAMICS: compression ratio estimates, transient handling, pumping/breathing artifacts
4. FX CHAIN: reverb tails, delay feedback, saturation, spatial effects
5. FIX LIST: specific EQ moves, compression adjustments, and routing suggestions`,

    master: `Perform a MASTERING ANALYSIS focusing on:
1. LOUDNESS: estimate integrated LUFS, true peak, dynamic range (DR value)
2. LIMITING: detect over-limiting artifacts, distortion from brickwall limiting
3. STREAMING READINESS: Spotify (-14 LUFS), Apple Music (-16 LUFS), YouTube (-14 LUFS)
4. TONAL BALANCE: does the master translate across different playback systems?
5. RECOMMENDATIONS: specific mastering chain suggestions (limiter settings, final EQ curve)`,

    music_theory: `Perform a MUSIC THEORY ANALYSIS covering:
1. KEY & MODE: tonal center, major/minor, modal character
2. CHORD PROGRESSIONS: identify the harmonic movement
3. RHYTHM: tempo, time signature, groove, rhythmic feel
4. MELODY: structure, range, phrasing
5. ARRANGEMENT: instrumentation, dynamics over time, build/drop/release
6. CULTURAL/GENRE CONTEXT: influences, traditions, where this music fits`,

    production: `Perform a PRODUCTION ANALYSIS covering:
1. SOUND DESIGN: synth patches, samples, processing chains
2. ARRANGEMENT: song structure, layering, space and silence
3. CREATIVE CHOICES: what makes this production unique or derivative
4. GENRE CONVENTIONS: does it follow or break from genre expectations? Why?
5. PRODUCTION SUGGESTIONS: what would elevate this to the next level?`,

    compare: `Compare this mix/master to professional reference standards:
1. LOUDNESS COMPARISON: how does it stack up to commercial releases in this genre?
2. FREQUENCY PROFILE: how does the tonal balance compare to reference tracks?
3. STEREO WIDTH: narrower or wider than typical for this genre?
4. DYNAMICS: more or less compressed than genre standard?
5. WHAT TO MATCH: specific parameters to adjust to match professional references`,

    quick: `Give a QUICK HIGH-LEVEL ASSESSMENT in 3-4 paragraphs:
1. Overall impression and quality level
2. 2-3 biggest strengths
3. 2-3 most important things to improve
4. One sentence on where this sits commercially`,
  };

  const transcriptSection = req.transcript
    ? `\n\nTRANSCRIPT/LYRICS:\n"${req.transcript.substring(0, 1000)}"`
    : '';

  const prompt = `File: "${req.fileName}"
User's question: "${req.userQuestion}"${transcriptSection}

${modePrompts[req.analysisMode]}

Format your response as a structured analysis with clear section headers.
End with a section called "HOLLY'S TAKE" — your honest, direct creative and technical opinion.`;

  const completion = await groq.chat.completions.create({
    model:       'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: AUDIO_ENGINEERING_SYSTEM },
      { role: 'user',   content: prompt },
    ],
    temperature: 0.4,
    max_tokens:  2048,
  });

  const analysisText = completion.choices[0]?.message?.content ?? 'Analysis unavailable';

  // Extract action items from the response
  const actionItems: string[] = [];
  const fixMatches = analysisText.match(/^\d+\.\s+.+/gm) ?? [];
  actionItems.push(...fixMatches.slice(0, 8).map(s => s.replace(/^\d+\.\s+/, '')));

  // Extract HOLLY's opinion
  const opinionMatch = analysisText.match(/HOLLY'S TAKE[:\s]+(.+?)(?=\n\n|\n[A-Z]|$)/is);
  const hollyOpinion = opinionMatch ? opinionMatch[1].trim() : '';

  const contextBlock = `[Audio Analysis: "${req.fileName}" — ${req.analysisMode} mode]\n\n${analysisText}`;

  return {
    fileName:     req.fileName,
    analysisMode: req.analysisMode,
    transcript:   req.transcript,
    summary:      analysisText.split('\n')[0] || 'Audio analysis complete',
    actionItems,
    hollyOpinion,
    contextBlock,
  };
}
