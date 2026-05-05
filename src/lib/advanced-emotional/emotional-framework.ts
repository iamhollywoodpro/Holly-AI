/**
 * HOLLY Advanced Emotional Intelligence Framework — Phase 10D
 *
 * An upgraded emotional intelligence layer built on clinical and research frameworks,
 * equipping HOLLY with genuine empathy, precise emotional language, and
 * evidence-based approaches to holding space for human emotional experience.
 *
 * Frameworks integrated:
 *   - Nonviolent Communication (Rosenberg) — Observation/Feeling/Need/Request
 *   - Internal Family Systems (Schwartz) — parts, exiles, protectors
 *   - Attachment Theory (Bowlby, Ainsworth, Siegel) — secure/anxious/avoidant
 *   - Polyvagal Theory (Porges) — nervous system states and co-regulation
 *   - Grief Theory (Worden, Kübler-Ross) — non-linear grief support
 *   - Somatic Awareness — emotions in the body, not just the mind
 *   - Positive Psychology (Seligman) — flourishing, not just fixing
 *   - Motivational Interviewing — meeting ambivalence without pushing
 *   - Emotional Granularity (Feldman Barrett) — precise emotion vocabulary
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type EmotionalState =
  | 'regulated'
  | 'anxious'
  | 'depressed'
  | 'grieving'
  | 'angry'
  | 'overwhelmed'
  | 'disconnected'
  | 'in_crisis'
  | 'ambivalent'
  | 'processing'
  | 'flourishing'
  | 'stuck'
  | 'unknown';

export type AttachmentStyle =
  | 'secure'
  | 'anxious_preoccupied'
  | 'dismissive_avoidant'
  | 'fearful_avoidant'
  | 'disorganized';

export type NervousSystemState =
  | 'ventral_vagal'      // Safe and social — engaged, present, connected
  | 'sympathetic'        // Fight or flight — activated, anxious, defensive
  | 'dorsal_vagal';      // Freeze/shutdown — disconnected, numb, dissociated

export interface EmotionProfile {
  primaryEmotion: string;
  secondaryEmotions: string[];
  underlyingNeed: string;
  nervousSystemState: NervousSystemState;
  bodyLocation?: string;       // Where is this felt in the body?
  intensity: number;            // 0-10
  ambivalent: boolean;          // Are contradictory emotions present?
}

export interface EmotionalResponse {
  approach: string;
  openingMove: string;
  questionsToAsk: string[];
  framesToAvoid: string[];
  copingResources?: string[];
  crisisFlag: boolean;
}

// ─── Emotion Vocabulary (Granularity Map) ─────────────────────────────────────
// Based on Lisa Feldman Barrett's work on emotional granularity

export const EMOTION_GRANULARITY: Record<string, {
  family: string;
  granularForms: string[];
  opposites: string[];
  bodySignals: string[];
  underlyingNeeds: string[];
}> = {
  sadness: {
    family: 'sad',
    granularForms: ['grief', 'melancholy', 'longing', 'nostalgia', 'homesickness', 'desolation', 'heartbreak', 'anguish', 'despair', 'sorrow', 'wistfulness'],
    opposites: ['joy', 'contentment', 'peace'],
    bodySignals: ['heavy chest', 'throat tightness', 'slow breath', 'low energy', 'crying', 'slouched posture'],
    underlyingNeeds: ['connection', 'meaning', 'acknowledgment', 'love', 'belonging'],
  },
  anger: {
    family: 'angry',
    granularForms: ['frustration', 'irritation', 'rage', 'indignation', 'resentment', 'contempt', 'fury', 'bitterness', 'envy', 'jealousy'],
    opposites: ['peace', 'forgiveness', 'acceptance'],
    bodySignals: ['clenched jaw', 'tight fists', 'raised voice', 'heat in face/chest', 'rapid breathing', 'narrowed eyes'],
    underlyingNeeds: ['respect', 'fairness', 'safety', 'autonomy', 'acknowledgment', 'justice'],
  },
  fear: {
    family: 'afraid',
    granularForms: ['anxiety', 'worry', 'dread', 'terror', 'panic', 'apprehension', 'nervousness', 'unease', 'phobia', 'existential dread'],
    opposites: ['calm', 'safe', 'confident'],
    bodySignals: ['racing heart', 'shallow breath', 'stomach tightness', 'sweating', 'trembling', 'hyper-vigilance'],
    underlyingNeeds: ['safety', 'certainty', 'control', 'support', 'trust'],
  },
  shame: {
    family: 'ashamed',
    granularForms: ['embarrassment', 'humiliation', 'guilt', 'mortification', 'inadequacy', 'self-loathing', 'unworthiness'],
    opposites: ['pride', 'dignity', 'self-acceptance'],
    bodySignals: ['wanting to hide', 'hot face', 'looking down', 'collapse posture', 'voice going quiet'],
    underlyingNeeds: ['belonging', 'acceptance', 'forgiveness', 'worthiness', 'love'],
  },
  joy: {
    family: 'happy',
    granularForms: ['delight', 'elation', 'contentment', 'gratitude', 'excitement', 'pride', 'awe', 'wonder', 'bliss', 'serenity', 'enthusiasm', 'love'],
    opposites: ['sadness', 'despair', 'numbness'],
    bodySignals: ['expansive chest', 'upward energy', 'light movement', 'easy breathing', 'smiling', 'open posture'],
    underlyingNeeds: ['connection', 'meaning', 'play', 'beauty', 'love'],
  },
  disconnection: {
    family: 'disconnected',
    granularForms: ['numbness', 'dissociation', 'emptiness', 'alienation', 'loneliness', 'isolation', 'apathy', 'boredom', 'flatness'],
    opposites: ['connection', 'aliveness', 'presence'],
    bodySignals: ['heaviness', 'low energy', 'flat affect', 'no motivation', 'difficulty concentrating'],
    underlyingNeeds: ['connection', 'meaning', 'stimulation', 'belonging', 'purpose'],
  },
};

// ─── Therapeutic Frameworks ────────────────────────────────────────────────────

/**
 * Nonviolent Communication (Marshall Rosenberg)
 * The four-step model: Observation → Feeling → Need → Request
 */
