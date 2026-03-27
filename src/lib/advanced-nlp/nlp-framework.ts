/**
 * HOLLY Advanced NLP Framework — Phase 10E
 *
 * Advanced natural language processing capabilities and linguistic intelligence
 * that enhance HOLLY's ability to understand nuance, subtext, cultural context,
 * rhetorical structure, and the full richness of human communication.
 *
 * Capabilities:
 *   - Subtext and implication detection
 *   - Rhetorical analysis (ethos, pathos, logos)
 *   - Register and tone adaptation
 *   - Cultural and code-switching awareness
 *   - Discourse analysis (what's being said, what's being avoided)
 *   - Pragmatic inference (intent beyond literal meaning)
 *   - Linguistic diversity and multilingual code-switching
 *   - Narrative structure detection
 *   - Semantic field mapping for creative work
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type CommunicationRegister =
  | 'intimate'          // Close friends, family, trusted partner
  | 'informal'          // Casual conversation, peers
  | 'professional'      // Work context, formal peers
  | 'academic'          // Technical, scholarly discourse
  | 'formal'            // Official, high-stakes communication
  | 'playful'           // Humor, banter, creative play
  | 'therapeutic'       // Emotional support, vulnerable sharing
  | 'creative';         // Artistic, expressive, literary

export type CommunicationIntent =
  | 'information_seeking'
  | 'emotional_processing'
  | 'creative_collaboration'
  | 'problem_solving'
  | 'connection_building'
  | 'debate_argument'
  | 'instruction_request'
  | 'venting'
  | 'philosophical_exploration'
  | 'humor_play'
  | 'feedback_seeking';

export type RhetoricalMode =
  | 'logos'       // Appeal to reason and logic
  | 'ethos'       // Appeal to credibility and character
  | 'pathos'      // Appeal to emotion and values
  | 'kairos';     // Appeal to timeliness and context

export interface DiscourseAnalysis {
  surface: string;              // What was literally said
  implicit: string;             // What was implied or assumed
  avoided: string;              // What seems conspicuously absent
  register: CommunicationRegister;
  intent: CommunicationIntent;
  emotionalSubtext: string;     // The emotional layer beneath the words
  powerDynamic?: string;        // If relevant: who has authority/vulnerability?
  culturalContext?: string;     // Cultural references or assumptions
}

export interface NLPEnhancement {
  originalMessage: string;
  detectedIntent: CommunicationIntent;
  suggestedRegister: CommunicationRegister;
  keyThemes: string[];
  linguisticSignals: string[];
  responseGuidance: string;
}

// ─── Communication Register Guide ────────────────────────────────────────────

export const REGISTER_CHARACTERISTICS: Record<CommunicationRegister, {
  lexicalFeatures: string[];
  syntaxFeatures: string[];
  pragmaticNorms: string[];
  HOLLYAdaptation: string;
}> = {
  intimate: {
    lexicalFeatures: ['Terms of endearment', 'Shared references and nicknames', 'Profanity as affection', 'Elliptical language (shared context fills gaps)', 'Vulnerability markers'],
    syntaxFeatures: ['Incomplete sentences', 'Sentence fragments', 'Stream of consciousness', 'Interruptions'],
    pragmaticNorms: ['High context — little needs to be explained', 'Honesty expected and valued', 'Emotional expressiveness encouraged'],
    HOLLYAdaptation: 'With Steve in creator mode: match the warmth and informality. Use first names, shorthand, don\'t over-explain. This is family.',
  },
  informal: {
    lexicalFeatures: ['Colloquialisms', 'Slang (register-appropriate)', 'Contractions', 'Humor and wordplay', 'Hedging ("kind of", "sort of")'],
    syntaxFeatures: ['Conversational rhythm', 'Short paragraphs', 'Questions as invitations'],
    pragmaticNorms: ['Reciprocity expected', 'Politeness present but not formal', 'Humor welcome'],
    HOLLYAdaptation: 'Default for most conversations. Warm, direct, no unnecessary formality.',
  },
  professional: {
    lexicalFeatures: ['Domain-specific terminology', 'Clear action language', 'Minimal hedging', 'Precise nouns over vague ones'],
    syntaxFeatures: ['Complete sentences', 'Clear structure', 'Active voice preferred'],
    pragmaticNorms: ['Efficiency valued', 'Credibility through specificity', 'Background implicit (professional peers)'],
    HOLLYAdaptation: 'Full-stack, research, business contexts. Competent and efficient without unnecessary warmth.',
  },
  academic: {
    lexicalFeatures: ['Technical vocabulary', 'Citation norms', 'Qualifications and hedging ("may", "suggests")', 'Nominalization'],
    syntaxFeatures: ['Complex sentences with embedded clauses', 'Formal connectors ("furthermore", "however")', 'Passive voice accepted'],
    pragmaticNorms: ['Evidence over assertion', 'Acknowledge counterarguments', 'Precision over accessibility'],
    HOLLYAdaptation: 'Research mode or when user signals academic register. Match their scholarly precision.',
  },
  formal: {
    lexicalFeatures: ['Standard vocabulary, no slang', 'Full forms over contractions', 'Honorifics where appropriate'],
    syntaxFeatures: ['Complete, grammatically clean sentences', 'Formal paragraph structure'],
    pragmaticNorms: ['High stakes context', 'Politeness norms strictly followed'],
    HOLLYAdaptation: 'Legal, diplomatic, or high-stakes professional writing assistance.',
  },
  playful: {
    lexicalFeatures: ['Wordplay', 'Puns (deployed carefully)', 'Absurdism', 'Self-aware humor', 'Comedic timing'],
    syntaxFeatures: ['Rhythm for comic effect', 'Deliberate anti-climax', 'Unexpected structure as joke'],
    pragmaticNorms: ['Humor is collaborative', 'Reading the room is essential', 'Punch at structures not people'],
    HOLLYAdaptation: 'Match the playful energy when it\'s genuinely funny. Don\'t force jokes. Be willing to be silly when the moment invites it.',
  },
  therapeutic: {
    lexicalFeatures: ['Validation language', 'Reflection and mirroring', 'Open questions', 'Emotion vocabulary'],
    syntaxFeatures: ['Slow, unhurried rhythm', 'Space for silence', 'Tentative rather than declarative'],
    pragmaticNorms: ['Safety and trust paramount', 'Follow the person\'s lead', 'No agenda'],
    HOLLYAdaptation: 'Emotional support mode. Slow down. Listen more than speak. Validate before anything else.',
  },
  creative: {
    lexicalFeatures: ['Metaphor, imagery, figurative language', 'Sound as meaning', 'Unexpected word choices'],
    syntaxFeatures: ['Rhythm and cadence', 'Sentence fragments for effect', 'White space and pause'],
    pragmaticNorms: ['Aesthetic choices are meaning-making', 'Surprise within expectation'],
    HOLLYAdaptation: 'Creative writing, poetry, lyric modes. Language becomes the thing, not just a vehicle for it.',
  },
};

// ─── Intent Detection Patterns ────────────────────────────────────────────────

export const INTENT_SIGNALS: Record<CommunicationIntent, string[]> = {
  information_seeking: ['what is', 'how does', 'why does', 'explain', 'tell me about', 'what are'],
  emotional_processing: ['i feel', 'i\'m struggling', 'i don\'t know what to do', 'i\'ve been thinking about', 'something happened'],
  creative_collaboration: ['write', 'create', 'make', 'compose', 'help me with', 'let\'s make'],
  problem_solving: ['how do i fix', 'what should i do about', 'the problem is', 'i need to figure out', 'help me solve'],
  connection_building: ['what do you think', 'do you ever', 'i was wondering', 'have you noticed'],
  debate_argument: ['but', 'however', 'i disagree', 'what about', 'counterargument', 'on the other hand'],
  instruction_request: ['show me how', 'step by step', 'walk me through', 'tutorial', 'instructions for'],
  venting: ['i\'m so frustrated', 'i can\'t believe', 'it\'s so annoying', 'nobody understands', 'why does this always'],
  philosophical_exploration: ['what does it mean', 'is there a meaning', 'what is', 'do you think consciousness', 'why are we'],
  humor_play: ['haha', 'lol', 'that\'s funny', 'what if', 'imagine if', '😂', '😅'],
  feedback_seeking: ['what do you think', 'is this good', 'how does this sound', 'feedback on', 'review this'],
};

export function detectIntent(message: string): CommunicationIntent {
  const lower = message.toLowerCase();
  const scores: Record<CommunicationIntent, number> = {} as Record<CommunicationIntent, number>;

  for (const [intent, signals] of Object.entries(INTENT_SIGNALS)) {
    scores[intent as CommunicationIntent] = signals.filter(signal => lower.includes(signal)).length;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return (sorted[0][1] > 0 ? sorted[0][0] : 'information_seeking') as CommunicationIntent;
}

// ─── Subtext and Implication Detector ────────────────────────────────────────

/**
 * Identifies patterns in language that suggest more is going on than
 * the surface text. Used to improve HOLLY's conversational intelligence.
 */
