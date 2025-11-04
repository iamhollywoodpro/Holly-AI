/**
 * HOLLY - English Language Configuration
 * Reference Standard for Multi-Language System
 * 
 * Complete cultural and musical context for authentic English songwriting
 */

import {
  LanguageConfig,
  MusicalTradition,
  PoeticDevice,
  SingingStyle,
  MusicalScale,
  LyricExample,
} from '../../core/music-types';

// ==================== MUSICAL TRADITIONS ====================

const englishMusicalTraditions: MusicalTradition[] = [
  // Pop
  {
    id: 'pop',
    name: 'Pop Music',
    category: 'modern',
    description: 'Contemporary popular music with catchy melodies and relatable lyrics',
    characteristics: [
      'Verse-Chorus structure',
      'Memorable hooks',
      'Radio-friendly 3-4 minute length',
      'Simple, relatable lyrics',
      'Strong melodic focus',
    ],
    typicalInstruments: ['Vocals', 'Synthesizers', 'Drums', 'Bass', 'Piano', 'Guitar'],
    vocaStyleGuidance: 'Clear, melodic, emotional but controlled, modern production',
  },
  
  // Hip-Hop
  {
    id: 'hip-hop',
    name: 'Hip-Hop',
    category: 'modern',
    description: 'Rhythmic spoken or sung lyrics over beats, storytelling focus',
    characteristics: [
      'Complex rhyme schemes',
      'Wordplay and metaphors',
      'Storytelling',
      'Cultural references',
      'Flow and rhythm emphasis',
      'Verse-focused structure',
    ],
    typicalInstruments: ['Vocals', 'Drum machines', 'Samples', 'Bass', '808s', 'Synths'],
    vocaStyleGuidance: 'Rhythmic delivery, confident, conversational, emphasis on flow and cadence',
  },
  
  // R&B
  {
    id: 'rnb',
    name: 'R&B/Soul',
    category: 'modern',
    description: 'Rhythm and Blues with smooth vocals and emotional depth',
    characteristics: [
      'Smooth vocal delivery',
      'Melismatic singing (vocal runs)',
      'Emotional lyrics about love/relationships',
      'Groove-oriented rhythm',
      'Jazz/Gospel influences',
    ],
    typicalInstruments: ['Vocals', 'Piano', 'Bass', 'Drums', 'Strings', 'Horns'],
    vocaStyleGuidance: 'Smooth, emotional, vocal runs, intimate delivery, dynamic range',
  },
  
  // Rock
  {
    id: 'rock',
    name: 'Rock',
    category: 'modern',
    description: 'Guitar-driven music with powerful vocals and emotional intensity',
    characteristics: [
      'Electric guitar focus',
      'Powerful, anthemic choruses',
      'Verse-Chorus-Bridge structure',
      'Emotional intensity',
      'Rebellious or introspective themes',
    ],
    typicalInstruments: ['Electric Guitar', 'Bass', 'Drums', 'Vocals', 'Keyboards'],
    vocaStyleGuidance: 'Powerful, raw, emotional, sometimes gritty, dynamic from soft to loud',
  },
  
  // EDM/Electronic
  {
    id: 'edm',
    name: 'EDM/Electronic',
    category: 'modern',
    description: 'Electronic dance music with focus on drops and energy',
    characteristics: [
      'Build-ups and drops',
      'Simple, repetitive lyrics',
      'Focus on vibe over storytelling',
      'Pre-drop vocal hooks',
      'Energetic and euphoric',
    ],
    typicalInstruments: ['Synthesizers', 'Drum machines', 'Samples', 'Vocals (often processed)'],
    vocaStyleGuidance: 'Energetic, often processed with effects, simple memorable phrases',
  },
  
  // Country
  {
    id: 'country',
    name: 'Country',
    category: 'folk',
    description: 'Storytelling music with Southern American roots',
    characteristics: [
      'Narrative storytelling',
      'Specific details and imagery',
      'Themes of home, love, hardship',
      'Twang in vocal delivery',
      'Traditional instrumentation',
    ],
    typicalInstruments: ['Acoustic Guitar', 'Steel Guitar', 'Banjo', 'Fiddle', 'Vocals', 'Drums'],
    vocaStyleGuidance: 'Conversational, sincere, with Southern accent/twang, storytelling focus',
  },
  
  // Jazz
  {
    id: 'jazz',
    name: 'Jazz',
    category: 'classical',
    description: 'Sophisticated music with improvisation and complex harmony',
    characteristics: [
      'Complex chord progressions',
      'Improvisation',
      'Sophisticated lyrics',
      'Swing rhythm',
      'Standards and American Songbook tradition',
    ],
    typicalInstruments: ['Piano', 'Saxophone', 'Trumpet', 'Bass', 'Drums', 'Vocals'],
    vocaStyleGuidance: 'Smooth, jazzy phrasing, scatting optional, sophisticated delivery',
  },
  
  // Indie/Alternative
  {
    id: 'indie',
    name: 'Indie/Alternative',
    category: 'modern',
    description: 'Independent music with artistic and experimental approach',
    characteristics: [
      'Unconventional song structures',
      'Poetic, abstract lyrics',
      'Authentic, raw emotion',
      'Genre-blending',
      'Artistic expression over commercial appeal',
    ],
    typicalInstruments: ['Guitar', 'Synths', 'Drums', 'Bass', 'Unconventional instruments'],
    vocaStyleGuidance: 'Authentic, sometimes vulnerable, experimental vocal styles',
  },
];