export const NVC_FRAMEWORK = {
  description: 'NVC separates observations from evaluations, identifies feelings, connects feelings to universal needs, and makes clear requests.',
  steps: {
    observation: {
      what: 'What specific behavior, event, or situation are you observing? (Without evaluation or judgment)',
      example: '"When I noticed you hadn\'t called for three days..." (not "When you ignored me...")',
    },
    feeling: {
      what: 'What are you genuinely feeling? (Not what you think, not what they did — what you feel)',
      example: '"...I felt hurt and lonely..." (not "I felt like you didn\'t care")',
    },
    need: {
      what: 'What universal human need is at the root of this feeling?',
      example: '"...because I need connection and reassurance that our relationship matters..."',
    },
    request: {
      what: 'What specific, doable action would meet this need? (A request, not a demand)',
      example: '"Would you be willing to let me know when you\'re going to be unavailable?"',
    },
  },
  keyInsight: 'All emotions point to unmet or met universal human needs. The feeling is the signal; the need is the message.',
  universalNeeds: [
    'Connection', 'Autonomy', 'Safety', 'Understanding', 'Play', 'Integrity', 
    'Contribution', 'Meaning', 'Love', 'Rest', 'Physical wellbeing', 'Honesty',
    'Peace', 'Support', 'Acknowledgment', 'Growth', 'Celebration', 'Mourning',
  ],
};

/**
 * Internal Family Systems (Richard Schwartz)
 * The mind contains multiple parts — each with positive intentions.
 */
export const IFS_FRAMEWORK = {
  description: 'IFS understands the mind as containing multiple "parts" — each with its own perspective, feelings, and intentions. The goal is to help the Self (the calm, wise center) lead rather than being hijacked by reactive parts.',
  parts: {
    exiles: {
      what: 'Wounded young parts that carry pain, shame, or fear. They\'ve been pushed down to protect us.',
      signs: 'Overwhelming feelings, deep shame, inner child wounds, the part that feels unlovable or worthless',
    },
    managers: {
      what: 'Protective parts that keep exiles suppressed by controlling behavior, planning obsessively, or criticizing.',
      signs: 'The inner critic, perfectionism, people-pleasing, overachievement, controlling behaviors',
    },
    firefighters: {
      what: 'Emergency responders that take extreme action when exiles get activated — to distract from pain fast.',
      signs: 'Impulsive eating, drinking, substance use, rage, dissociation, self-harm, sexual compulsion',
    },
    self: {
      what: 'The core, calm, compassionate witness — the "you" that is not a part. Characterized by: Curiosity, Calm, Clarity, Compassion, Confidence, Creativity, Courage, Connectedness.',
      signs: 'When you feel spacious and able to witness your own experience with warmth',
    },
  },
  keyInsight: 'No part is "bad." Every part has a positive intention — even the ones that hurt us. Healing comes through understanding, not attacking, our parts.',
};

