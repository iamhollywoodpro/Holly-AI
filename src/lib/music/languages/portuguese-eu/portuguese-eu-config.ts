/**
 * HOLLY - Portuguese (European/Portugal) Configuration - TIER 2
 * Fado, Portuguese Soul, Saudade
 * 
 * CRITICAL: European Portuguese is DIFFERENT from Brazilian Portuguese
 * Different pronunciation, vocabulary, cultural references
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

const portugueseEUMusicalTraditions: MusicalTradition[] = [
  // Fado (THE defining genre)
  {
    id: 'fado-lisbon',
    name: 'Fado de Lisboa (Lisbon Fado)',
    category: 'classical',
    description: 'Traditional urban Fado from Lisbon, expressing saudade and fate',
    characteristics: [
      'Mournful, melancholic melodies',
      'Phrygian mode (dark, Spanish influence)',
      'Saudade theme (untranslatable longing/nostalgia)',
      'Portuguese guitarra (12-string) essential',
      'Black shawl tradition for female singers',
      'Improvised guitar interludes',
      'Themes: lost love, nostalgia, fate, sea',
    ],
    typicalInstruments: ['Guitarra Portuguesa (12-string)', 'Viola (classical guitar)', 'Voice'],
    vocaStyleGuidance: 'Mournful, passionate, trembling voice (Portuguese soul), dramatic emotional expression, clear European Portuguese pronunciation with closed vowels',
  },

  {
    id: 'fado-coimbra',
    name: 'Fado de Coimbra',
    category: 'classical',
    description: 'Academic Fado from Coimbra University, traditionally male-only',
    characteristics: [
      'More restrained than Lisbon Fado',
      'Academic, intellectual themes',
      'Traditionally sung by male students',
      'Black academic capes',
      'Serenade tradition',
      'More structured than Lisbon Fado',
    ],
    typicalInstruments: ['Guitarra de Coimbra', 'Classical guitar', 'Voice'],
    vocaStyleGuidance: 'Restrained emotion, academic tone, clear diction, male vocals traditional, serenading style',
  },

  {
    id: 'portuguese-pop',
    name: 'Portuguese Pop',
    category: 'modern',
    description: 'Contemporary Portuguese pop music',
    characteristics: [
      'Western pop structures',
      'Portuguese language with pride',
      'Modern production',
      'Sometimes Fado influences',
      'Clear European Portuguese pronunciation',
      'Themes: love, modern life, Portuguese identity',
    ],
    typicalInstruments: ['Synthesizers', 'Electric guitar', 'Bass', 'Drums', 'Electronic production'],
    vocaStyleGuidance: 'Modern pop delivery, clear European Portuguese (closed vowels, sh sounds), emotional but contemporary',
  },

  {
    id: 'pimba',
    name: 'Pimba',
    category: 'folk',
    description: 'Popular Portuguese folk-pop music, festive and fun',
    characteristics: [
      'Upbeat, danceable',
      'Simple, catchy melodies',
      'Often humorous or double-entendre lyrics',
      'Accordion common',
      'Festival and party music',
      'Very Portuguese cultural identity',
    ],
    typicalInstruments: ['Accordion', 'Synthesizers', 'Percussion', 'Guitar'],
    vocaStyleGuidance: 'Upbeat, fun, clear Portuguese, festive delivery, sometimes humorous',
  },

  {
    id: 'portuguese-hip-hop-tuga',
    name: 'Hip-Hop Tuga (Portuguese Hip-Hop)',
    category: 'modern',
    description: 'Portuguese hip-hop with strong social commentary',
    characteristics: [
      'European Portuguese rap',
      'Social issues, immigration, identity',
      'Portuguese slang and references',
      'African influences (former colonies)',
      'Strong cultural Portuguese identity',
    ],
    typicalInstruments: ['Beats', 'Samples', 'Electronic production'],
    vocaStyleGuidance: 'Confident rap flow, European Portuguese pronunciation, urban slang, social commentary tone',
  },

  {
    id: 'cantiga-de-amigo',
    name: 'Cantigas de Amigo (Medieval Poetry)',
    category: 'classical',
    description: 'Medieval Galician-Portuguese poetry and songs',
    characteristics: [
      'Medieval poetry tradition',
      'Feminine perspective',
      'Nature imagery',
      'Longing for absent lover',
      'Simple, repetitive structure',
    ],
    typicalInstruments: ['Medieval instruments', 'Voice', 'Lute'],
    vocaStyleGuidance: 'Medieval style, clear Portuguese, storytelling, feminine perspective',
  },
];

// ==================== POETIC DEVICES ====================

const portugueseEUPoeticDevices: PoeticDevice[] = [
  {
    name: 'Saudade',
    type: 'cultural',
    description: 'UNTRANSLATABLE Portuguese concept: deep longing/nostalgia for something/someone that may never return. THE defining emotion in Portuguese culture and Fado.',
    examples: [
      'Tenho saudades tuas (I miss you - but deeper, untranslatable)',
      'Saudade do que foi (Longing for what once was)',
      'A saudade é o amor que fica (Saudade is the love that remains)',
    ],
    usage: 'ESSENTIAL for authentic Portuguese music. No other language has this exact emotion.',
  },

  {
    name: 'Maritime Metaphors',
    type: 'metaphor',
    description: 'Sea imagery central to Portuguese identity (Age of Discovery, maritime empire)',
    examples: [
      'O mar salgado (The salty sea)',
      'Navegar é preciso (To sail is necessary)',
      'Porto seguro (Safe harbor)',
      'Marinheiro (Sailor) = traveler, seeker',
    ],
    usage: 'Essential for Portuguese cultural authenticity. Portugal = sea nation.',
  },

  {
    name: 'Sebastianismo',
    type: 'cultural',
    description: 'Portuguese messianic belief in return of King Sebastian and return to past glory',
    examples: [
      'References to lost glory',
      'Hope for return to greatness',
      'Nostalgia for Portuguese empire',
    ],
    usage: 'Deep cultural reference in Portuguese literature and Fado.',
  },

  {
    name: 'Phrygian Mode (Fado)',
    type: 'structure',
    description: 'Musical mode used in Fado, creates dark, melancholic, Spanish-influenced sound',
    examples: [
      'Characteristic Fado chord progressions',
      'Minor key with lowered 2nd degree',
    ],
    usage: 'Essential for authentic Fado sound.',
  },

  {
    name: 'Redondilha',
    type: 'structure',
    description: 'Traditional Portuguese verse form (7 syllables per line)',
    examples: [
      'Sete sílabas por verso (Seven syllables per verse)',
    ],
    usage: 'Traditional Portuguese poetry and Fado lyrics.',
  },

  {
    name: 'Repetition and Refrain',
    type: 'structure',
    description: 'Repetitive structure in Fado and folk songs',
    examples: [
      'Repeating emotional phrases',
      'Building intensity through repetition',
    ],
    usage: 'Creates emotional impact in Fado.',
  },
];

// ==================== SINGING STYLES ====================

const portugueseEUSingingStyles: SingingStyle[] = [
  {
    id: 'fado-traditional',
    name: 'Fado Traditional',
    characteristics: ['Mournful', 'Passionate', 'Trembling voice', 'Emotional tremor', 'Portuguese soul'],
    vocalTechniques: ['Controlled vibrato', 'Emotional tremor', 'Dynamic range soft-loud', 'Clear diction'],
    emotionalDelivery: 'Deep saudade, melancholy, passion, Portuguese soul, emotional vulnerability',
    culturalContext: 'Traditional Lisbon Fado houses, black shawl tradition',
    referenceArtists: ['Amália Rodrigues', 'Mariza', 'Ana Moura', 'Carlos do Carmo'],
    sunoStyleHints: [
      'Portuguese Fado vocals',
      'melancholic delivery',
      'emotional tremor',
      'Portuguese soul',
      'guitarra portuguesa accompaniment',
      'saudade emotion',
    ],
  },

  {
    id: 'portuguese-pop-modern',
    name: 'Portuguese Pop (Modern)',
    characteristics: ['Clear', 'Modern', 'European Portuguese pronunciation', 'Contemporary'],
    vocalTechniques: ['Modern pop techniques', 'Clear diction', 'Closed vowels', 'SH sounds'],
    emotionalDelivery: 'Modern, emotional but contemporary, Portuguese identity',
    culturalContext: 'Contemporary Portuguese music scene',
    referenceArtists: ['Salvador Sobral', 'Aurea', 'Agir', 'Carolina Deslandes'],
    sunoStyleHints: [
      'Portuguese pop vocals',
      'European Portuguese',
      'modern delivery',
      'clear Portuguese pronunciation',
      'contemporary style',
    ],
  },

  {
    id: 'hip-hop-tuga',
    name: 'Hip-Hop Tuga',
    characteristics: ['Rap flow', 'European Portuguese', 'Urban slang', 'Social commentary'],
    vocalTechniques: ['Portuguese rap flow', 'Clear diction', 'Urban slang', 'Rhythmic delivery'],
    emotionalDelivery: 'Confident, socially conscious, Portuguese urban identity',
    culturalContext: 'Portuguese hip-hop scene',
    referenceArtists: ['Sam the Kid', 'Boss AC', 'Dealema'],
    sunoStyleHints: [
      'Portuguese rap',
      'hip-hop tuga style',
      'European Portuguese flow',
      'urban Portuguese',
      'social commentary',
    ],
  },
];

// ==================== MUSICAL SCALES ====================

const portugueseEUMusicalScales: MusicalScale[] = [
  {
    id: 'phrygian-fado',
    name: 'Phrygian Mode (Fado Scale)',
    type: 'modal',
    notes: ['E', 'F', 'G', 'A', 'B', 'C', 'D'],
    mood: 'Dark, melancholic, Spanish-influenced',
    culturalContext: 'Essential for authentic Fado sound',
    emotionalEffect: 'Melancholy, saudade, deep emotion',
    usage: 'Traditional Fado, melancholic songs',
  },

  {
    id: 'minor-portuguese',
    name: 'Natural Minor (Portuguese)',
    type: 'minor',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    mood: 'Sad, emotional, melancholic',
    culturalContext: 'Common in Portuguese pop and Fado-influenced songs',
    emotionalEffect: 'Sadness, melancholy, emotional depth',
    usage: 'Portuguese pop ballads, emotional songs',
  },

  {
    id: 'major-portuguese-pop',
    name: 'Major Scale (Portuguese Pop)',
    type: 'major',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    mood: 'Uplifting, positive',
    culturalContext: 'Modern Portuguese pop',
    emotionalEffect: 'Happiness, hope, optimism',
    usage: 'Upbeat Portuguese pop, Pimba',
  },
];

// ==================== LYRIC EXAMPLES ====================

const portugueseEULyricExamples: LyricExample[] = [
  // AUTHENTIC FADO
  {
    type: 'authentic',
    text: 'O mar salgado, quanto do teu sal / São lágrimas de Portugal',
    explanation: 'Classic Portuguese poetry (Fernando Pessoa). Maritime metaphor. Deep Portuguese cultural reference. "How much of the salty sea / Are tears of Portugal"',
    context: 'Traditional Fado - maritime nation identity',
  },

  {
    type: 'authentic',
    text: 'Ai esta terra ainda vai cumprir seu ideal / Ainda vai tornar-se um império colonial',
    explanation: 'Sebastianismo reference. Portuguese messianic hope. Cultural depth. Historical reference.',
    context: 'Fado - Portuguese cultural identity',
  },

  {
    type: 'authentic',
    text: 'Tenho saudades tuas / Como o mar tem saudades das praias',
    explanation: 'SAUDADE - the untranslatable Portuguese emotion. Maritime metaphor. "I miss you / Like the sea misses the beaches"',
    context: 'Classic Fado structure',
  },

  // AUTHENTIC MODERN PORTUGUESE
  {
    type: 'authentic',
    text: 'Amar pelos dois / Se um de nós tiver que sofrer / Que seja eu',
    explanation: 'Modern Portuguese pop. Simple, direct European Portuguese. Won Eurovision 2017. "Love for both / If one of us has to suffer / Let it be me"',
    context: 'Salvador Sobral - modern Portuguese pop',
  },

  // EUROPEAN VS BRAZILIAN DIFFERENCE
  {
    type: 'reference',
    text: 'European PT: "Estou com saudades tuas" / Brazilian PT: "Estou com saudades de você"',
    explanation: 'CRITICAL DIFFERENCE! European uses "tuas", Brazilian uses "de você". Different pronouns, pronunciation (closed vs open vowels).',
    context: 'European vs Brazilian Portuguese distinction',
  },

  // BAD EXAMPLES (AVOID)
  {
    type: 'avoid',
    text: 'Baby baby oh / És o meu sol / Dançar ao luar',
    explanation: 'Direct English translation. "Baby baby oh" sounds awful in Portuguese. No cultural context.',
    context: 'AVOID - English clichés translated',
  },

  {
    type: 'avoid',
    text: 'Estou com saudades de você',
    explanation: 'This is BRAZILIAN Portuguese! European Portuguese says "Estou com saudades tuas" or "Tenho saudades tuas".',
    context: 'AVOID for Portugal - this is Brazil',
  },

  // REFERENCE (ACTUAL HITS)
  {
    type: 'reference',
    text: 'Lisboa não é cidade pra mim / Lisboa é saudade que eu sinto de mim',
    explanation: 'Amália Rodrigues classic. Saudade. Lisbon identity. Perfect European Portuguese. "Lisbon is not a city for me / Lisbon is the saudade I feel for myself"',
    context: 'Amália Rodrigues - Fado icon',
  },
];

// ==================== PORTUGUESE (EUROPEAN) CONFIG ====================

export const portugueseEUConfig: LanguageConfig = {
  id: 'portuguese-eu',
  name: 'Portuguese (European/Portugal)',
  nativeName: 'Português Europeu',
  tier: 'tier2',
  
  scripts: ['Latin'],
  
  dialects: [
    'Lisbon Portuguese (Lisboa)',
    'Porto Portuguese (Porto)',
    'Alentejo dialect',
    'Azores dialect',
    'Madeira dialect',
  ],
  
  musicalTraditions: portugueseEUMusicalTraditions,
  poeticDevices: portugueseEUPoeticDevices,
  singingStyles: portugueseEUSingingStyles,
  musicalScales: portugueseEUMusicalScales,
  
  commonInstruments: [
    'Guitarra Portuguesa (12-string)',
    'Viola (classical guitar)',
    'Accordion (Pimba)',
    'Piano',
    'Strings',
    'Modern electronic (pop)',
  ],
  
  culturalThemes: [
    'Saudade (untranslatable longing)',
    'Mar (Sea) - maritime nation',
    'Pátria (Homeland)',
    'Amor (Love with longing)',
    'Destino (Fate/Destiny)',
    'Nostalgia (past glory)',
    'Sebastianismo (messianic hope)',
    'Fado (fate, destiny)',
  ],
  
  lyricExamples: portugueseEULyricExamples,
  
  enabled: true,
};

// ==================== CULTURAL NOTES ====================

export const portugueseEUCulturalNotes = {
  saudade: 'THE defining Portuguese emotion. Untranslatable. Deep longing/nostalgia. Essential for authentic Portuguese music.',
  
  europeanVsBrazilian: {
    pronunciation: 'European: closed vowels, SH sounds. Brazilian: open vowels, nasal sounds.',
    grammar: 'European: "tu" (you), "tuas" (yours). Brazilian: "você", "de você".',
    vocabulary: 'Many differences. Examples: PT-EU "comboio" vs PT-BR "trem" (train).',
    critical: 'NEVER mix them! European Portuguese for Portugal. Different culture, different sound.',
  },
  
  fado: {
    essence: 'Fado = Fate. Not just sad music, but expression of saudade and Portuguese soul.',
    blackShawl: 'Traditional female Fado singers wear black shawls.',
    guitarra: 'Portuguese guitarra (12-string) is essential - different from Spanish guitar.',
  },
  
  maritime: 'Sea is central to Portuguese identity. Age of Discovery, maritime empire, navigators.',
  
  avoidances: [
    'Never use Brazilian Portuguese vocabulary or grammar for Portugal',
    'Don\'t translate English directly - sounds unnatural',
    'Don\'t ignore saudade - it\'s THE Portuguese emotion',
    'Don\'t confuse Spanish with Portuguese (very different!)',
    'Maintain European pronunciation (closed vowels, SH sounds)',
  ],
};

// ==================== EXPORT ====================

export default portugueseEUConfig;