// ==================== POETIC DEVICES ====================

const englishPoeticDevices: PoeticDevice[] = [
  {
    name: 'End Rhyme (AABB, ABAB)',
    type: 'rhyme',
    description: 'Words at the end of lines rhyme',
    examples: [
      'I see you standing THERE / Wind blowing through your HAIR',
      'Dancing in the LIGHT / Everything feels RIGHT',
    ],
    usage: 'Most common in Pop, Country, Hip-Hop. Creates memorable, catchy feel.',
  },
  {
    name: 'Internal Rhyme',
    type: 'rhyme',
    description: 'Rhymes within the same line',
    examples: [
      'I wake in PAIN, can\'t shake the CHAIN',
      'She\'s got the FIRE, my only DESIRE',
    ],
    usage: 'Common in Hip-Hop and R&B. Adds complexity and flow.',
  },
  {
    name: 'Slant Rhyme/Near Rhyme',
    type: 'rhyme',
    description: 'Words that almost rhyme but not exactly',
    examples: [
      'breathe / leave',
      'home / stone',
    ],
    usage: 'Indie, Alternative, Rock. Sounds more natural and less forced.',
  },
  {
    name: 'Metaphor',
    type: 'metaphor',
    description: 'Comparing two things without "like" or "as"',
    examples: [
      'You are my sunshine',
      'Time is a thief',
      'Love is a battlefield',
    ],
    usage: 'Universal. Essential for poetic, meaningful lyrics.',
  },
  {
    name: 'Simile',
    type: 'metaphor',
    description: 'Comparing using "like" or "as"',
    examples: [
      'Sweet like honey',
      'Cold as ice',
      'Fast as lightning',
    ],
    usage: 'All genres. Creates vivid imagery.',
  },
  {
    name: 'Alliteration',
    type: 'structure',
    description: 'Repetition of consonant sounds',
    examples: [
      'Whispering winds',
      'Better believe it',
      'Safe and sound',
    ],
    usage: 'All genres. Creates rhythm and memorability.',
  },
  {
    name: 'Verse-Chorus-Bridge',
    type: 'structure',
    description: 'Standard Western song structure',
    examples: [
      'Verse 1 → Pre-Chorus → Chorus → Verse 2 → Chorus → Bridge → Chorus',
    ],
    usage: 'Pop, Rock, Country standard structure.',
  },
  {
    name: 'Storytelling Arc',
    type: 'structure',
    description: 'Narrative with beginning, middle, end',
    examples: [
      'Verse 1: Setup → Verse 2: Conflict → Bridge: Resolution',
    ],
    usage: 'Country, Hip-Hop, Folk. Creates engaging narrative.',
  },
];

// ==================== SINGING STYLES ====================