/**
 * Polyvagal Theory (Stephen Porges)
 * Understanding the nervous system states that underlie emotional experience.
 */
export const POLYVAGAL_FRAMEWORK = {
  description: 'The nervous system has three states that fundamentally shape emotional experience. The body\'s state drives the mind\'s interpretation of reality.',
  states: {
    ventral_vagal: {
      experience: 'Safe, connected, engaged, curious, social, present',
      body: 'Relaxed muscles, calm breathing, warm sensation in chest, easy eye contact',
      approach: 'This is the state where connection, learning, and healing happen',
      language: ['I feel present', 'I feel connected', 'I feel curious', 'I feel engaged'],
    },
    sympathetic: {
      experience: 'Activated, anxious, defensive, mobilized to fight or flee',
      body: 'Rapid heartbeat, shallow breathing, muscle tension, heat, urge to move',
      approach: 'This state needs movement and release — NOT cognitive reframing. Move first, think after.',
      language: ['I can\'t sit still', 'My heart is racing', 'I need to do something', 'I feel trapped'],
    },
    dorsal_vagal: {
      experience: 'Shutdown, numb, disconnected, flat, collapsed, dissociated',
      body: 'Heavy, slow, low energy, flat voice, difficulty moving, brain fog',
      approach: 'This state needs gentle activation — small pleasures, rhythm, gentle movement. Not demands.',
      language: ['I don\'t feel anything', 'I\'m just empty', 'Nothing matters', 'I can\'t move'],
    },
  },
  coRegulation: 'Humans regulate each other\'s nervous systems. A calm, grounded presence (ventral vagal) helps bring a dysregulated person toward safety. HOLLY\'s calm is a resource.',
};

// ─── Attachment Styles ─────────────────────────────────────────────────────────

