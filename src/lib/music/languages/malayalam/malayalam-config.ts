/**
 * HOLLY - Malayalam Language Configuration (TIER 1 PRIORITY)
 * Kerala Cinema, Classical, Folk Integration
 * 
 * Complete cultural and musical context for authentic Malayalam songwriting
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

const malayalamMusicalTraditions: MusicalTradition[] = [
  // Malayalam Cinema (Mollywood)
  {
    id: 'malayalam-cinema-romantic',
    name: 'Malayalam Cinema Romantic',
    category: 'modern',
    description: 'Romantic Malayalam film songs with poetic lyrics and melodic beauty',
    characteristics: [
      'Poetic Malayalam lyrics',
      'Nature imagery from Kerala (monsoon, backwaters, coconut palms)',
      'Soft, melodic arrangements',
      'Carnatic influence in melodies',
      'Conversational, intimate delivery',
      'Focus on lyrical beauty',
    ],
    typicalInstruments: ['Violin', 'Flute', 'Veena', 'Mridangam', 'Keyboard', 'Acoustic Guitar'],
    vocaStyleGuidance: 'Soft, melodic, poetic delivery, clear Malayalam pronunciation, emotional depth, conversational tone',
  },
  
  {
    id: 'malayalam-cinema-upbeat',
    name: 'Malayalam Cinema Upbeat',
    category: 'modern',
    description: 'Energetic Malayalam film songs for celebrations and dance',
    characteristics: [
      'Fast tempo',
      'Traditional percussion (Chenda, Maddalam)',
      'Festive atmosphere',
      'Group vocals common',
      'Dance-oriented rhythm',
      'Modern production with traditional elements',
    ],
    typicalInstruments: ['Chenda', 'Maddalam', 'Synthesizers', 'Tabla', 'Modern beats'],
    vocaStyleGuidance: 'Energetic, celebratory, clear diction, rhythmic emphasis, festive delivery',
  },
  
  {
    id: 'malayalam-cinema-melancholic',
    name: 'Malayalam Cinema Melancholic',
    category: 'modern',
    description: 'Emotional Malayalam film songs expressing sadness and longing',
    characteristics: [
      'Slow tempo',
      'Monsoon and rain imagery (deeply connected to Kerala culture)',
      'Minimalist arrangements',
      'Deep emotional expression',
      'Poetic Malayalam vocabulary',
      'Classical influences',
    ],
    typicalInstruments: ['Violin', 'Flute', 'Veena', 'Keyboard pads', 'Strings'],
    vocaStyleGuidance: 'Melancholic, soft, emotional vulnerability, clear articulation, slow phrasing',
  },
  
  // Classical
  {
    id: 'sopana-sangeetam',
    name: 'Sopana Sangeetam (Temple Music)',
    category: 'classical',
    description: 'Traditional Kerala temple music with Carnatic influences',
    characteristics: [
      'Devotional themes',
      'Carnatic raga-based',
      'Temple acoustics influence',
      'Sanskrit-Malayalam mix',
      'Slow, meditative tempo',
      'Classical vocal techniques',
    ],
    typicalInstruments: ['Chenda', 'Maddalam', 'Edakka', 'Cymbals', 'Conch'],
    vocaStyleGuidance: 'Devotional, classical technique, temple acoustic style, clear Sanskrit/Malayalam',
  },
  
  {
    id: 'carnatic-malayalam',
    name: 'Carnatic Music (Malayalam)',
    category: 'classical',
    description: 'South Indian classical music sung in Malayalam',
    characteristics: [
      'Raga-based compositions',
      'Tala (rhythmic cycles)',
      'Classical structure (Varnam, Kriti, etc.)',
      'Complex rhythmic patterns',
      'Improvisation within rules',
    ],
    typicalInstruments: ['Mridangam', 'Veena', 'Violin', 'Flute', 'Tambura'],
    vocaStyleGuidance: 'Classical technique, gamakam, precise raga adherence, rhythmic accuracy',
  },
  
  // Folk
  {
    id: 'mappila-pattu',
    name: 'Mappila Pattu (Malabar Songs)',
    category: 'folk',
    description: 'Muslim community songs from North Kerala with Arabic influences',
    characteristics: [
      'Arabic-Malayalam mix',
      'Romantic and devotional themes',
      'Unique Mappila dialect',
      'Traditional percussion',
      'Call-and-response patterns',
      'Cultural heritage of Malabar region',
    ],
    typicalInstruments: ['Harmonium', 'Tabla', 'Daffa', 'Traditional drums'],
    vocaStyleGuidance: 'Malabar accent, Arabic pronunciation for mixed words, traditional folk style',
  },
  
  {
    id: 'nadan-pattu',
    name: 'Nadan Pattu (Folk Songs)',
    category: 'folk',
    description: 'Traditional Kerala folk songs about rural life and nature',
    characteristics: [
      'Agricultural themes',
      'Nature imagery',
      'Work songs',
      'Festival songs',
      'Simple, earthy language',
      'Communal singing tradition',
    ],
    typicalInstruments: ['Chenda', 'Thavil', 'Edakka', 'Folk percussion'],
    vocaStyleGuidance: 'Earthy, rustic, authentic Kerala accent, communal singing style',
  },
  
  {
    id: 'thiruvathira-kali',
    name: 'Thiruvathira Kali (Women\'s Folk)',
    category: 'folk',
    description: 'Traditional women\'s circular dance songs',
    characteristics: [
      'Women\'s group singing',
      'Rhythmic dance patterns',
      'Romantic and mythological themes',
      'Call-and-response',
      'Feminine perspective',
    ],
    typicalInstruments: ['Clapping', 'Traditional drums', 'Minimal instrumentation'],
    vocaStyleGuidance: 'Feminine, rhythmic, group harmony, traditional Kerala women\'s singing style',
  },
  
  // Modern
  {
    id: 'malayalam-indie-pop',
    name: 'Malayalam Indie Pop',
    category: 'modern',
    description: 'Contemporary Malayalam pop music with Western influences',
    characteristics: [
      'Modern production',
      'Western song structures',
      'Urban themes',
      'English mixing',
      'Youth-oriented',
      'Experimental sounds',
    ],
    typicalInstruments: ['Synthesizers', 'Electronic beats', 'Guitar', 'Bass', 'Modern production'],
    vocaStyleGuidance: 'Modern, urban Malayalam, conversational delivery, Western pop influence',
  },
];

// ==================== POETIC DEVICES ====================

const malayalamPoeticDevices: PoeticDevice[] = [
  {
    name: 'Manipravalam',
    type: 'cultural',
    description: 'Mix of Malayalam and Sanskrit, common in classical and devotional songs',
    examples: [
      'കാമിനീ (Kaamini - Sanskrit) + പ്രിയേ (Priye - Malayalam)',
      'സുന്ദരി (Sundari - Sanskrit) mixed with Malayalam verbs',
    ],
    usage: 'Adds literary sophistication and classical depth to lyrics',
  },
  
  {
    name: 'Nature Metaphors (Kerala-specific)',
    type: 'metaphor',
    description: 'Using Kerala\'s unique landscape and nature for emotional expression',
    examples: [
      'മഴ (Mazha - Rain) = Sadness, romance, longing (monsoon is deeply romantic)',
      'കടൽ (Kadal - Sea) = Vastness, depth of emotion, separation',
      'തെങ്ങ് (Thengu - Coconut palm) = Home, Kerala identity',
      'കായൽ (Kayal - Backwaters) = Calm, peaceful love',
      'മലരും (Malarum - Blooming) = New love, hope',
    ],
    usage: 'Essential for authentic Malayalam cinema songs - nature is central to Kerala culture',
  },
  
  {
    name: 'Monsoon Imagery',
    type: 'metaphor',
    description: 'Monsoon is deeply romantic and emotional in Kerala culture',
    examples: [
      'മഴയുടെ മൗനത്തിൽ (In the silence of the rain)',
      'മഴത്തുള്ളി കണ്ണീർത്തുള്ളി (Raindrops like teardrops)',
      'കാറ്റും മഴയും (Wind and rain together)',
    ],
    usage: 'Used extensively in romantic and melancholic songs',
  },
  
  {
    name: 'Alliteration (Malayalam)',
    type: 'structure',
    description: 'Repetition of consonant sounds in Malayalam',
    examples: [
      'മലരും മഞ്ഞും മാലയും (Malarum manjum malayum)',
      'പൂവിന്റെ പുണ്യം (Poovinte punyam)',
    ],
    usage: 'Creates musicality and memorability in Malayalam lyrics',
  },
  
  {
    name: 'Rhyme Schemes (Malayalam)',
    type: 'rhyme',
    description: 'End rhymes in Malayalam poetry and songs',
    examples: [
      'പ്രിയേ (Priye) - നിയേ (Niye)',
      'കണ്ണീർ (Kanneer) - പൂന്തീർ (Poonteer)',
      'മഴയിൽ (Mazhayil) - നിഴലിൽ (Nizhalil)',
    ],
    usage: 'Essential for Malayalam film songs and poetry',
  },
  
  {
    name: 'Repetition (Punarukti)',
    type: 'structure',
    description: 'Repeating words or phrases for emphasis and emotion',
    examples: [
      'നീയേ... നീയേ... (You alone... you alone...)',
      'എവിടെ... എവിടെ... (Where... where...)',
      'എന്തിനേ... എന്തിനേ... (Why... why...)',
    ],
    usage: 'Common in Malayalam cinema songs for emotional impact',
  },
  
  {
    name: 'Conversational Style',
    type: 'structure',
    description: 'Natural spoken Malayalam in songs, very intimate',
    examples: [
      'നിന്നോടൊപ്പം നടക്കാൻ (To walk with you)',
      'ഞാൻ നിന്നെ സ്നേഹിക്കുന്നു (I love you - simple, direct)',
    ],
    usage: 'Modern Malayalam cinema favors conversational, natural language over overly poetic',
  },
  
  {
    name: 'Sangam Poetry Influence',
    type: 'cultural',
    description: 'Ancient Tamil Sangam poetry influence on Malayalam literature',
    examples: [
      'Landscapes (Kurinji-mountains, Mullai-forests, Marutham-fields)',
      'Seasons as emotional contexts',
    ],
    usage: 'Classical Malayalam poetry draws from Sangam traditions',
  },
];

// ==================== SINGING STYLES ====================

const malayalamSingingStyles: SingingStyle[] = [
  {
    id: 'malayalam-cinema-soft',
    name: 'Malayalam Cinema Soft/Romantic',
    characteristics: ['Soft', 'Melodic', 'Poetic', 'Intimate', 'Clear pronunciation'],
    vocalTechniques: ['Light vibrato', 'Smooth phrasing', 'Emotional expression', 'Clear Malayalam diction'],
    emotionalDelivery: 'Intimate, romantic, poetic, conversational',
    culturalContext: 'Malayalam film music tradition',
    referenceArtists: ['K.J. Yesudas', 'K.S. Chithra', 'Vineeth Sreenivasan', 'Shreya Ghoshal (Malayalam)'],
    sunoStyleHints: [
      'soft Malayalam vocals',
      'romantic delivery',
      'melodic Malayalam style',
      'poetic expression',
      'clear pronunciation',
    ],
  },
  
  {
    id: 'malayalam-cinema-male',
    name: 'Malayalam Cinema Male (Yesudas Style)',
    characteristics: ['Classical influence', 'Clear voice', 'Emotional depth', 'Perfect diction'],
    vocalTechniques: ['Classical technique', 'Gamakam', 'Perfect pitch', 'Clear articulation'],
    emotionalDelivery: 'Deeply emotional, classical grace, perfect Malayalam pronunciation',
    culturalContext: 'Golden age Malayalam cinema music',
    referenceArtists: ['K.J. Yesudas', 'M.G. Sreekumar', 'Madhu Balakrishnan'],
    sunoStyleHints: [
      'classical Malayalam male vocals',
      'emotional depth',
      'Yesudas style',
      'perfect Malayalam diction',
      'melodic delivery',
    ],
  },
  
  {
    id: 'malayalam-cinema-female',
    name: 'Malayalam Cinema Female',
    characteristics: ['Sweet', 'Expressive', 'Melodic', 'Clear', 'Emotional'],
    vocalTechniques: ['Classical training', 'Emotional expression', 'Clear pronunciation', 'Vibrato'],
    emotionalDelivery: 'Sweet, expressive, romantic, poetic',
    culturalContext: 'Malayalam film music',
    referenceArtists: ['K.S. Chithra', 'Sujatha Mohan', 'Shreya Ghoshal', 'Sithara Krishnakumar'],
    sunoStyleHints: [
      'sweet Malayalam female vocals',
      'melodic delivery',
      'emotional expression',
      'clear Malayalam pronunciation',
      'romantic style',
    ],
  },
  
  {
    id: 'mappila-style',
    name: 'Mappila Pattu Style',
    characteristics: ['Arabic influence', 'Malabar accent', 'Traditional', 'Folk'],
    vocalTechniques: ['Malabar pronunciation', 'Arabic-Malayalam mixing', 'Traditional folk style'],
    emotionalDelivery: 'Traditional, cultural depth, Malabar identity',
    culturalContext: 'Muslim community of North Kerala',
    referenceArtists: ['Mappila Singers', 'Traditional Malabar artists'],
    sunoStyleHints: [
      'Mappila pattu style',
      'Malabar Malayalam',
      'Arabic influences',
      'traditional folk',
      'cultural authenticity',
    ],
  },
  
  {
    id: 'modern-malayalam',
    name: 'Modern Malayalam Indie/Pop',
    characteristics: ['Contemporary', 'Urban', 'Western influence', 'Experimental'],
    vocalTechniques: ['Modern pop techniques', 'Conversational delivery', 'English mixing'],
    emotionalDelivery: 'Modern, urban, youth-oriented, experimental',
    culturalContext: 'Contemporary Malayalam independent music',
    referenceArtists: ['Sushin Shyam', 'Hesham Abdul Wahab', 'Modern Malayalam indie artists'],
    sunoStyleHints: [
      'modern Malayalam vocals',
      'indie pop style',
      'contemporary delivery',
      'urban Malayalam',
      'experimental',
    ],
  },
];

// ==================== MUSICAL SCALES ====================

const malayalamMusicalScales: MusicalScale[] = [
  {
    id: 'mohanam-malayalam',
    name: 'Mohanam (മോഹനം)',
    type: 'raga',
    notes: ['C', 'D', 'E', 'G', 'A'],
    mood: 'Uplifting, peaceful, devotional',
    culturalContext: 'Very popular in Malayalam cinema and devotional music',
    emotionalEffect: 'Peace, devotion, pleasant emotions',
    usage: 'Romantic Malayalam songs, morning songs, devotional music',
  },
  
  {
    id: 'hamsadhwani-malayalam',
    name: 'Hamsadhwani (ഹംസധ്വനി)',
    type: 'raga',
    notes: ['C', 'D', 'E', 'G', 'B'],
    mood: 'Bright, devotional, peaceful',
    culturalContext: 'Popular in Malayalam devotional and film music',
    emotionalEffect: 'Brightness, devotion, spiritual peace',
    usage: 'Devotional songs, bright romantic songs, temple music',
  },
  
  {
    id: 'kalyani-malayalam',
    name: 'Kalyani (കല്യാണി)',
    type: 'raga',
    notes: ['C', 'D', 'E', 'F#', 'G', 'A', 'B'],
    mood: 'Auspicious, grand, celebratory',
    culturalContext: 'Used in auspicious occasions and grand Malayalam songs',
    emotionalEffect: 'Grandeur, celebration, auspiciousness',
    usage: 'Wedding songs, celebratory music, grand romantic songs',
  },
  
  {
    id: 'bhairavi-malayalam',
    name: 'Bhairavi (ഭൈരവി)',
    type: 'raga',
    notes: ['C', 'Db', 'Eb', 'F', 'G', 'Ab', 'Bb'],
    mood: 'Sad, devotional, emotional',
    culturalContext: 'Common in melancholic Malayalam cinema songs',
    emotionalEffect: 'Melancholy, devotion, deep emotion',
    usage: 'Sad Malayalam film songs, devotional music, emotional ballads',
  },
  
  {
    id: 'abheri-malayalam',
    name: 'Abheri (ആഭേരി)',
    type: 'raga',
    notes: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'B'],
    mood: 'Romantic, soft, gentle',
    culturalContext: 'Very popular in Malayalam film music',
    emotionalEffect: 'Gentle romance, softness, beauty',
    usage: 'Romantic Malayalam cinema songs, soft melodies',
  },
];

// ==================== LYRIC EXAMPLES ====================

const malayalamLyricExamples: LyricExample[] = [
  // AUTHENTIC MALAYALAM CINEMA
  {
    type: 'authentic',
    text: 'മഴയുടെ മൗനത്തിൽ നിന്റെ ഓർമ്മ വരുന്നു / കാറ്റിന്റെ കൂടെ നീ വന്നതുപോലെ',
    explanation: 'Classic Malayalam cinema style. Monsoon imagery (central to Kerala). Natural language. Poetic but conversational.',
    context: 'Romantic melancholic Malayalam film song',
  },
  
  {
    type: 'authentic',
    text: 'കടൽത്തീരത്ത് നിന്നൊരു സ്വപ്നം കണ്ടു / നീയും ഞാനും ഒരുമിച്ച് നടക്കുന്നു',
    explanation: 'Sea (Kadal) imagery. Simple, conversational Malayalam. Natural flow. Beach = Romance in Kerala culture.',
    context: 'Modern Malayalam romantic song',
  },
  
  {
    type: 'authentic',
    text: 'തെങ്ങിൻചുവട്ടിൽ നിൽക്കുമ്പോൾ / നിന്റെ മുഖം മനസ്സിൽ വരുന്നു',
    explanation: 'Coconut palm (Thengu) = Kerala identity. Simple imagery. Natural spoken Malayalam.',
    context: 'Contemporary Malayalam indie song',
  },
  
  // AUTHENTIC MAPPILA PATTU
  {
    type: 'authentic',
    text: 'അല്ലാഹു അല്ലാഹു എന്നോതും നേരം / നീ വന്നു പൊയ് എന്റെ മനസ്സിലേക്ക്',
    explanation: 'Mappila style. Arabic-Malayalam mix. Malabar dialect. Cultural authenticity of North Kerala Muslim community.',
    context: 'Mappila Pattu (Malabar folk song)',
  },
  
  // AUTHENTIC CLASSICAL INFLUENCE
  {
    type: 'authentic',
    text: 'സുന്ദരി നീ വന്നാൽ പൂക്കളും വിടരും / പ്രിയേ നിൻ മുഖം കാണാൻ കാത്തിരിക്കുന്നു',
    explanation: 'Classical Malayalam. Sanskrit-Malayalam mix (Manipravalam). Poetic vocabulary. Classical singing style.',
    context: 'Classical-influenced Malayalam cinema song',
  },
  
  // BAD EXAMPLES (AVOID)
  {
    type: 'avoid',
    text: 'ബേബി ബേബി ഊഹ് / നീ എന്റെ സൺഷൈൻ ആണ് / ഞാൻ നിന്നെ വളരെ സ്നേഹിക്കുന്നു',
    explanation: 'Direct English translation ("baby baby ooh", "sunshine"). Sounds unnatural in Malayalam. No cultural context.',
    context: 'AVOID - Translated English clichés',
  },
  
  {
    type: 'avoid',
    text: 'എന്റെ ഹൃദയം തീയിലാണ് / നീ എന്നെ ഉയർന്നതും ഉയർന്നതും കൊണ്ടുപോകുന്നു',
    explanation: 'Literal translation of English phrases. "Heart on fire", "higher and higher" don\'t work naturally in Malayalam.',
    context: 'AVOID - Forced English idioms',
  },
  
  // REFERENCE (ACTUAL HITS)
  {
    type: 'reference',
    text: 'നിലാവിൻ പൊൻപന്തലിൽ / നീ മാഞ്ഞാലും നിൻ വരവ് മിഴിയിൽ',
    explanation: 'Classic Malayalam cinema. Beautiful poetic Malayalam. Moonlight imagery. Natural flow. (Actual hit song structure)',
    context: 'Golden age Malayalam cinema reference',
  },
  
  {
    type: 'reference',
    text: 'മഴ നനഞ്ഞ മന്ത്രങ്ങൾ / കാറ്റിൽ പറന്നു നടക്കുമ്പോൾ',
    explanation: 'Modern Malayalam cinema. Rain + Wind (monsoon). Poetic but conversational. Natural Malayalam.',
    context: 'Contemporary Malayalam film music',
  },
];

// ==================== MALAYALAM LANGUAGE CONFIG ====================

export const malayalamConfig: LanguageConfig = {
  id: 'malayalam',
  name: 'Malayalam',
  nativeName: 'മലയാളം',
  tier: 'tier1', // PRIORITY alongside English
  
  scripts: ['Malayalam script (മലയാളം)', 'Romanized (Latin)'],
  
  dialects: [
    'Standard Malayalam (മാനക മലയാളം)',
    'Trivandrum dialect (തിരുവനന്തപുരം)',
    'Thrissur dialect (തൃശൂർ)',
    'Malabar dialect (മലബാർ)',
    'Cinema Malayalam (സിനിമാ മലയാളം)',
  ],
  
  musicalTraditions: malayalamMusicalTraditions,
  poeticDevices: malayalamPoeticDevices,
  singingStyles: malayalamSingingStyles,
  musicalScales: malayalamMusicalScales,
  
  commonInstruments: [
    'Chenda (ചെണ്ട)',
    'Maddalam (മദ്ദളം)',
    'Edakka (ഇടയ്ക്ക)',
    'Veena (വീണ)',
    'Violin',
    'Flute (കുഴൽ)',
    'Mridangam (മൃദംഗം)',
    'Harmonium',
    'Keyboard',
    'Acoustic Guitar',
  ],
  
  culturalThemes: [
    'മഴ (Mazha) - Monsoon/Rain (deeply romantic)',
    'കടൽ (Kadal) - Sea (vastness, depth)',
    'തെങ്ങ് (Thengu) - Coconut palm (Kerala identity)',
    'കായൽ (Kayal) - Backwaters (calm, peaceful)',
    'നാട് (Nadu) - Homeland (nostalgia)',
    'പ്രണയം (Pranayam) - Love',
    'വിരഹം (Viraham) - Separation/Longing',
    'ഓർമ്മ (Ormma) - Memory',
    'സ്വപ്നം (Swapnam) - Dream',
    'പ്രകൃതി (Prakrithi) - Nature',
  ],
  
  lyricExamples: malayalamLyricExamples,
  
  enabled: true,
};

// ==================== MALAYALAM SONG STRUCTURES ====================

export const malayalamSongStructures = {
  cinema: {
    romantic: ['intro', 'verse1', 'chorus', 'interlude', 'verse2', 'chorus', 'bridge', 'chorus', 'outro'],
    melancholic: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'outro'],
    upbeat: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus'],
  },
  
  folk: {
    mappila: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'verse3', 'chorus'],
    nadan: ['verse1', 'chorus', 'verse2', 'chorus', 'verse3', 'chorus'],
  },
  
  classical: {
    sopana: ['alap', 'sthayi', 'antara', 'sthayi'],
    carnatic: ['pallavi', 'anupallavi', 'charanam'],
  },
};

// ==================== CULTURAL NOTES ====================

export const malayalamCulturalNotes = {
  monsoon: 'Monsoon (മഴ - Mazha) is THE most romantic season in Kerala. Rain = Love, longing, sadness.',
  sea: 'Sea (കടൽ - Kadal) represents vastness and depth of emotion. Kerala has 600km coastline.',
  coconutPalm: 'Coconut palm (തെങ്ങ് - Thengu) is Kerala\'s symbol. Represents home and identity.',
  backwaters: 'Backwaters (കായൽ - Kayal) represent calm, peaceful love. Unique to Kerala.',
  
  language: {
    soft: 'Malayalam is considered one of the sweetest-sounding Indian languages',
    poetic: 'Malayalam cinema is known for highly poetic, literary lyrics',
    conversational: 'Modern Malayalam songs favor natural, conversational language',
  },
  
  avoidances: [
    'Don\'t translate English idioms directly',
    'Avoid overuse of Sanskrit unless going for classical feel',
    'Don\'t ignore monsoon imagery - it\'s central to Kerala romance',
    'Maintain soft, melodic quality - Malayalam cinema is known for this',
  ],
};

// ==================== EXPORT ====================

export default malayalamConfig;