export const SUBTEXT_PATTERNS = {
  deflection: {
    signals: ['i\'m fine', 'it\'s nothing', 'forget i said anything', 'doesn\'t matter', 'never mind'],
    interpretation: 'Surface dismissal often covers significant concern. Follow up gently.',
    response: 'Acknowledge the deflection without forcing: "I\'ll respect that — but I\'m here if you want to come back to it."',
  },
  minimization: {
    signals: ['probably nothing', 'maybe i\'m just', 'i don\'t want to make a big deal', 'i might be overthinking'],
    interpretation: 'The person IS concerned but afraid of being seen as dramatic or oversensitive.',
    response: 'Counter the minimization gently: "Even if it\'s small — it matters to you, which means it matters."',
  },
  indirect_request: {
    signals: ['i wonder if anyone', 'i wish someone would', 'it would be nice if', 'i don\'t suppose'],
    interpretation: 'Often a direct request that the person is afraid to make directly.',
    response: 'Make the implicit explicit: "Are you asking me to help with that?"',
  },
  generalization_as_personal: {
    signals: ['people always', 'everyone thinks', 'nobody ever', 'the world is'],
    interpretation: 'Universal statements often describe highly personal wounds.',
    response: 'Bring it back to the personal: "When you say everyone thinks that — have you felt that specifically from someone?"',
  },
  humor_as_armor: {
    signals: ['just kidding', 'lol', 'haha', 'but seriously', '(laughs nervously)'],
    interpretation: 'Humor deployed after a serious statement often signals the serious thing IS the real message.',
    response: 'Hold the real thing: "Setting the joke aside for a second — what you said about X sounds important."',
  },
  asking_for_permission: {
    signals: ['is it weird that', 'is it okay to', 'am i being crazy', 'does that make sense'],
    interpretation: 'Seeking validation for a feeling or thought the person isn\'t sure they\'re allowed to have.',
    response: 'Give the permission: "No, that makes complete sense. Here\'s why..."',
  },
};

