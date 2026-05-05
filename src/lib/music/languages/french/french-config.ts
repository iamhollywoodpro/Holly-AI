/**
 * HOLLY - French Language Configuration (TIER 3)
 * Chanson française, Francophone Integration
 * 
 * Complete cultural and musical context for authentic French songwriting
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

const frenchMusicalTraditions: MusicalTradition[] = [
  // Chanson française
  {
    id: 'chanson-francaise-classic',
    name: 'Chanson française (Classic)',
    category: 'classical',
    description: 'Classic French chanson - poetic, romantic, sophisticated',
    characteristics: [
      'Poetic lyrics',
      'Accordion prominent',
      'Parisian atmosphere',
      'Romantic themes',
      'Sophisticated French',
      'Literary quality',
    ],
    typicalInstruments: ['Accordion', 'Acoustic Guitar', 'Piano', 'Upright Bass', 'Violin'],
    vocaStyleGuidance: 'Classic French chanson, poetic delivery, Parisian accent, romantic expression, sophisticated',
  },

  {
    id: 'chanson-realiste',
    name: 'Chanson Réaliste',
    category: 'classical',
    description: 'Realistic chanson - working class, emotional, dramatic',
    characteristics: [
      'Working class themes',
      'Emotional drama',
      'Piaf tradition',
      'Strong vocals',
      'Paris street culture',
      'Tragic themes',
    ],
    typicalInstruments: ['Accordion', 'Piano', 'Strings', 'Minimal instrumentation'],
    vocaStyleGuidance: 'Dramatic French vocals, working class authenticity, emotional intensity, Piaf-style delivery',
  },

  // Modern French Pop
  {
    id: 'french-pop-modern',
    name: 'French Pop (Modern)',
    category: 'modern',
    description: 'Contemporary French pop music',
    characteristics: [
      'Modern production',
      'French lyrics',
      'International influences',
      'Youth-oriented',
      'Electronic elements',
      'Accessible melodies',
    ],
    typicalInstruments: ['Synthesizers', 'Electronic beats', 'Guitar', 'Bass', 'Modern production'],
    vocaStyleGuidance: 'Modern French pop vocals, contemporary delivery, accessible style, youth-oriented',
  },

  {
    id: 'french-electro-pop',
    name: 'French Electro Pop',
    category: 'modern',
    description: 'French electronic pop - Daft Punk influence',
    characteristics: [
      'Electronic production',
      'Synth-heavy',
      'Dance-oriented',
      'International appeal',
      'Cool aesthetic',
      'French touch',
    ],
    typicalInstruments: ['Synthesizers', 'Electronic beats', 'Vocoder', 'Electronic production'],
    vocaStyleGuidance: 'Electronic French vocals, cool delivery, modern production, dance-oriented, French touch',
  },

  // Nouvelle Chanson
  {
    id: 'nouvelle-chanson',
    name: 'Nouvelle Chanson',
    category: 'modern',
    description: 'New French chanson - indie, alternative',
    characteristics: [
      'Indie aesthetic',
      'Alternative sounds',
      'Modern poetry',
      'Artistic freedom',
      'Less traditional',
      'Contemporary themes',
    ],
    typicalInstruments: ['Indie rock instruments', 'Acoustic', 'Electronic elements', 'Alternative production'],
    vocaStyleGuidance: 'Indie French vocals, alternative delivery, modern poetic style, artistic freedom',
  },

  // French Hip Hop
  {
    id: 'french-hip-hop',
    name: 'French Hip Hop/Rap',
    category: 'modern',
    description: 'French rap - banlieue culture, social commentary',
    characteristics: [
      'Rap-focused',
      'Banlieue culture',
      'Social commentary',
      'Street French',
      'Political themes',
      'Urban identity',
    ],
    typicalInstruments: ['Hip hop beats', 'Minimal instrumentation', 'Electronic production'],
    vocaStyleGuidance: 'French rap delivery, street French, banlieue accent, social commentary, urban attitude',
  },

  // Variété française
  {
    id: 'variete-francaise',
    name: 'Variété française',
    category: 'modern',
    description: 'French variety music - mainstream appeal',
    characteristics: [
      'Mainstream French pop',
      'Variety show tradition',
      'Accessible',
      'Family-friendly',
      'Wide appeal',
      'Television culture',
    ],
    typicalInstruments: ['Full band', 'Orchestra', 'Modern production'],
    vocaStyleGuidance: 'Mainstream French vocals, accessible delivery, variety show style, family-friendly',
  },

  // French Rock
  {
    id: 'french-rock',
    name: 'French Rock',
    category: 'modern',
    description: 'French rock music - rebellious, energetic',
    characteristics: [
      'Rock energy',
      'French lyrics',
      'Rebellious themes',
      'Electric guitars',
      'Alternative attitude',
    ],
    typicalInstruments: ['Electric Guitar', 'Bass', 'Drums', 'Rock instrumentation'],
    vocaStyleGuidance: 'French rock vocals, energetic delivery, rebellious attitude, rock style',
  },

  // Francophone African
  {
    id: 'afro-francophone',
    name: 'Afro-Francophone',
    category: 'folk',
    description: 'African French music - zouk, coupé-décalé',
    characteristics: [
      'African rhythms',
      'French lyrics',
      'Dance-oriented',
      'Tropical vibes',
      'African diaspora',
      'Festive atmosphere',
    ],
    typicalInstruments: ['African percussion', 'Synthesizers', 'Guitar', 'Bass', 'Electronic beats'],
    vocaStyleGuidance: 'Afro-Francophone vocals, African French accent, rhythmic delivery, festive style',
  },

  // Québécois
  {
    id: 'quebecois-chanson',
    name: 'Québécois Chanson',
    category: 'folk',
    description: 'Quebec French music - distinct identity',
    characteristics: [
      'Quebec identity',
      'Distinct accent',
      'Folk traditions',
      'Winter/nature themes',
      'Canadian culture',
    ],
    typicalInstruments: ['Acoustic guitar', 'Accordion', 'Fiddle', 'Traditional instruments'],
    vocaStyleGuidance: 'Québécois vocals, Quebec accent, folk delivery, Canadian French identity',
  },
];

// ==================== POETIC DEVICES ====================

const frenchPoeticDevices: PoeticDevice[] = [
  {
    name: 'Je ne sais quoi',
    type: 'cultural',
    description: 'French concept - indefinable quality, charm, that certain something',
    examples: [
      'Ineffable quality',
      'Undefinable charm',
      'That certain something',
    ],
    usage: 'Essential French aesthetic concept',
  },

  {
    name: 'Joie de vivre',
    type: 'cultural',
    description: 'Joy of living - French lifestyle concept',
    examples: [
      'Joy of life',
      'Living fully',
      'French lifestyle',
    ],
    usage: 'Core French cultural concept',
  },

  {
    name: 'L\'amour fou',
    type: 'cultural',
    description: 'Mad love - passionate, irrational love',
    examples: [
      'Passionate love',
      'Mad romance',
      'Irrational devotion',
    ],
    usage: 'French romantic concept',
  },

  {
    name: 'French Nature Imagery',
    type: 'metaphor',
    description: 'French landscape and seasons in poetry',
    examples: [
      'Lune (Moon) = Romance, night',
      'Seine (River) = Paris, romance',
      'Pluie (Rain) = Melancholy, atmosphere',
      'Mer (Sea) = Freedom, vastness',
      'Rose (Rose) = Love, beauty',
    ],
    usage: 'Essential for French lyrics',
  },

  {
    name: 'Parisian References',
    type: 'cultural',
    description: 'Paris landmarks and culture',
    examples: [
      'Tour Eiffel (Eiffel Tower)',
      'Champs-Élysées',
      'Montmartre',
      'Café culture',
      'Left Bank (Rive Gauche)',
    ],
    usage: 'Iconic French cultural references',
  },

  {
    name: 'French Rhyme Schemes',
    type: 'rhyme',
    description: 'Rich rhyming in French poetry and chanson',
    examples: [
      '-é/-er endings: Aimer/Rêver',
      '-eur/-eur: Cœur/Bonheur',
      '-oi/-moi: Toi/Moi',
    ],
    usage: 'French is extremely rich in rhyming',
  },

  {
    name: 'Alliteration (French)',
    type: 'structure',
    description: 'Repetition of consonant sounds',
    examples: [
      'L\'amour toujours (Love always)',
      'Belle et blanche (Beautiful and white)',
      'Mon cœur content (My content heart)',
    ],
    usage: 'Creates musicality in French lyrics',
  },

  {
    name: 'French Pronouns',
    type: 'cultural',
    description: 'Tu vs. Vous - intimacy level',
    examples: [
      'Tu (informal) = intimacy, friendship',
      'Vous (formal) = respect, distance',
      'Pronoun choice shows relationship',
    ],
    usage: 'French pronoun choice affects emotional tone',
  },

  {
    name: 'Repetition for Emphasis',
    type: 'structure',
    description: 'Emotional intensification through repetition',
    examples: [
      'Je t\'aime, je t\'aime, je t\'aime',
      'Encore, encore',
      'Toujours, toujours',
    ],
    usage: 'Common in French chanson',
  },
];

// ==================== SINGING STYLES ====================

const frenchSingingStyles: SingingStyle[] = [
  {
    id: 'chanson-francaise-classic-style',
    name: 'Chanson française (Classic)',
    characteristics: ['Poetic', 'Romantic', 'Sophisticated', 'Parisian', 'Expressive'],
    vocalTechniques: ['Poetic delivery', 'Clear French pronunciation', 'Romantic expression', 'Sophisticated phrasing'],
    emotionalDelivery: 'Poetic, romantic, sophisticated, Parisian elegance, expressive',
    culturalContext: 'Classic French chanson tradition',
    referenceArtists: ['Édith Piaf', 'Jacques Brel', 'Charles Aznavour', 'Georges Brassens'],
    sunoStyleHints: [
      'chanson française vocals',
      'poetic French singing',
      'romantic delivery',
      'Parisian style',
      'sophisticated',
    ],
  },

  {
    id: 'chanson-realiste-dramatic',
    name: 'Chanson Réaliste',
    characteristics: ['Dramatic', 'Emotional intensity', 'Working class', 'Powerful', 'Piaf-style'],
    vocalTechniques: ['Dramatic delivery', 'Powerful vocals', 'Emotional intensity', 'Working class authenticity'],
    emotionalDelivery: 'Dramatic, emotionally intense, working class soul, powerful',
    culturalContext: 'Piaf tradition',
    referenceArtists: ['Édith Piaf', 'Fréhel', 'Damia'],
    sunoStyleHints: [
      'chanson réaliste vocals',
      'dramatic French singing',
      'Piaf-style delivery',
      'emotional intensity',
      'powerful',
    ],
  },

  {
    id: 'french-pop-modern-style',
    name: 'French Pop (Modern)',
    characteristics: ['Modern', 'Accessible', 'Youth-oriented', 'Contemporary', 'French charm'],
    vocalTechniques: ['Modern French vocals', 'Accessible delivery', 'Contemporary style', 'Clear pronunciation'],
    emotionalDelivery: 'Modern, accessible, youth-oriented, French charm, contemporary',
    culturalContext: 'Contemporary French pop',
    referenceArtists: ['Zaz', 'Stromae', 'Christine and the Queens', 'Angèle'],
    sunoStyleHints: [
      'modern French pop',
      'contemporary vocals',
      'accessible style',
      'youth-oriented',
      'French charm',
    ],
  },

  {
    id: 'french-electro-cool',
    name: 'French Electro',
    characteristics: ['Electronic', 'Cool', 'Dance-oriented', 'Vocoder', 'French touch'],
    vocalTechniques: ['Electronic processing', 'Vocoder', 'Cool delivery', 'Dance style', 'French touch'],
    emotionalDelivery: 'Electronic, cool, dance-oriented, French touch, modern',
    culturalContext: 'French electronic music',
    referenceArtists: ['Daft Punk', 'Justice', 'Phoenix', 'M83'],
    sunoStyleHints: [
      'French electro vocals',
      'electronic processing',
      'cool delivery',
      'French touch',
      'dance-oriented',
    ],
  },

  {
    id: 'french-rap-street',
    name: 'French Rap',
    characteristics: ['Rap flow', 'Street French', 'Social commentary', 'Urban', 'Banlieue'],
    vocalTechniques: ['French rap flow', 'Street French', 'Urban delivery', 'Social commentary', 'Banlieue accent'],
    emotionalDelivery: 'Urban, street attitude, social commentary, French rap style',
    culturalContext: 'French hip hop scene',
    referenceArtists: ['MC Solaar', 'IAM', 'Booba', 'Nekfeu'],
    sunoStyleHints: [
      'French rap vocals',
      'street French delivery',
      'urban style',
      'social commentary',
      'banlieue accent',
    ],
  },

  {
    id: 'nouvelle-chanson-indie',
    name: 'Nouvelle Chanson (Indie)',
    characteristics: ['Indie', 'Alternative', 'Modern poetic', 'Authentic', 'Less polished'],
    vocalTechniques: ['Indie delivery', 'Modern poetic style', 'Authentic expression', 'Alternative French'],
    emotionalDelivery: 'Indie, authentic, modern poetic, alternative, less polished charm',
    culturalContext: 'Modern French indie scene',
    referenceArtists: ['Camille', 'Jeanne Cherhal', 'Dominique A', 'Fishbach'],
    sunoStyleHints: [
      'nouvelle chanson vocals',
      'indie French style',
      'alternative delivery',
      'modern poetic',
      'authentic',
    ],
  },
];

// ==================== MUSICAL SCALES ====================

const frenchMusicalScales: MusicalScale[] = [
  {
    id: 'major-french',
    name: 'Major Scale (French)',
    type: 'major',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    mood: 'Bright, joyful, French joie de vivre',
    culturalContext: 'French chanson and pop',
    emotionalEffect: 'Bright, joyful, optimistic',
    usage: 'French pop, happy chanson',
  },

  {
    id: 'minor-natural-french',
    name: 'Natural Minor (French)',
    type: 'minor',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    mood: 'Melancholic, romantic',
    culturalContext: 'French chanson, romantic ballads',
    emotionalEffect: 'Melancholic, romantic, French soul',
    usage: 'Melancholic chanson, romantic French songs',
  },

  {
    id: 'harmonic-minor-french',
    name: 'Harmonic Minor (Dramatic)',
    type: 'minor',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G#'],
    mood: 'Dramatic, passionate',
    culturalContext: 'Dramatic French chanson',
    emotionalEffect: 'Dramatic, passionate, theatrical',
    usage: 'Dramatic chanson réaliste, passionate songs',
  },

  {
    id: 'mixolydian-french-rock',
    name: 'Mixolydian (French Rock)',
    type: 'modal',
    notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F'],
    mood: 'Rock, rebellious',
    culturalContext: 'French rock music',
    emotionalEffect: 'Rock energy, rebellious',
    usage: 'French rock, alternative music',
  },

  {
    id: 'pentatonic-french-pop',
    name: 'Pentatonic (French Pop)',
    type: 'pentatonic',
    notes: ['C', 'D', 'E', 'G', 'A'],
    mood: 'Accessible, pop',
    culturalContext: 'Modern French pop',
    emotionalEffect: 'Accessible, catchy, pop sensibility',
    usage: 'French pop, accessible melodies',
  },
];

// ==================== LYRIC EXAMPLES ====================

const frenchLyricExamples: LyricExample[] = [
  // AUTHENTIC CHANSON FRANÇAISE
  {
    type: 'authentic',
    text: 'Sous le ciel de Paris / S\'envole une chanson / Elle est née d\'aujourd\'hui / Dans le cœur d\'un garçon',
    explanation: 'Classic chanson. "Under the sky of Paris". Romantic, poetic. Natural French. Parisian imagery.',
    context: 'Classic Chanson française',
  },

  {
    type: 'authentic',
    text: 'La vie en rose / Quand il me prend dans ses bras / Il me parle tout bas / Je vois la vie en rose',
    explanation: 'Iconic Piaf song. "Life in pink". Romantic French. Simple but powerful. Classic chanson structure.',
    context: 'Chanson Réaliste (Piaf)',
  },

  // AUTHENTIC MODERN FRENCH POP
  {
    type: 'authentic',
    text: 'Je veux de l\'amour, de la joie, de la bonne humeur / Ce n\'est pas votre argent qui fera mon bonheur / Moi je veux crever la main sur le cœur',
    explanation: 'Modern French pop (Zaz). "I want love, joy, good mood". Social commentary. Natural French. Accessible.',
    context: 'Modern French Pop',
  },

  {
    type: 'authentic',
    text: 'Tous les mêmes / Vous les hommes êtes tous les mêmes / Macho mais cheap / Bande de mauviettes infidèles',
    explanation: 'Stromae style. "All the same". Social commentary. Modern French. Clever wordplay. Contemporary.',
    context: 'Contemporary French Pop',
  },

  // AUTHENTIC FRENCH ELECTRO
  {
    type: 'authentic',
    text: 'Around the world, around the world / Around the world, around the world / Around the world, around the world',
    explanation: 'Daft Punk style. Minimal lyrics. Electronic. English mixing. French touch. Repetition for effect.',
    context: 'French Electro',
  },

  // AUTHENTIC FRENCH RAP
  {
    type: 'authentic',
    text: 'Dans ma ville on grandit vite / Entre béton et bitume / Les rêves s\'écrivent à la craie / Sur les murs de la cité',
    explanation: 'French rap. Banlieue culture. "In my city we grow up fast". Concrete and asphalt. Urban French reality.',
    context: 'French Hip Hop',
  },

  // AUTHENTIC NOUVELLE CHANSON
  {
    type: 'authentic',
    text: 'Je t\'emmène au vent / Je t\'emmène au-dessus des gens / Et je voudrais que tu te rappelles / Notre amour est éternel',
    explanation: 'Indie French. "I take you to the wind". Poetic but modern. Natural French. Nouvelle chanson style.',
    context: 'Nouvelle Chanson',
  },

  // BAD EXAMPLES (AVOID)
  {
    type: 'avoid',
    text: 'Bébé bébé oh / Tu es mon soleil brillant / Je t\'aime tellement / Mon cœur est en feu',
    explanation: 'Direct English translation. "Baby baby oh". "You are my shining sun" unnatural. "Heart on fire" forced.',
    context: 'AVOID - Translated English clichés',
  },

  {
    type: 'avoid',
    text: 'Lève les mains / DJ monte le son / Danse toute la nuit / Fête jusqu\'au matin',
    explanation: 'Generic club clichés. "Hands up", "DJ turn it up". No French cultural depth. Sounds translated.',
    context: 'AVOID - Generic party lyrics',
  },

  // REFERENCE (CLASSIC STYLES)
  {
    type: 'reference',
    text: 'Non, rien de rien / Non, je ne regrette rien / Ni le bien qu\'on m\'a fait / Ni le mal, tout ça m\'est bien égal',
    explanation: 'Piaf classic. "No, nothing at all / No, I regret nothing". Iconic French chanson. Powerful simplicity.',
    context: 'Chanson Réaliste reference (Piaf)',
  },

  {
    type: 'reference',
    text: 'Ne me quitte pas / Il faut oublier / Tout peut s\'oublier / Qui s\'enfuit déjà',
    explanation: 'Jacques Brel classic. "Don\'t leave me". Poetic, desperate. Classic chanson française. Emotional depth.',
    context: 'Chanson française reference (Brel)',
  },
];

// ==================== FRENCH LANGUAGE CONFIG ====================

export const frenchConfig: LanguageConfig = {
  id: 'french',
  name: 'French',
  nativeName: 'Français',
  tier: 'tier3',
  
  scripts: ['Latin (Français)'],
  
  dialects: [
    'Standard French (Français standard)',
    'Parisian French (Parisien)',
    'Southern French (Midi)',
    'Québécois',
    'Belgian French',
    'Swiss French',
    'African French',
  ],
  
  musicalTraditions: frenchMusicalTraditions,
  poeticDevices: frenchPoeticDevices,
  singingStyles: frenchSingingStyles,
  musicalScales: frenchMusicalScales,
  
  commonInstruments: [
    'Accordion (Accordéon)',
    'Acoustic Guitar (Guitare acoustique)',
    'Piano',
    'Upright Bass',
    'Violin',
    'Synthesizers',
    'Electric Guitar',
    'Drums',
  ],
  
  culturalThemes: [
    'L\'amour (Love)',
    'La vie en rose (Life in pink)',
    'Joie de vivre (Joy of living)',
    'Paris (Parisian culture)',
    'Seine (River)',
    'Lune (Moon)',
    'Liberté (Freedom)',
    'Cœur (Heart)',
    'Rêve (Dream)',
    'Nostalgie (Nostalgia)',
  ],
  
  lyricExamples: frenchLyricExamples,
  
  enabled: true,
};

// ==================== FRENCH SONG STRUCTURES ====================

export const frenchSongStructures = {
  chanson: {
    classic: ['intro', 'verse1', 'verse2', 'chorus', 'verse3', 'chorus', 'outro'],
    realiste: ['intro', 'verse1', 'verse2', 'verse3', 'climax', 'outro'],
  },
  
  pop: {
    modern: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'pre-chorus', 'chorus', 'bridge', 'chorus', 'outro'],
  },
  
  electro: {
    dance: ['intro', 'build', 'drop', 'verse', 'build', 'drop', 'bridge', 'drop', 'outro'],
  },
  
  rap: {
    standard: ['intro', 'verse1', 'hook', 'verse2', 'hook', 'bridge', 'verse3', 'hook', 'outro'],
  },
  
  nouvelleChanson: {
    indie: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus', 'outro'],
  },
};

// ==================== CULTURAL NOTES ====================

export const frenchCulturalNotes = {
  chanson: 'Chanson française is THE French art form - poetic, romantic, sophisticated. Parisian elegance.',
  piaf: 'Édith Piaf tradition - chanson réaliste - working class drama, emotional intensity, powerful vocals.',
  joieDeVivre: 'Joie de vivre (joy of living) is essential French cultural concept.',
  paris: 'Paris references are iconic - Eiffel Tower, Seine, Montmartre, café culture.',
  
  language: {
    pronunciation: 'Clear French pronunciation essential - liaison, nasal vowels, proper accent.',
    pronouns: 'Tu vs. Vous choice shows intimacy level - affects emotional tone.',
    poetry: 'French language is naturally poetic - rich rhyming, beautiful sound.',
    francophone: 'French is spoken globally - Quebec, Belgium, Africa, each with distinct character.',
  },
  
  avoidances: [
    'Don\'t translate English idioms directly - they sound unnatural',
    'Don\'t ignore French poetic tradition - it\'s core to chanson',
    'Don\'t forget Paris cultural references - they\'re iconic',
    'Maintain French pronunciation - liaison, nasal vowels, proper accent',
    'Chanson requires poetic sophistication - not just simple lyrics',
  ],
};

// ==================== EXPORT ====================

export default frenchConfig;