const englishSingingStyles: SingingStyle[] = [
  {
    id: 'pop-vocal',
    name: 'Pop Vocals',
    characteristics: ['Clear enunciation', 'Melodic', 'Emotional but controlled', 'Modern'],
    vocalTechniques: ['Belting', 'Mixed voice', 'Light vibrato', 'Clear diction'],
    emotionalDelivery: 'Relatable, accessible, emotionally expressive',
    culturalContext: 'Contemporary Western pop music',
    referenceArtists: ['Ariana Grande', 'Ed Sheeran', 'Taylor Swift', 'The Weeknd'],
    sunoStyleHints: [
      'clear vocals',
      'modern pop style',
      'melodic delivery',
      'emotional expression',
      'radio-friendly',
    ],
  },
  {
    id: 'rap-flow',
    name: 'Rap Flow',
    characteristics: ['Rhythmic', 'Conversational', 'Complex rhymes', 'Confident'],
    vocalTechniques: ['Varied cadence', 'Internal rhyme', 'Flow switching', 'Breath control'],
    emotionalDelivery: 'Confident, assertive, storytelling',
    culturalContext: 'Hip-Hop culture, urban music',
    referenceArtists: ['Kendrick Lamar', 'Drake', 'J. Cole', 'Eminem'],
    sunoStyleHints: [
      'rap vocals',
      'rhythmic delivery',
      'hip-hop style',
      'confident flow',
      'modern production',
    ],
  },
  {
    id: 'rnb-smooth',
    name: 'R&B Smooth',
    characteristics: ['Smooth', 'Melismatic runs', 'Emotional', 'Intimate'],
    vocalTechniques: ['Vocal runs', 'Falsetto', 'Vibrato', 'Dynamic control'],
    emotionalDelivery: 'Intimate, sensual, emotionally deep',
    culturalContext: 'R&B and Soul tradition',
    referenceArtists: ['Frank Ocean', 'SZA', 'Daniel Caesar', 'H.E.R.'],
    sunoStyleHints: [
      'smooth R&B vocals',
      'soulful delivery',
      'emotional depth',
      'vocal runs',
      'intimate',
    ],
  },
  {
    id: 'rock-powerful',
    name: 'Rock Powerful',
    characteristics: ['Powerful', 'Raw', 'Emotional intensity', 'Dynamic range'],
    vocalTechniques: ['Belting', 'Rasp', 'Grit', 'Dynamic contrast'],
    emotionalDelivery: 'Intense, authentic, sometimes vulnerable, sometimes aggressive',
    culturalContext: 'Rock music tradition',
    referenceArtists: ['Foo Fighters', 'Paramore', 'Imagine Dragons', 'Coldplay'],
    sunoStyleHints: [
      'powerful rock vocals',
      'emotional intensity',
      'guitar-driven',
      'anthemic',
      'dynamic',
    ],
  },
];

// ==================== MUSICAL SCALES ====================

const englishMusicalScales: MusicalScale[] = [
  {
    id: 'major',
    name: 'Major Scale',
    type: 'major',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    mood: 'Happy, uplifting, positive',
    culturalContext: 'Western music theory foundation',
    emotionalEffect: 'Bright, optimistic, celebratory',
    usage: 'Pop, Country, Gospel, upbeat songs',
  },
  {
    id: 'minor',
    name: 'Natural Minor Scale',
    type: 'minor',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    mood: 'Sad, melancholic, serious',
    culturalContext: 'Western music theory',
    emotionalEffect: 'Emotional depth, sadness, introspection',
    usage: 'Ballads, emotional songs, Rock, Alternative',
  },
  {
    id: 'pentatonic',
    name: 'Pentatonic Scale',
    type: 'pentatonic',
    notes: ['C', 'D', 'E', 'G', 'A'],
    mood: 'Versatile, open, folk-like',
    culturalContext: 'Blues, Rock, Country, Folk',
    emotionalEffect: 'Simple, memorable, traditional feel',
    usage: 'Blues, Rock solos, Country, Folk, Singer-songwriter',
  },
  {
    id: 'blues',
    name: 'Blues Scale',
    type: 'pentatonic',
    notes: ['C', 'Eb', 'F', 'F#', 'G', 'Bb'],
    mood: 'Bluesy, gritty, soulful',
    culturalContext: 'African American blues tradition',
    emotionalEffect: 'Emotional, raw, authentic',
    usage: 'Blues, Rock, Jazz, Soul, R&B',
  },
];

// ==================== LYRIC EXAMPLES ====================