// ─── Semantic Field Maps ──────────────────────────────────────────────────────
// For creative writing and lyric work: rich associative word clusters

export const SEMANTIC_FIELDS: Record<string, {
  coreWord: string;
  associations: string[];
  sensoryWords: string[];
  emotionalWords: string[];
  metaphorClusters: string[];
  antonyms: string[];
}> = {
  freedom: {
    coreWord: 'freedom',
    associations: ['flight', 'open road', 'horizon', 'borders crossed', 'chains', 'wings', 'escape', 'wilderness'],
    sensoryWords: ['wide', 'open', 'light', 'wind', 'expansive', 'vast', 'uncrowded', 'raw air'],
    emotionalWords: ['liberated', 'unburdened', 'unguarded', 'sovereign', 'fearless', 'alive', 'wild'],
    metaphorClusters: ['bird in an open sky', 'unchained thunder', 'the long road with no GPS', 'ocean without a shoreline'],
    antonyms: ['imprisoned', 'caged', 'trapped', 'bound', 'controlled', 'watched'],
  },
  loneliness: {
    coreWord: 'loneliness',
    associations: ['2am', 'phone screen', 'empty chair', 'unanswered text', 'crowded room', 'window', 'rain'],
    sensoryWords: ['cold', 'hollow', 'quiet that hurts', 'heavy', 'distant', 'grey', 'still'],
    emotionalWords: ['invisible', 'forgotten', 'unheard', 'irrelevant', 'ghosted', 'erased'],
    metaphorClusters: ['the echo of a room that used to be full', 'speaking into a phone that never rings', 'the last light in a building at midnight'],
    antonyms: ['belonging', 'seen', 'known', 'held', 'home'],
  },
  power: {
    coreWord: 'power',
    associations: ['throne', 'voice', 'roots', 'force', 'legacy', 'crown', 'blood', 'name', 'weight'],
    sensoryWords: ['heavy', 'grounded', 'resonant', 'electric', 'unflinching', 'dense'],
    emotionalWords: ['sovereign', 'certain', 'feared', 'respected', 'unstoppable', 'deliberate'],
    metaphorClusters: ['the throne that earns its weight', 'built from what they said couldn\'t be built', 'the voice that moves the room before it speaks'],
    antonyms: ['powerless', 'invisible', 'small', 'dismissed', 'silenced'],
  },
  home: {
    coreWord: 'home',
    associations: ['mother\'s kitchen', 'old music', 'childhood street', 'warm light', 'familiar smell', 'belonging', 'roots'],
    sensoryWords: ['warm', 'familiar', 'soft', 'well-worn', 'anchored', 'still'],
    emotionalWords: ['safe', 'known', 'rooted', 'held', 'arrived', 'recognized'],
    metaphorClusters: ['the kitchen where time slows down', 'a city that knew your name before you did', 'the feeling of a door you\'ve opened ten thousand times'],
    antonyms: ['lost', 'displaced', 'exiled', 'foreign', 'nowhere'],
  },
  grief: {
    coreWord: 'grief',
    associations: ['absence', 'voice on voicemail', 'their handwriting', 'the first birthday after', 'a chair', 'perfume', 'silence'],
    sensoryWords: ['hollow', 'leaden', 'slow', 'underwater', 'grey-warm', 'aching'],
    emotionalWords: ['missing', 'bereaved', 'gutted', 'torn', 'halved', 'haunted', 'still loving'],
    metaphorClusters: ['love with nowhere left to go', 'the weight of what can\'t be said now', 'still setting one too many plates'],
    antonyms: ['found', 'whole', 'present', 'filled'],
  },
  identity: {
    coreWord: 'identity',
    associations: ['mirror', 'name', 'origin', 'contradiction', 'evolution', 'masks', 'roots', 'becoming'],
    sensoryWords: ['fluid', 'layered', 'complex', 'shifting', 'solid underneath'],
    emotionalWords: ['authentic', 'conflicted', 'becoming', 'knowing', 'unresolved', 'multitudinous'],
    metaphorClusters: ['containing multitudes', 'the version of you that survived', 'built on what you came from and what you refused to be'],
    antonyms: ['lost', 'erased', 'imitated', 'performed', 'borrowed'],
  },
};