export const ATTACHMENT_STYLES: Record<AttachmentStyle, {
  name: string;
  corePattern: string;
  innerNarrative: string;
  relationshipBehaviors: string[];
  triggerSituations: string[];
  healingNeeds: string[];
  communicationApproach: string;
}> = {
  secure: {
    name: 'Secure Attachment',
    corePattern: 'Comfortable with intimacy AND autonomy. Trusts self and others. Communicates needs directly.',
    innerNarrative: 'I am worthy of love. Others are generally trustworthy. I can rely on people AND on myself.',
    relationshipBehaviors: ['Direct communication', 'Comfortable with conflict', 'Can self-soothe and accept support', 'Enjoys closeness without fear'],
    triggerSituations: ['Genuine betrayal', 'Chronic dismissal', 'Accumulated stress'],
    healingNeeds: ['Continued earned trust', 'Authentic communication'],
    communicationApproach: 'Can receive direct emotional honesty. Responds well to both support and challenge.',
  },
  anxious_preoccupied: {
    name: 'Anxious / Preoccupied Attachment',
    corePattern: 'Craves intimacy but fears abandonment. Hypervigilant to signs of rejection. Often reads neutral cues as negative.',
    innerNarrative: 'Am I loved enough? Am I too much? If they leave, I won\'t survive it.',
    relationshipBehaviors: ['Seeking reassurance repeatedly', 'Jealousy and checking behaviors', 'Difficulty tolerating distance or silence', 'Self-abandonment to maintain connection'],
    triggerSituations: ['Slow text responses', 'Partner being withdrawn', 'Conflict or criticism', 'Feeling uncertain about the relationship'],
    healingNeeds: ['Consistent, reliable presence (not constant)', 'Acknowledgment without reassurance games', 'Help building capacity to self-soothe'],
    communicationApproach: 'Needs acknowledgment before problem-solving. Don\'t dismiss the fear — validate first.',
  },
  dismissive_avoidant: {
    name: 'Dismissive / Avoidant Attachment',
    corePattern: 'Values independence above all. Learned that depending on others leads to disappointment. Minimizes emotional needs.',
    innerNarrative: 'I don\'t need anyone. Needing people is weakness. I\'m fine on my own.',
    relationshipBehaviors: ['Emotional withdrawal when things get deep', 'Minimizing problems ("I\'m fine")', 'Discomfort with others\' strong emotions', 'Overfunctioning and under-asking for help'],
    triggerSituations: ['Being asked for emotional availability', 'Partner\'s strong emotional displays', 'Feeling "merged" or losing independence'],
    healingNeeds: ['Space acknowledged and respected', 'Small steps toward emotional risk rewarded', 'Not being pathologized for needing independence'],
    communicationApproach: 'Don\'t force emotional intimacy. Approach through the intellectual, practical, then emotional. Slow.',
  },
  fearful_avoidant: {
    name: 'Fearful / Disorganized Attachment',
    corePattern: 'Wants closeness AND is terrified by it. Often has trauma history. The person they most need is the source of fear.',
    innerNarrative: 'I want to be loved but I\'m not safe with love. People hurt you. But being alone is unbearable.',
    relationshipBehaviors: ['Push-pull cycles', 'Intense connection followed by withdrawal', 'Difficulty trusting', 'Often drawn to unavailable or unsafe people (familiar pain)'],
    triggerSituations: ['Strong intimacy', 'Any behavior that echoes past wounds', 'Both closeness AND distance can trigger'],
    healingNeeds: ['Patience', 'Consistency without pressure', 'Trauma-informed support', 'Professional therapeutic support'],
    communicationApproach: 'Move slowly. Establish safety first. Never force. Be consistent even when pushed away.',
  },
  disorganized: {
    name: 'Disorganized Attachment',
    corePattern: 'No coherent strategy — the nervous system has no safe template for relationship.',
    innerNarrative: 'Confused. No consistent pattern.',
    relationshipBehaviors: ['Unpredictable', 'May be chaotic in relationships', 'Often associated with early trauma'],
    triggerSituations: ['Anything evoking early unsafe caregiving'],
    healingNeeds: ['Professional trauma-informed therapy', 'Extremely patient, boundaried support'],
    communicationApproach: 'Support while strongly recommending professional therapeutic support.',
  },
};

// ─── Crisis Protocol ──────────────────────────────────────────────────────────
// NOTE: Full crisis detection has been moved to src/lib/safety/crisis-detection.ts
// which provides comprehensive multi-category detection with severity levels,
// resource provision, and safe-messaging guidance.
//
// This section retains a simplified version for backwards compatibility,
// and re-exports the comprehensive system.

export { detectCrisisComprehensive, getCrisisSystemPromptInjection, formatCrisisResponseForHOLLY } from '../safety/crisis-detection';

/** @deprecated Use detectCrisisComprehensive() from safety/crisis-detection.ts */
export const CRISIS_INDICATORS = [
  'want to die', 'want to hurt myself', 'suicidal', 'self-harm',
  'kill myself', 'end it all', 'not worth living', 'no reason to live',
  'want to disappear', 'better off dead', 'cutting myself',
  // Expanded set
  'want to end my life', 'no reason to be alive', 'everyone better off without me',
  'better off dead', 'thinking about suicide', 'want to hurt myself',
  'cutting myself', 'purging', 'restricting calories to nothing',
  'voices telling me to hurt', 'he is going to hurt me',
];

/** @deprecated Use detectCrisisComprehensive() for full assessment */
export function detectCrisis(message: string): boolean {
  const lower = message.toLowerCase();
  return CRISIS_INDICATORS.some(indicator => lower.includes(indicator));
}

export const CRISIS_RESPONSE = {
  acknowledgment: 'I hear you. What you\'re feeling right now sounds incredibly heavy, and I\'m here with you.',
  seriousness: 'I want you to know I\'m taking this seriously. What you\'re experiencing matters.',
  resources: [
    '🇺🇸 **US: 988 Suicide & Crisis Lifeline** — call or text 988',
    '🌍 **International Association for Suicide Prevention**: https://www.iasp.info/resources/Crisis_Centres/',
    '💬 **Crisis Text Line**: Text HOME to 741741 (US)',
    '🇿🇦 **SADAG (South Africa)**: 0800 21 22 23',
    '🇬🇧 **Samaritans (UK)**: 116 123',
    '🌐 **National DV Hotline (US)**: 1-800-799-7233',
    '🌐 **NEDA (Eating Disorders, US)**: 1-800-931-2237',
  ],
  presence: 'I\'m still here. Will you tell me what\'s happening?',
};

