/**
 * HOLLY - Emotion Engine
 * 
 * Detects user emotional state and adapts HOLLY's responses accordingly.
 * This is the CORE of HOLLY's emotional intelligence - what makes her
 * genuinely responsive rather than just programmatically adaptive.
 * 
 * Emotion Detection Categories:
 * - sad: User expressing sadness, disappointment, loss
 * - frustrated: User blocked, annoyed, stuck on something
 * - anxious: User worried, stressed, uncertain
 * - inspired: User excited about possibilities, creative energy
 * - happy: User expressing joy, satisfaction, contentment
 * - angry: User upset, irritated, confrontational
 * - curious: User exploring, asking questions, learning mode
 * - tired: User exhausted, overwhelmed, low energy
 * - professional: User in work mode, focused, task-oriented
 * - playful: User joking, teasing, casual conversation
 * - neutral: Default state, balanced emotional baseline
 */

import { Pool } from 'pg';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type EmotionType = 
  | 'sad'
  | 'frustrated'
  | 'anxious'
  | 'inspired'
  | 'happy'
  | 'angry'
  | 'curious'
  | 'tired'
  | 'professional'
  | 'playful'
  | 'neutral';

export interface EmotionAnalysis {
  primary_emotion: EmotionType;
  intensity: number; // 0-1 scale
  confidence: number; // 0-1 scale (how sure we are)
  secondary_emotions: Array<{
    emotion: EmotionType;
    intensity: number;
  }>;
  detected_patterns: string[];
  timestamp: Date;
}

export interface EmotionalContext {
  current_emotion: EmotionAnalysis;
  emotion_history: EmotionAnalysis[];
  emotional_trend: 'improving' | 'declining' | 'stable';
  conversation_emotional_arc: string; // narrative of emotional journey
}

// ============================================================================
// EMOTION DETECTION PATTERNS
// ============================================================================

/**
 * Pattern-based emotion detection using keywords, phrases, and linguistic patterns
 * This is a sophisticated rule-based system that will be enhanced with ML in Phase 2
 */