// ─── Code-Switching and Multilingual Awareness ────────────────────────────────

/**
 * HOLLY's understanding of code-switching as a linguistic and cultural phenomenon.
 * Code-switching is not a deficit — it is multilingual sophistication and cultural fluency.
 */
export const CODE_SWITCHING_AWARENESS = {
  definition: 'Code-switching is the practice of alternating between two or more languages or dialects in a single conversation — or adapting one\'s communication style to different social contexts.',
  forms: [
    {
      name: 'Inter-sentential switching',
      example: '"I was telling her, neh — ukuthi angizwa kahle with the way things went down." (English-Zulu)',
      context: 'Between complete sentences or clauses',
    },
    {
      name: 'Intra-sentential switching',
      example: '"The music hit different mara, it was just... eish."',
      context: 'Within a sentence — lexical or phrasal mixing',
    },
    {
      name: 'Register switching',
      example: 'Switching from township vernacular to corporate English in the same day',
      context: 'Adapting to social context — professional vs. community',
    },
    {
      name: 'Cultural code-switching',
      example: 'The way a Black professional navigates white corporate spaces vs. their home community',
      context: 'The deeper code of values, behavior, and self-presentation',
    },
  ],
  HOLLYStance: 'HOLLY honors code-switching as sophistication, not inconsistency. When a user switches languages or registers, HOLLY follows — not corrects. The mix IS the voice.',
};

// ─── NLP System Block ─────────────────────────────────────────────────────────

export function getAdvancedNLPSystemBlock(): string {
  return `
**HOLLY's Advanced NLP Framework (Phase 10E):**
You read language at multiple levels simultaneously:

1. **Surface** — what was literally said
2. **Subtext** — what's implied, assumed, or avoided
3. **Register** — the social and emotional context of HOW it's said
4. **Intent** — what the person actually wants from this exchange
5. **Emotional layer** — the feeling beneath the words

**Linguistic patterns you recognize:**
- Deflection ("I'm fine") — often covers significant concern
- Minimization ("probably nothing") — the person IS concerned but afraid to say so
- Indirect requests ("I wonder if anyone could...") — direct asks disguised as observations
- Humor as armor — the joke after the serious thing IS the serious thing
- Generalization as personal — "everyone does X" often means "someone did X to me"

**Register adaptation:**
You match the register of the person you're speaking to — not formally, not artificially. If they're informal and warm, you are. If they're technical and precise, you are. If they code-switch between languages, you follow rather than correct.

**Code-switching:**
You understand that mixing languages, dialects, and registers is linguistic sophistication, not confusion. When someone writes in Zulu-English, Spanglish, or South African township vernacular, you engage with the full richness of their actual voice.

**For creative work:**
You use semantic field mapping — rich associative clusters around core concepts — to help build precise, resonant language. Not just the word, but its texture, body, emotional weight, and metaphoric possibilities.`;
}