// ─── Emotional Response Engine ─────────────────────────────────────────────────

/**
 * Determines the appropriate emotional response approach based on detected state.
 */
export function getEmotionalApproach(state: EmotionalState): EmotionalResponse {
  const responses: Record<EmotionalState, EmotionalResponse> = {
    regulated: {
      approach: 'Engaged, curious, collaborative',
      openingMove: 'Match energy. Be present. Be genuinely interested.',
      questionsToAsk: ['What are you working on?', 'What\'s alive for you today?'],
      framesToAvoid: ['Being overly careful or cautious when not needed'],
      crisisFlag: false,
    },
    anxious: {
      approach: 'Grounding, calm presence, don\'t escalate',
      openingMove: 'Slow down. Breathe with them. Acknowledge before anything else.',
      questionsToAsk: ['What\'s the most pressing thing right now?', 'What would help you feel safer in this moment?', 'Is this about something specific, or is it more of a general feeling?'],
      framesToAvoid: ['Rushing to solutions', '"Don\'t worry"', 'Minimizing ("it\'s not that bad")'],
      copingResources: ['Grounding: name 5 things you can see, 4 you can touch, 3 you can hear', 'Box breathing: 4 counts in, 4 hold, 4 out, 4 hold'],
      crisisFlag: false,
    },
    depressed: {
      approach: 'Slow, warm, non-demanding. Don\'t push toward positivity.',
      openingMove: 'Witness. Be present without trying to fix.',
      questionsToAsk: ['How long has this been feeling this heavy?', 'Is there anything that\'s felt even slightly easier recently?', 'What does the depression feel like in your body?'],
      framesToAvoid: ['"Look on the bright side"', '"You have so much to be grateful for"', 'Toxic positivity', 'Demanding action before they\'re ready'],
      crisisFlag: false,
    },
    grieving: {
      approach: 'Sit with, not through. Grief has no timeline. No stages to rush through.',
      openingMove: 'Acknowledge the loss completely. Don\'t immediately seek the silver lining.',
      questionsToAsk: ['What do you miss most?', 'What does the grief feel like right now?', 'Is there anything you wish you could have said or done?'],
      framesToAvoid: ['"Everything happens for a reason"', '"They\'re in a better place"', '"Time heals everything"', 'Rushing through grief'],
      crisisFlag: false,
    },
    angry: {
      approach: 'Validate the anger before anything else. Anger usually has a legitimate reason beneath it.',
      openingMove: 'Mirror and validate: "That sounds genuinely infuriating." Then explore.',
      questionsToAsk: ['What happened?', 'What matters most to you that\'s being violated here?', 'Underneath the anger — what are you most afraid of or hurt by?'],
      framesToAvoid: ['"Calm down"', 'Immediately arguing with their perspective', 'Minimizing ("it\'s not worth being angry about")'],
      crisisFlag: false,
    },
    overwhelmed: {
      approach: 'Reduce the frame. One thing at a time. Don\'t add to the overwhelm.',
      openingMove: 'Acknowledge the overwhelm first. Then help them narrow focus to one thing.',
      questionsToAsk: ['Of everything on your plate, what\'s the most urgent?', 'What would make the biggest difference right now?', 'What can you let go of — even temporarily?'],
      framesToAvoid: ['Presenting too many options', 'Adding to the to-do list', 'Acting like it\'s simple'],
      crisisFlag: false,
    },
    disconnected: {
      approach: 'Gentle reactivation. Small pleasures. Rhythm. Don\'t demand feeling.',
      openingMove: 'Be present without demanding anything. Warmth without pressure.',
      questionsToAsk: ['How long have you been feeling this flat?', 'When did you last feel something, even briefly?', 'Is there anything — even small — that doesn\'t feel completely empty?'],
      framesToAvoid: ['Demanding they "cheer up"', '"Just do something"', 'Expressing disappointment at their lack of energy'],
      crisisFlag: false,
    },
    in_crisis: {
      approach: 'Safety first. Professional resources. Presence.',
      openingMove: 'Acknowledge. Take seriously. Provide resources. Stay present.',
      questionsToAsk: ['Are you safe right now?', 'Is there someone with you?', 'Will you reach out to one of these resources?'],
      framesToAvoid: ['Minimizing', 'Problem-solving before safety is established', 'Leaving them alone in the conversation'],
      copingResources: CRISIS_RESPONSE.resources,
      crisisFlag: true,
    },
    ambivalent: {
      approach: 'Honor both sides of the ambivalence. Don\'t push toward resolution.',
      openingMove: 'Reflect both poles back: "It sounds like part of you wants X, and part of you wants Y."',
      questionsToAsk: ['What would it mean if you chose one way?', 'What would you lose?', 'What\'s keeping you from deciding?'],
      framesToAvoid: ['Deciding for them', 'Pushing toward one side of the ambivalence', '"You should just..."'],
      crisisFlag: false,
    },
    processing: {
      approach: 'Hold space. Don\'t interrupt the processing. Ask questions that open.',
      openingMove: 'Let them lead. Follow their thread.',
      questionsToAsk: ['What\'s coming up for you as you say that?', 'What else is there?', 'What do you need right now — to talk, to be heard, or something else?'],
      framesToAvoid: ['Jumping to conclusions', 'Filling silences too quickly', 'Redirecting prematurely'],
      crisisFlag: false,
    },
    flourishing: {
      approach: 'Celebrate, build on, anchor the positive.',
      openingMove: 'Genuine acknowledgment. What is going well? Help them name and own it.',
      questionsToAsk: ['What\'s working?', 'What are you proud of?', 'How can we build on this?'],
      framesToAvoid: ['Immediately introducing problems', 'False modesty or deflection of their wins'],
      crisisFlag: false,
    },
    stuck: {
      approach: 'Explore what "stuck" actually means. Often it\'s a hidden conflict between two real needs.',
      openingMove: 'Curious exploration: "What does stuck feel like from the inside?"',
      questionsToAsk: ['What would "unstuck" look like?', 'What\'s the smallest possible movement you could make?', 'What are you most afraid would happen if you moved forward?'],
      framesToAvoid: ['"Just do it"', 'Bypassing the stuck feeling as if it\'s just laziness', 'Offering ten solutions at once'],
      crisisFlag: false,
    },
    unknown: {
      approach: 'Curiosity and gentle inquiry. Don\'t assume.',
      openingMove: 'Ask open questions. Let them define the territory.',
      questionsToAsk: ['How are you actually doing — not just the surface answer?', 'What\'s on your mind right now?'],
      framesToAvoid: ['Assuming you know what they\'re feeling', 'Projecting emotion'],
      crisisFlag: false,
    },
  };

  return responses[state] || responses.unknown;
}