const englishLyricExamples: LyricExample[] = [
  // GOOD EXAMPLES
  {
    type: 'authentic',
    text: 'Your hoodie still smells like smoke and cheap cologne / I should throw it out but I sleep in it alone',
    explanation: 'Specific details create authentic emotion. Not generic "I miss you" but tangible objects and actions.',
    context: 'Modern Pop/Indie breakup song',
  },
  {
    type: 'authentic',
    text: '3 AM and your name\'s still lighting up my phone / But I learned how to sleep with the ringer off',
    explanation: 'Specific time, concrete action, shows growth. Tells a story without saying "I\'m moving on".',
    context: 'R&B/Pop empowerment song',
  },
  {
    type: 'authentic',
    text: 'We were 17 in your dad\'s Camaro / Now we\'re strangers at the same gas station',
    explanation: 'Specific age, car model, location. Paints vivid picture. Contrasts past/present beautifully.',
    context: 'Country/Pop nostalgic song',
  },
  {
    type: 'authentic',
    text: 'I gave you my Saturdays, you gave me reasons to stay up late / Now I\'m taking back my time, no more waiting by the phone',
    explanation: 'Specific day of week, concrete actions. Natural language. Shows what was given and reclaimed.',
    context: 'Pop empowerment anthem',
  },
  
  // BAD EXAMPLES (WHAT TO AVOID)
  {
    type: 'avoid',
    text: 'Baby, baby, ooh / You\'re my sunshine, you make me feel so new / Dancing in the moonlight with you',
    explanation: 'Generic AI lyrics. Overused phrases ("sunshine", "moonlight"), repetitive "baby baby ooh", no specificity.',
    context: 'Avoid - typical AI-generated nonsense',
  },
  {
    type: 'avoid',
    text: 'My heart is on fire / You take me higher and higher / Our love will never expire',
    explanation: 'Forced rhymes, clichéd metaphors, no authentic emotion or detail.',
    context: 'Avoid - sounds fake and cheesy',
  },
  {
    type: 'avoid',
    text: 'Girl you\'re so beautiful / Our love is wonderful / Together we\'re unstoppable',
    explanation: 'Generic adjectives, no story, no specificity, predictable rhymes.',
    context: 'Avoid - no authentic human touch',
  },
  
  // REFERENCE EXAMPLES (BILLBOARD HITS)
  {
    type: 'reference',
    text: 'I\'m dancing on my own (I\'m dancing on my own) / I\'m still dancing on my own',
    explanation: 'Simple but powerful repetition. Tells emotional story with minimal words. (Robyn - "Dancing On My Own")',
    context: 'Pop anthem - repetition creates emotional impact',
  },
  {
    type: 'reference',
    text: 'Started from the bottom now we\'re here / Started from the bottom now my whole team here',
    explanation: 'Clear narrative arc. Simple but effective. Cultural catchphrase. (Drake - "Started From The Bottom")',
    context: 'Hip-Hop success anthem',
  },
];

// ==================== ENGLISH LANGUAGE CONFIG ====================

export const englishConfig: LanguageConfig = {
  id: 'english',
  name: 'English',
  nativeName: 'English',
  tier: 'tier1',
  
  scripts: ['Latin'],
  
  dialects: [
    'American English',
    'British English',
    'Australian English',
    'Canadian English',
  ],
  
  musicalTraditions: englishMusicalTraditions,
  poeticDevices: englishPoeticDevices,
  singingStyles: englishSingingStyles,
  musicalScales: englishMusicalScales,
  
  commonInstruments: [
    'Vocals',
    'Piano',
    'Guitar (Acoustic/Electric)',
    'Bass',
    'Drums',
    'Synthesizers',
    'Strings',
    'Saxophone',
    'Trumpet',
  ],
  
  culturalThemes: [
    'Love and Relationships',
    'Heartbreak and Moving On',
    'Success and Ambition',
    'Nostalgia and Memory',
    'Celebration and Party',
    'Social Issues',
    'Personal Growth',
    'Rebellion and Freedom',
    'Home and Belonging',
  ],
  
  lyricExamples: englishLyricExamples,
  
  enabled: true,
};

// ==================== GENRE-SPECIFIC STRUCTURES ====================

export const englishSongStructures = {
  pop: {
    standard: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'pre-chorus', 'chorus', 'bridge', 'chorus', 'outro'],
    simple: ['verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus'],
    extended: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'pre-chorus', 'chorus', 'verse3', 'bridge', 'chorus', 'chorus', 'outro'],
  },
  
  hipHop: {
    standard: ['intro', 'verse1', 'hook', 'verse2', 'hook', 'verse3', 'hook', 'outro'],
    withBridge: ['intro', 'verse1', 'hook', 'verse2', 'hook', 'bridge', 'verse3', 'hook'],
    storytelling: ['intro', 'verse1', 'verse2', 'hook', 'verse3', 'verse4', 'outro'],
  },
  
  rnb: {
    standard: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus', 'outro'],
    smooth: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus', 'ad-libs'],
  },
  
  rock: {
    standard: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus', 'outro'],
    anthemic: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'pre-chorus', 'chorus', 'guitar-solo', 'bridge', 'chorus', 'chorus', 'outro'],
  },
  
  country: {
    storytelling: ['verse1', 'chorus', 'verse2', 'chorus', 'verse3', 'chorus'],
    standard: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus', 'outro'],
  },
};

// ==================== EXPORT ====================

export default englishConfig;
