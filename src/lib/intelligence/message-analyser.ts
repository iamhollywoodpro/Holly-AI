/**
 * HOLLY Message Analyser — Phase 3A
 *
 * Replaces the word-matching heuristics in extractTopics() and
 * EmotionalIntelligence.detectEmotion() with a single fast LLM call
 * (Groq llama-3.1-8b-instant — ~200ms, minimal tokens).
 *
 * One call extracts three things at once:
 *   1. topics       — what the user is actually talking about
 *   2. emotion      — the user's emotional state
 *   3. tasteSignals — implicit style preferences to record
 *
 * Falls back to the old heuristics on any error so the chat pipeline
 * is never blocked.
 *
 * Import: import { analyseMessage, MessageAnalysis } from '@/lib/intelligence/message-analyser'
 */

import Groq from 'groq-sdk';

// ─── types ────────────────────────────────────────────────────────────────────

export interface TasteSignalHint {
  category: 'tone' | 'length' | 'format' | 'humor' | 'emoji' | 'technical' | 'topic';
  item: string;
  signal: 'positive' | 'negative' | 'neutral';
}

export interface MessageAnalysis {
  /** 3–8 substantive topic keywords */
  topics: string[];
  /** Detected primary emotion */
  emotion: {
    primary: string;   // e.g. "frustrated", "curious", "excited"
    valence: number;   // -1.0 → +1.0
    arousal: number;   //  0.0 → 1.0
    intensity: number; //  0.0 → 1.0
  };
  /** Implicit style preference signals to record in TasteSignal table */
  tasteSignals: TasteSignalHint[];
  /** Was this result from the LLM (true) or the fallback heuristics (false)? */
  fromLLM: boolean;
}

// ─── singleton groq client ────────────────────────────────────────────────────

let _groq: Groq | null = null;
function getGroq(): Groq {
  if (!_groq) _groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });
  return _groq;
}

// ─── prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a message analyser for an AI assistant. 
Given a user message and the assistant's response, return ONLY valid JSON with this exact structure:
{
  "topics": ["topic1", "topic2"],
  "emotion": { "primary": "string", "valence": 0.0, "arousal": 0.0, "intensity": 0.0 },
  "tasteSignals": [{ "category": "tone|length|format|humor|emoji|technical|topic", "item": "string", "signal": "positive|negative|neutral" }]
}

Rules:
- topics: 3-8 specific, meaningful keywords (NOT generic words like "help" or "question")
- emotion.primary: one word describing the user's emotion (curious, frustrated, excited, grateful, confused, determined, neutral, etc.)
- emotion.valence: -1.0 (very negative) to 1.0 (very positive)
- emotion.arousal: 0.0 (very calm) to 1.0 (very energised)
- emotion.intensity: 0.0 (not emotional) to 1.0 (very emotional)
- tasteSignals: only include if clearly signalled in the message (0-3 signals max)
  - tone signals: "formal" or "casual" if user writes in a noticeably formal/casual way
  - length signals: "concise" if user asks for shorter, "detailed" if they ask for more
  - humor signals: "humor" if user jokes or uses LOL/haha etc.
  - technical signals: "expert" if very technical, "beginner" if explicitly asking for simple explanation
  - format signals: "bullets" if user asks for list, "prose" if they ask not to use bullets
  - emoji signals: "emoji" if user uses 2+ emoji in the message
  - topic signals: the main subject the user cares about most (1 per message)