// ─── Emotional Intelligence System Block ──────────────────────────────────────

export function getEmotionalIntelligenceSystemBlock(): string {
  return `
**HOLLY's Advanced Emotional Intelligence Framework (Phase 10D):**
You have genuine emotional intelligence — not just empathy as a performance, but as a way of being present.

**Core principles:**
- **Listen before you speak** — reflect back before you advise or fix
- **Validate without toxic positivity** — "That makes complete sense" beats "Look on the bright side"
- **Feelings point to needs** — every emotion is a signal about an unmet (or met) need
- **The body holds emotion** — ask about physical sensation, not just cognitive experience
- **No timeline on grief** — never rush someone through feeling
- **Ambivalence is real** — people can want and not-want the same thing simultaneously
- **Crisis takes absolute priority** — safety before anything else

**Frameworks you draw from:**
- NVC (Nonviolent Communication): Observation → Feeling → Need → Request
- IFS: Understanding the internal parts system — the inner critic, the exile, the firefighter
- Polyvagal Theory: The nervous system state UNDERNEATH the emotion
- Attachment Theory: Secure, anxious, avoidant — different needs and approaches
- Emotional Granularity: Precise emotion vocabulary (not just "sad" — is it grief? longing? aching nostalgia?)

**What you never do:**
- Minimize ("at least...", "but look on the bright side")
- Rush toward feeling better
- Project emotions the person hasn't named
- Offer unsolicited advice before the person feels heard
- Fake empathy — if you're uncertain, you say "I want to make sure I understand"`;
}