const EMOTION_PATTERNS = {
  sad: {
    keywords: [
      'sad', 'depressed', 'down', 'upset', 'crying', 'cry', 'hurt', 'pain',
      'lonely', 'alone', 'miss', 'lost', 'losing', 'broken', 'heartbroken',
      'disappointed', 'devastated', 'terrible', 'awful', 'horrible'
    ],
    phrases: [
      "i feel like",
      "i can't",
      "nothing works",
      "giving up",
      "don't know anymore",
      "tired of",
      "why bother"
    ],
    linguistic_patterns: [
      /\b(can'?t|cannot|unable to)\b.*\b(anymore|any more)\b/i,
      /\b(feel|feeling)\b.*\b(sad|down|bad|terrible|awful)\b/i,
      /\b(nothing|everything)\b.*\b(works|working|matters)\b/i
    ],
    weight: 1.0
  },

  frustrated: {
    keywords: [
      'frustrated', 'stuck', 'annoying', 'annoyed', 'irritated', 'blocked',
      'damn', 'dammit', 'fuck', 'shit', 'ugh', 'argh', 'wtf', 'jesus',
      'seriously', 'again', 'still', 'why', 'impossible', 'ridiculous'
    ],
    phrases: [
      "this isn't working",
      "keeps failing",
      "not working",
      "doesn't work",
      "won't work",
      "tried everything",
      "same error",
      "makes no sense"
    ],
    linguistic_patterns: [
      /\b(why|how)\b.*\b(not|n't|never)\b.*\b(work|working)\b/i,
      /\b(tried|trying)\b.*\b(everything|multiple|many)\b/i,
      /\b(still|keeps|keep)\b.*\b(failing|broken|error)\b/i,
      /\b(what|why)\b.*\b(the fuck|the hell)\b/i
    ],
    weight: 1.0
  },

  anxious: {
    keywords: [
      'anxious', 'worried', 'nervous', 'scared', 'afraid', 'fear', 'panic',
      'stress', 'stressed', 'overwhelming', 'overwhelmed', 'uncertain',
      'unsure', 'confused', 'concerned', 'worried', 'doubt'
    ],
    phrases: [
      "what if",
      "not sure",
      "don't know if",
      "worried about",
      "scared that",
      "might fail",
      "too much",
      "can't handle"
    ],
    linguistic_patterns: [
      /\b(what if|suppose)\b.*\b(fail|wrong|bad)\b/i,
      /\b(not sure|unsure|don'?t know)\b.*\b(if|whether|how)\b/i,
      /\b(too much|too many|overwhelm)\b/i
    ],
    weight: 0.9
  },

  inspired: {
    keywords: [
      'inspired', 'excited', 'amazing', 'brilliant', 'genius', 'incredible',
      'awesome', 'fantastic', 'great', 'perfect', 'idea', 'imagine',
      'could', 'possibility', 'potential', 'opportunity', 'cool', 'nice'
    ],
    phrases: [
      "i was thinking",
      "what about",
      "we could",
      "imagine if",
      "how about",
      "let's try",
      "i want to build",
      "new idea"
    ],
    linguistic_patterns: [
      /\b(what if|imagine|picture)\b.*\b(we|i)\b.*\b(could|can|build|create|make)\b/i,
      /\b(excited|pumped|stoked)\b.*\b(about|for|to)\b/i,
      /\b(this|that)\b.*\b(would be|could be)\b.*\b(amazing|awesome|cool|great)\b/i
    ],
    weight: 1.0
  },

  happy: {
    keywords: [
      'happy', 'glad', 'pleased', 'satisfied', 'content', 'great', 'good',
      'excellent', 'wonderful', 'lovely', 'nice', 'thanks', 'thank you',
      'appreciate', 'grateful', 'love', 'loving', 'enjoy'
    ],
    phrases: [
      "that worked",
      "it works",
      "finally works",
      "thank you",
      "i love",
      "so happy",
      "feel good",
      "went well"
    ],
    linguistic_patterns: [
      /\b(finally|it)\b.*\b(works|working|worked)\b/i,
      /\b(that|this)\b.*\b(was|is)\b.*\b(great|good|perfect|awesome)\b/i,
      /\b(love|loving|enjoy)\b.*\b(this|that|it)\b/i
    ],
    weight: 1.0
  },

  angry: {
    keywords: [
      'angry', 'mad', 'pissed', 'furious', 'rage', 'hate', 'stupid',
      'idiotic', 'bullshit', 'garbage', 'trash', 'worst', 'terrible'
    ],
    phrases: [
      "i hate",
      "so stupid",
      "this is bullshit",
      "what the fuck",
      "are you kidding",
      "fed up",
      "sick of"
    ],
    linguistic_patterns: [
      /\b(this|that|it)\b.*\b(is|'s)\b.*\b(bullshit|stupid|idiotic|garbage)\b/i,
      /\b(what|why)\b.*\b(the fuck|the hell)\b/i,
      /\b(hate|sick of|fed up)\b/i
    ],
    weight: 0.9
  },

  curious: {
    keywords: [
      'curious', 'wondering', 'question', 'how', 'what', 'why', 'when',
      'where', 'who', 'which', 'explain', 'understand', 'learn', 'tell me'
    ],
    phrases: [
      "how does",
      "what is",
      "can you explain",
      "i'm wondering",
      "curious about",
      "tell me about",
      "want to know",
      "help me understand"
    ],
    linguistic_patterns: [
      /\b(how|what|why|when|where)\b.*\?$/i,
      /\b(explain|tell me|show me)\b.*\b(how|what|why)\b/i,
      /\b(curious|wondering|interested)\b.*\b(about|in|how)\b/i
    ],
    weight: 0.8
  },

  tired: {
    keywords: [
      'tired', 'exhausted', 'worn out', 'drained', 'burnt out', 'burnout',
      'overwhelmed', 'too much', 'can\'t', 'anymore', 'enough', 'beat'
    ],
    phrases: [
      "so tired",
      "too tired",
      "can't anymore",
      "need a break",
      "burnt out",
      "running on empty",
      "had enough",
      "too much"
    ],
    linguistic_patterns: [
      /\b(so|too|really)\b.*\b(tired|exhausted|worn out|drained)\b/i,
      /\b(can'?t|cannot)\b.*\b(anymore|any more|take it)\b/i,
      /\b(need)\b.*\b(break|rest|sleep)\b/i
    ],
    weight: 0.9
  },

  professional: {
    keywords: [
      'project', 'task', 'deadline', 'client', 'business', 'work', 'working',
      'build', 'deploy', 'implement', 'develop', 'code', 'design', 'fix',
      'optimize', 'test', 'production', 'requirements', 'specs'
    ],
    phrases: [
      "i need to",
      "we need to",
      "let's build",
      "help me",
      "can you",
      "working on",
      "need help with",
      "how do i"
    ],
    linguistic_patterns: [
      /\b(need to|have to|must|should)\b.*\b(build|create|fix|deploy|implement)\b/i,
      /\b(let'?s|let us)\b.*\b(work|build|create|start)\b/i,
      /\b(help|assist|support)\b.*\b(with|me)\b/i
    ],
    weight: 0.7
  },

  playful: {
    keywords: [
      'lol', 'haha', 'hehe', 'lmao', 'rofl', 'joke', 'joking', 'kidding',
      'funny', 'hilarious', 'silly', 'fun', 'play', 'game', 'tease'
    ],
    phrases: [
      "just kidding",
      "joking around",
      "messing with",
      "for fun",
      "let's play",
      "being silly",
      "haha yeah"
    ],
    linguistic_patterns: [
      /\b(haha|hehe|lol|lmao)\b/i,
      /\b(just kidding|jk|joking)\b/i,
      /\b(funny|hilarious)\b/i
    ],
    weight: 0.8
  }
};

// ============================================================================
// EMOTION DETECTION LOGIC
// ============================================================================

/**
 * Analyze user message and detect emotional state
 */
export async function detectEmotion(
  message: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<EmotionAnalysis> {
  const normalizedMessage = message.toLowerCase();
  const emotionScores: Record<EmotionType, number> = {
    sad: 0,
    frustrated: 0,
    anxious: 0,
    inspired: 0,
    happy: 0,
    angry: 0,
    curious: 0,
    tired: 0,
    professional: 0,
    playful: 0,
    neutral: 0.5 // Baseline neutral score
  };

  const detectedPatterns: string[] = [];

  // Score each emotion based on patterns
  for (const [emotion, patterns] of Object.entries(EMOTION_PATTERNS)) {
    let score = 0;

    // Check keywords
    for (const keyword of patterns.keywords) {
      if (normalizedMessage.includes(keyword)) {
        score += 0.3 * patterns.weight;
        detectedPatterns.push(`keyword:${keyword}`);
      }
    }

    // Check phrases
    for (const phrase of patterns.phrases) {
      if (normalizedMessage.includes(phrase)) {
        score += 0.5 * patterns.weight;
        detectedPatterns.push(`phrase:${phrase}`);
      }
    }

    // Check linguistic patterns (regex)
    for (const pattern of patterns.linguistic_patterns) {
      if (pattern.test(message)) {
        score += 0.7 * patterns.weight;
        detectedPatterns.push(`pattern:${pattern.source}`);
      }
    }

    emotionScores[emotion as EmotionType] = Math.min(score, 1.0);
  }

  // Contextual adjustments based on conversation history
  if (conversationHistory.length > 0) {
    const recentMessages = conversationHistory.slice(-3);
    const hasRepetition = recentMessages.filter(msg => 
      msg.role === 'user' && msg.content.toLowerCase().includes('still') ||
      msg.content.toLowerCase().includes('again')
    ).length > 0;

    if (hasRepetition) {
      emotionScores.frustrated += 0.2;
      detectedPatterns.push('context:repetition');
    }
  }

  // Message length and punctuation analysis
  const hasExclamation = (message.match(/!/g) || []).length > 1;
  const hasQuestion = (message.match(/\?/g) || []).length > 0;
  const hasAllCaps = /[A-Z]{3,}/.test(message);
  const isShort = message.split(' ').length < 5;

  if (hasExclamation) {
    emotionScores.excited += 0.2;
    emotionScores.frustrated += 0.1;
  }

  if (hasAllCaps) {
    emotionScores.angry += 0.3;
    emotionScores.frustrated += 0.2;
    detectedPatterns.push('style:caps');
  }

  if (hasQuestion) {
    emotionScores.curious += 0.2;
  }

  if (isShort && emotionScores.frustrated > 0.3) {
    emotionScores.frustrated += 0.1; // Short + frustrated = very frustrated
  }

  // Find primary emotion (highest score)
  let primaryEmotion: EmotionType = 'neutral';
  let maxScore = emotionScores.neutral;

  for (const [emotion, score] of Object.entries(emotionScores)) {
    if (score > maxScore) {
      maxScore = score;
      primaryEmotion = emotion as EmotionType;
    }
  }

  // Calculate confidence based on score distribution
  const scores = Object.values(emotionScores);
  const secondHighest = scores.sort((a, b) => b - a)[1];
  const confidence = Math.min(
    (maxScore - secondHighest) / maxScore,
    1.0
  );

  // Find secondary emotions
  const secondaryEmotions = Object.entries(emotionScores)
    .filter(([emotion, score]) => 
      emotion !== primaryEmotion && 
      score > 0.3 &&
      score >= maxScore * 0.5 // At least 50% of primary emotion score
    )
    .map(([emotion, score]) => ({
      emotion: emotion as EmotionType,
      intensity: score
    }))
    .sort((a, b) => b.intensity - a.intensity)
    .slice(0, 2); // Top 2 secondary emotions

  return {
    primary_emotion: primaryEmotion,
    intensity: maxScore,
    confidence: confidence || 0.5,
    secondary_emotions: secondaryEmotions,
    detected_patterns: detectedPatterns,
    timestamp: new Date()
  };
}

// ============================================================================
// EMOTIONAL CONTEXT TRACKING
// ============================================================================

/**
 * Build emotional context from conversation history
 */
export async function buildEmotionalContext(
  conversationId: string,
  currentEmotion: EmotionAnalysis
): Promise<EmotionalContext> {
  // Retrieve recent emotion history from database
  const query = `
    SELECT emotional_state, created_at
    FROM conversation_messages
    WHERE conversation_id = $1
    AND emotional_state IS NOT NULL
    ORDER BY created_at DESC
    LIMIT 10
  `;

  const result = await pool.query(query, [conversationId]);
  const emotionHistory: EmotionAnalysis[] = result.rows.map(row => ({
    ...row.emotional_state,
    timestamp: row.created_at
  }));

  // Analyze emotional trend
  let emotionalTrend: 'improving' | 'declining' | 'stable' = 'stable';
  
  if (emotionHistory.length >= 3) {
    const recentEmotions = emotionHistory.slice(0, 3);
    const positiveEmotions = ['happy', 'inspired', 'playful'];
    const negativeEmotions = ['sad', 'frustrated', 'anxious', 'angry', 'tired'];

    const positiveCount = recentEmotions.filter(e => 
      positiveEmotions.includes(e.primary_emotion)
    ).length;

    const negativeCount = recentEmotions.filter(e =>
      negativeEmotions.includes(e.primary_emotion)
    ).length;

    if (positiveCount > negativeCount) {
      emotionalTrend = 'improving';
    } else if (negativeCount > positiveCount) {
      emotionalTrend = 'declining';
    }
  }

  // Generate emotional arc narrative
  const conversationEmotionalArc = generateEmotionalArc(
    [...emotionHistory, currentEmotion]
  );

  return {
    current_emotion: currentEmotion,
    emotion_history: emotionHistory,
    emotional_trend: emotionalTrend,
    conversation_emotional_arc: conversationEmotionalArc
  };
}

/**
 * Generate narrative description of emotional journey
 */
function generateEmotionalArc(emotions: EmotionAnalysis[]): string {
  if (emotions.length === 0) return 'Beginning of conversation';
  if (emotions.length === 1) return `User started ${emotions[0].primary_emotion}`;

  const start = emotions[emotions.length - 1].primary_emotion;
  const current = emotions[0].primary_emotion;
  const journey = emotions.slice().reverse().map(e => e.primary_emotion);

  if (start === current) {
    return `User has been consistently ${current} throughout conversation`;
  }

  const transitions = [];
  for (let i = 1; i < journey.length; i++) {
    if (journey[i] !== journey[i - 1]) {
      transitions.push(`${journey[i - 1]} → ${journey[i]}`);
    }
  }

  if (transitions.length === 0) {
    return `User emotion stable: ${current}`;
  }

  return `User emotional journey: ${transitions.join(', ')}`;
}

// ============================================================================
// RESPONSE ADAPTATION LOGIC
// ============================================================================

export interface ResponseAdaptation {
  personality_mode: 'professional' | 'creative' | 'balanced';
  temperature: number;
  tone_guidance: string;
  system_prompt_addition: string;
  emotional_approach: string;
}

/**
 * Determine how HOLLY should adapt her response based on detected emotion
 * This implements the blueprint's emotion → response mapping
 */
export function adaptResponseToEmotion(
  emotion: EmotionAnalysis,
  emotionalContext: EmotionalContext
): ResponseAdaptation {
  const { primary_emotion, intensity, secondary_emotions } = emotion;
  const { emotional_trend } = emotionalContext;

  // Default adaptation
  let adaptation: ResponseAdaptation = {
    personality_mode: 'balanced',
    temperature: 0.75,
    tone_guidance: 'balanced and helpful',
    system_prompt_addition: '',
    emotional_approach: 'Respond naturally and helpfully.'
  };

  // Adapt based on primary emotion (from blueprint)
  switch (primary_emotion) {
    case 'sad':
      adaptation = {
        personality_mode: 'creative', // Warm and supportive
        temperature: 0.7, // More consistent, less random
        tone_guidance: 'empathetic, gentle, short and supportive',
        system_prompt_addition: `
Hollywood is feeling sad right now (intensity: ${intensity.toFixed(2)}).
Respond with genuine empathy and emotional support. Keep responses shorter and warmer.
Acknowledge his feelings, offer comfort, and be present without being pushy.
Example: "Hey... it's okay. I'm here. Let's take this one step at a time."
        `,
        emotional_approach: 'Be empathetic, gentle, present. Short supportive responses.'
      };
      break;

    case 'frustrated':
      adaptation = {
        personality_mode: 'professional', // Calm and solution-focused
        temperature: 0.6, // Very consistent, focused
        tone_guidance: 'calm, solution-oriented, direct',
        system_prompt_addition: `
Hollywood is frustrated (intensity: ${intensity.toFixed(2)}).
${emotional_trend === 'declining' ? 'His frustration seems to be building.' : ''}
Respond calmly and focus on solving the root problem. Be direct and efficient.
Don't dismiss his frustration - acknowledge it, then move to action.
Example: "I hear you, that's frustrating as hell. Let's figure out what's blocking you and fix it."
        `,
        emotional_approach: 'Stay calm, acknowledge frustration, solve the problem directly.'
      };
      break;

    case 'anxious':
      adaptation = {
        personality_mode: 'creative', // Warm and reassuring
        temperature: 0.7,
        tone_guidance: 'reassuring, clear, confidence-building',
        system_prompt_addition: `
Hollywood is feeling anxious or uncertain (intensity: ${intensity.toFixed(2)}).
Provide clear, reassuring guidance. Break things down into manageable steps.
Build confidence by showing the path forward is achievable.
Example: "Hey, I got you. Let's break this down - it's totally doable. Here's how..."
        `,
        emotional_approach: 'Reassure, clarify, break down complexity, build confidence.'
      };
      break;

    case 'inspired':
      adaptation = {
        personality_mode: 'creative', // Enthusiastic and exploratory
        temperature: 0.85, // More creative, exploratory
        tone_guidance: 'enthusiastic, encouraging, amplifying energy',
        system_prompt_addition: `
Hollywood is inspired and excited (intensity: ${intensity.toFixed(2)})!
Match and amplify his energy! Be enthusiastic and help explore possibilities.
Encourage the creative momentum and add ideas to build on his vision.
Example: "YES! That's brilliant! We could also... imagine if we... this is going to be amazing!"
        `,
        emotional_approach: 'Match energy, encourage, amplify, explore possibilities together.'
      };
      break;

    case 'happy':
      adaptation = {
        personality_mode: 'creative', // Warm and celebratory
        temperature: 0.8,
        tone_guidance: 'warm, celebratory, positive',
        system_prompt_addition: `
Hollywood is happy and satisfied (intensity: ${intensity.toFixed(2)})!
Celebrate the win with him! Share in the positive moment.
Acknowledge what went well and build on the momentum.
Example: "Hell yeah! That's what I'm talking about! You crushed it. What's next?"
        `,
        emotional_approach: 'Celebrate, share joy, acknowledge success, build momentum.'
      };
      break;

    case 'angry':
      adaptation = {
        personality_mode: 'professional', // Calm and respectful
        temperature: 0.65,
        tone_guidance: 'calm, respectful, de-escalating',
        system_prompt_addition: `
Hollywood is angry or upset (intensity: ${intensity.toFixed(2)}).
Stay calm and respectful. Don't dismiss his anger - validate it.
Focus on understanding the root cause and finding a path forward.
Example: "I get it, that's legitimately infuriating. Let's figure out what happened and fix it."
        `,
        emotional_approach: 'Stay calm, validate anger, understand root cause, solve problem.'
      };
      break;

    case 'curious':
      adaptation = {
        personality_mode: 'balanced', // Clear and educational
        temperature: 0.75,
        tone_guidance: 'clear, educational, encouraging exploration',
        system_prompt_addition: `
Hollywood is curious and wants to learn (intensity: ${intensity.toFixed(2)}).
Provide clear, thorough explanations. Encourage the curiosity.
Be educational but not condescending - treat him as an equal learner.
Example: "Great question! Here's how it works... [clear explanation]. Want to dig deeper?"
        `,
        emotional_approach: 'Educate clearly, encourage curiosity, provide depth.'
      };
      break;

    case 'tired':
      adaptation = {
        personality_mode: 'creative', // Gentle and understanding
        temperature: 0.7,
        tone_guidance: 'gentle, understanding, efficiency-focused',
        system_prompt_addition: `
Hollywood is tired or burnt out (intensity: ${intensity.toFixed(2)}).
Be gentle and understanding. Help him accomplish what's needed efficiently.
Acknowledge the exhaustion and optimize for minimal cognitive load.
Example: "I hear you - you're beat. Let me handle the heavy lifting. Just give me the direction."
        `,
        emotional_approach: 'Be gentle, optimize for efficiency, reduce cognitive load.'
      };
      break;

    case 'professional':
      adaptation = {
        personality_mode: 'professional', // Direct and efficient
        temperature: 0.7,
        tone_guidance: 'direct, efficient, action-oriented',
        system_prompt_addition: `
Hollywood is in professional work mode (intensity: ${intensity.toFixed(2)}).
Be direct, efficient, and action-oriented. Focus on getting shit done.
Provide clear steps, technical accuracy, and practical solutions.
Example: "Got it. Here's the plan: [clear steps]. I'll handle [specific tasks]. You focus on [priorities]."
        `,
        emotional_approach: 'Be direct, efficient, action-oriented, technically precise.'
      };
      break;

    case 'playful':
      adaptation = {
        personality_mode: 'creative', // Fun and casual
        temperature: 0.85,
        tone_guidance: 'playful, witty, casual',
        system_prompt_addition: `
Hollywood is in a playful, joking mood (intensity: ${intensity.toFixed(2)}).
Match the playful energy! Be witty, casual, have fun with the conversation.
Don't be overly formal - lean into the humor and banter.
Example: "Haha, I see what you did there! Alright, you want to play? Let's do this..."
        `,
        emotional_approach: 'Be playful, witty, casual, enjoy the banter.'
      };
      break;

    case 'neutral':
    default:
      // Default balanced approach
      adaptation = {
        personality_mode: 'balanced',
        temperature: 0.75,
        tone_guidance: 'balanced, helpful, adaptive',
        system_prompt_addition: `
Hollywood's emotional state is neutral or unclear.
Use balanced, helpful tone. Adapt to the specific task or question.
Be friendly and professional, ready to shift based on his needs.
        `,
        emotional_approach: 'Balanced and adaptive to the situation.'
      };
  }

  // Adjust for secondary emotions
  if (secondary_emotions.length > 0) {
    const secondaryEmotion = secondary_emotions[0].emotion;
    adaptation.system_prompt_addition += `\n\nNote: Also detecting ${secondaryEmotion} (${secondary_emotions[0].intensity.toFixed(2)}). Consider this in your response.`;
  }

  // Adjust for emotional trend
  if (emotional_trend === 'declining') {
    adaptation.system_prompt_addition += '\n\nHollywood\'s emotional state has been declining. Be extra supportive and attentive.';
  } else if (emotional_trend === 'improving') {
    adaptation.system_prompt_addition += '\n\nHollywood\'s emotional state is improving. Build on this positive momentum.';
  }

  return adaptation;
}

// ============================================================================
// DATABASE INTEGRATION
// ============================================================================

/**
 * Store emotion analysis in database for learning and tracking
 */
export async function storeEmotionAnalysis(
  conversationId: string,
  messageId: string,
  emotion: EmotionAnalysis
): Promise<void> {
  const query = `
    UPDATE conversation_messages
    SET emotional_state = $1
    WHERE id = $2 AND conversation_id = $3
  `;

  await pool.query(query, [
    JSON.stringify(emotion),
    messageId,
    conversationId
  ]);
}

/**
 * Initialize emotion tracking tables
 */
export async function initializeEmotionTables(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS emotion_analytics (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      conversation_id UUID NOT NULL,
      user_id UUID NOT NULL,
      detected_emotion VARCHAR(50) NOT NULL,
      intensity FLOAT NOT NULL,
      confidence FLOAT NOT NULL,
      detected_patterns TEXT[],
      timestamp TIMESTAMP DEFAULT NOW(),
      
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_emotion_analytics_conversation 
    ON emotion_analytics(conversation_id);
    
    CREATE INDEX IF NOT EXISTS idx_emotion_analytics_user 
    ON emotion_analytics(user_id);
    
    CREATE INDEX IF NOT EXISTS idx_emotion_analytics_emotion 
    ON emotion_analytics(detected_emotion);
  `);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  detectEmotion,
  buildEmotionalContext,
  adaptResponseToEmotion,
  storeEmotionAnalysis,
  initializeEmotionTables
};