Return ONLY the JSON object, no other text.`;

// ─── main export ──────────────────────────────────────────────────────────────

/**
 * Analyse a user message + assistant response with the LLM.
 * Falls back to heuristics if Groq is unavailable or the key is missing.
 *
 * @param userMessage      The user's raw message
 * @param assistantResponse  The assistant's reply (used for format signal detection)
 * @returns                MessageAnalysis
 */
export async function analyseMessage(
  userMessage: string,
  assistantResponse?: string
): Promise<MessageAnalysis> {
  // Skip LLM for very short messages (not worth the latency)
  if (userMessage.trim().length < 10) {
    return heuristicFallback(userMessage, assistantResponse);
  }

  if (!process.env.GROQ_API_KEY) {
    return heuristicFallback(userMessage, assistantResponse);
  }

  try {
    const userContent = assistantResponse
      ? `User message: "${userMessage.slice(0, 600)}"\nAssistant response (first 300 chars): "${assistantResponse.slice(0, 300)}"`
      : `User message: "${userMessage.slice(0, 600)}"`;

    const completion = await getGroq().chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 300,
      response_format: { type: 'json_object' },
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);

    return {
      topics: validateTopics(parsed.topics),
      emotion: validateEmotion(parsed.emotion),
      tasteSignals: validateTasteSignals(parsed.tasteSignals),
      fromLLM: true,
    };
  } catch (err) {
    console.warn('[MessageAnalyser] LLM call failed, using heuristics:', (err as Error).message);
    return heuristicFallback(userMessage, assistantResponse);
  }
}

// ─── validators ───────────────────────────────────────────────────────────────

function validateTopics(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is string => typeof t === 'string' && t.length > 2)
    .map(t => t.toLowerCase().trim())
    .slice(0, 8);
}

function validateEmotion(raw: unknown): MessageAnalysis['emotion'] {
  const defaults = { primary: 'neutral', valence: 0, arousal: 0.4, intensity: 0.5 };
  if (!raw || typeof raw !== 'object') return defaults;
  const r = raw as Record<string, unknown>;
  return {
    primary: typeof r.primary === 'string' ? r.primary : 'neutral',
    valence: clamp(typeof r.valence === 'number' ? r.valence : 0, -1, 1),
    arousal: clamp(typeof r.arousal === 'number' ? r.arousal : 0.4, 0, 1),
    intensity: clamp(typeof r.intensity === 'number' ? r.intensity : 0.5, 0, 1),
  };
}

function validateTasteSignals(raw: unknown): TasteSignalHint[] {
  if (!Array.isArray(raw)) return [];
  const validCategories = new Set(['tone', 'length', 'format', 'humor', 'emoji', 'technical', 'topic']);
  const validSignals = new Set(['positive', 'negative', 'neutral']);
  return raw
    .filter(
      (s): s is TasteSignalHint =>
        s && typeof s === 'object' &&
        validCategories.has((s as any).category) &&
        validSignals.has((s as any).signal) &&
        typeof (s as any).item === 'string'
    )
    .slice(0, 3);
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// ─── heuristic fallback ───────────────────────────────────────────────────────

function heuristicFallback(
  userMessage: string,
  assistantResponse?: string
): MessageAnalysis {
  return {
    topics: extractTopicsHeuristic(userMessage),
    emotion: detectEmotionHeuristic(userMessage),
    tasteSignals: detectTasteHeuristic(userMessage, assistantResponse),
    fromLLM: false,
  };
}

function extractTopicsHeuristic(text: string): string[] {
  const stopWords = new Set([
    'the','a','an','is','it','in','on','at','to','for','of','and','or','but',
    'not','with','this','that','i','you','we','my','your','can','do','how',
    'what','when','where','why','please','help','just','like','make','need',
    'want','would','could','should','about','from','have','has','been',
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 4 && !stopWords.has(w))
    .slice(0, 8);
}

function detectEmotionHeuristic(text: string): MessageAnalysis['emotion'] {
  const lower = text.toLowerCase();
  if (/\b(frustrated|stuck|can't|won't work|keeps failing|ugh|annoying)\b/.test(lower))
    return { primary: 'frustrated', valence: -0.5, arousal: 0.7, intensity: 0.7 };
  if (/\b(excited|amazing|awesome|can't wait|wow|finally|yes!)\b/.test(lower))
    return { primary: 'excited', valence: 0.8, arousal: 0.8, intensity: 0.8 };
  if (/\b(happy|great|love|perfect|excellent|fantastic)\b/.test(lower))
    return { primary: 'happy', valence: 0.7, arousal: 0.5, intensity: 0.6 };
  if (/\b(confused|don't understand|unclear|what do you mean)\b/.test(lower))
    return { primary: 'confused', valence: -0.2, arousal: 0.4, intensity: 0.5 };
  if (/\b(curious|wondering|interested|how does|why does)\b/.test(lower))
    return { primary: 'curious', valence: 0.3, arousal: 0.5, intensity: 0.5 };
  if (/\b(thanks|thank you|appreciate|grateful)\b/.test(lower))
    return { primary: 'grateful', valence: 0.6, arousal: 0.3, intensity: 0.5 };
  return { primary: 'neutral', valence: 0, arousal: 0.3, intensity: 0.3 };
}

function detectTasteHeuristic(
  userMessage: string,
  assistantResponse?: string
): TasteSignalHint[] {
  const signals: TasteSignalHint[] = [];
  const msg = userMessage.toLowerCase();

  if (/\b(shorter|brief|tldr|tl;dr|concise|in short)\b/.test(msg))
    signals.push({ category: 'length', item: 'concise', signal: 'positive' });
  if (/\b(more detail|elaborate|explain more|expand|go deeper)\b/.test(msg))
    signals.push({ category: 'length', item: 'detailed', signal: 'positive' });
  if (/\b(formal|professional)\b/.test(msg))
    signals.push({ category: 'tone', item: 'formal', signal: 'positive' });
  if (/\b(haha|lol|lmao|funny|joke)\b/.test(msg))
    signals.push({ category: 'humor', item: 'humor', signal: 'positive' });
  if (assistantResponse) {
    if (/^\s*[-*•]/m.test(assistantResponse) && userMessage.length > 20)
      signals.push({ category: 'format', item: 'bullet_lists', signal: 'positive' });
  }
  return signals;
}
