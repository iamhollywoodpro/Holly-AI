/**
 * HOLLY - Italian Language Configuration (TIER 2)
 * Opera, Canzone Napoletana, Trap Italiano Integration
 * 
 * Complete cultural and musical context for authentic Italian songwriting
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

const italianMusicalTraditions: MusicalTradition[] = [
  // Opera
  {
    id: 'opera-aria',
    name: 'Opera Aria',
    category: 'classical',
    description: 'Classical Italian opera arias - the pinnacle of vocal technique',
    characteristics: [
      'Bel canto technique',
      'Dramatic storytelling',
      'Orchestral accompaniment',
      'Operatic voice',
      'Classical Italian pronunciation',
      'Theatrical delivery',
    ],
    typicalInstruments: ['Full Orchestra', 'Strings', 'Woodwinds', 'Brass', 'Percussion'],
    vocaStyleGuidance: 'Operatic voice, bel canto technique, dramatic delivery, perfect Italian diction, classical style',
  },

  {
    id: 'opera-duet',
    name: 'Opera Duet',
    category: 'classical',
    description: 'Operatic duets - dramatic vocal interplay',
    characteristics: [
      'Two voices in harmony/counterpoint',
      'Dramatic storytelling',
      'Emotional intensity',
      'Bel canto technique',
      'Theatrical interaction',
    ],
    typicalInstruments: ['Orchestra', 'Strings', 'Woodwinds'],
    vocaStyleGuidance: 'Operatic duet style, dramatic interaction, bel canto, emotional intensity, perfect harmony',
  },

  // Canzone Napoletana
  {
    id: 'canzone-napoletana-classic',
    name: 'Canzone Napoletana (Classic)',
    category: 'folk',
    description: 'Classic Neapolitan song - romantic, passionate, Italian soul',
    characteristics: [
      'Romantic, passionate',
      'Neapolitan dialect',
      'Mandolin accompaniment',
      'Mediterranean soul',
      'Dramatic delivery',
      'Italian cultural identity',
    ],
    typicalInstruments: ['Mandolin', 'Guitar', 'Accordion', 'Strings'],
    vocaStyleGuidance: 'Passionate, romantic, Neapolitan accent, dramatic Italian delivery, soulful expression',
  },

  {
    id: 'canzone-napoletana-melancholic',
    name: 'Canzone Napoletana (Melancholic)',
    category: 'folk',
    description: 'Melancholic Neapolitan songs - nostalgia and longing',
    characteristics: [
      'Nostalgic',
      'Melancholic beauty',
      'Neapolitan dialect',
      'Sea and Naples imagery',
      'Emotional depth',
      'Traditional style',
    ],
    typicalInstruments: ['Mandolin', 'Classical Guitar', 'Accordion', 'Strings'],
    vocaStyleGuidance: 'Melancholic, nostalgic, Neapolitan dialect, emotional vulnerability, traditional delivery',
  },

  // Italian Pop
  {
    id: 'italian-pop-classic',
    name: 'Italian Pop (Classic)',
    category: 'modern',
    description: 'Classic Italian pop - melodic, romantic, 60s-80s style',
    characteristics: [
      'Melodic, romantic',
      'Clear Italian lyrics',
      'Orchestra/band arrangements',
      'San Remo style',
      'Italian cultural themes',
      'Accessible melodies',
    ],
    typicalInstruments: ['Piano', 'Strings', 'Guitar', 'Bass', 'Drums', 'Orchestra'],
    vocaStyleGuidance: 'Melodic, clear Italian pronunciation, romantic delivery, classic pop style, emotional',
  },

  {
    id: 'italian-pop-modern',
    name: 'Italian Pop (Modern)',
    category: 'modern',
    description: 'Contemporary Italian pop music',
    characteristics: [
      'Modern production',
      'Italian lyrics',
      'International influence',
      'Youth-oriented',
      'Urban themes',
      'Electronic elements',
    ],
    typicalInstruments: ['Synthesizers', 'Electronic beats', 'Guitar', 'Bass', 'Modern production'],
    vocaStyleGuidance: 'Modern Italian pop, clear diction, contemporary delivery, accessible style',
  },

  // Italian Trap
  {
    id: 'trap-italiano',
    name: 'Trap Italiano',
    category: 'modern',
    description: 'Italian trap and urban music',
    characteristics: [
      'Trap beats',
      'Italian slang',
      'Urban themes',
      'Modern production',
      'Autotuned vocals',
      'Street culture',
    ],
    typicalInstruments: ['808 bass', 'Hi-hats', 'Synth', 'Trap production'],
    vocaStyleGuidance: 'Urban Italian, trap delivery, modern slang, autotuned style, street attitude',
  },

  // Traditional
  {
    id: 'italian-folk',
    name: 'Italian Folk (Tarantella, etc.)',
    category: 'folk',
    description: 'Traditional Italian regional folk music',
    characteristics: [
      'Regional styles',
      'Dance accompaniment',
      'Traditional instruments',
      'Folk melodies',
      'Regional dialects',
      'Cultural heritage',
    ],
    typicalInstruments: ['Accordion', 'Mandolin', 'Tamburello', 'Folk instruments'],
    vocaStyleGuidance: 'Traditional Italian folk, regional accent, folk delivery, cultural authenticity',
  },

  {
    id: 'italian-chanson',
    name: 'Italian Chanson (Singer-Songwriter)',
    category: 'modern',
    description: 'Italian cantautore tradition - poetic singer-songwriters',
    characteristics: [
      'Poetic lyrics',
      'Social commentary',
      'Literary Italian',
      'Acoustic/minimal arrangements',
      'Storytelling',
      'Intellectual depth',
    ],
    typicalInstruments: ['Acoustic Guitar', 'Piano', 'Minimal instrumentation'],
    vocaStyleGuidance: 'Poetic delivery, intellectual Italian, storytelling style, emotional depth, clear diction',
  },

  // Religious
  {
    id: 'sacred-italian',
    name: 'Sacred Italian Music',
    category: 'classical',
    description: 'Italian sacred music - Gregorian chant to sacred arias',
    characteristics: [
      'Sacred themes',
      'Latin-Italian mix',
      'Church acoustics',
      'Reverent delivery',
      'Classical technique',
      'Spiritual depth',
    ],
    typicalInstruments: ['Organ', 'Choir', 'Church orchestra'],
    vocaStyleGuidance: 'Reverent, sacred delivery, classical Italian, spiritual depth, church acoustic style',
  },
];

// ==================== POETIC DEVICES ====================

const italianPoeticDevices: PoeticDevice[] = [
  {
    name: 'Dolce far niente',
    type: 'cultural',
    description: 'Italian concept - "the sweetness of doing nothing" - leisurely appreciation of life',
    examples: [
      'La dolce vita (The sweet life)',
      'Il dolce far niente (The sweetness of doing nothing)',
      'Vivere senza fretta (Living without hurry)',
    ],
    usage: 'Essential Italian cultural concept for lifestyle and love songs',
  },

  {
    name: 'Italian Food/Wine Metaphors',
    type: 'metaphor',
    description: 'Italian culture uses food and wine extensively in romantic metaphors',
    examples: [
      'Amore dolce come il vino (Love sweet as wine)',
      'Il tuo bacio è come miele (Your kiss is like honey)',
      'Cuore caldo come il caffè (Heart warm as coffee)',
    ],
    usage: 'Authentic Italian romantic imagery',
  },

  {
    name: 'Italian Nature Imagery',
    type: 'metaphor',
    description: 'Italian landscape and nature in poetry',
    examples: [
      'Luna (Moon) = Romance, beauty',
      'Mare (Sea) = Vastness, freedom, Naples',
      'Sole (Sun) = Life, warmth, Italy',
      'Rosa (Rose) = Love, beauty',
      'Stelle (Stars) = Dreams, hope',
    ],
    usage: 'Essential for Italian romantic and folk songs',
  },

  {
    name: 'Neapolitan Expressions',
    type: 'cultural',
    description: 'Uniquely Neapolitan phrases and cultural concepts',
    examples: [
      'O sole mio (My sun/sunshine)',
      'Napule (Naples in dialect)',
      'Mare, mare (Sea imagery - central to Naples)',
      'Tarantella rhythms',
    ],
    usage: 'Authentic Canzone Napoletana and Neapolitan folk',
  },

  {
    name: 'Italian Rhyme Schemes',
    type: 'rhyme',
    description: 'Rich rhyming in Italian - language built for song',
    examples: [
      '-are/-ore endings: Amare/Cantare, Cuore/Amore',
      '-ino/-ina endings: Bambino/Destino, Regina/Colina',
      '-ella/-ello: Stella/Bella, Bello/Quello',
    ],
    usage: 'Italian is naturally musical and rhyme-rich',
  },

  {
    name: 'Italian Diminutives',
    type: 'cultural',
    description: 'Italian uses diminutives for affection (-ino/-ina, -etto/-etta)',
    examples: [
      'Amorino (Little love)',
      'Cuoricino (Little heart)',
      'Stellina (Little star)',
      'Bambolina (Little doll)',
    ],
    usage: 'Adds tenderness and affection to Italian lyrics',
  },

  {
    name: 'Alliteration (Italian)',
    type: 'structure',
    description: 'Italian loves consonant repetition for musicality',
    examples: [
      'Luna lucente e luminosa',
      'Dolce danza del destino',
      'Bella bambina del mio cuore',
    ],
    usage: 'Creates musical quality in Italian lyrics',
  },

  {
    name: 'Opera Dramatics',
    type: 'structure',
    description: 'Theatrical, dramatic expressions from opera tradition',
    examples: [
      'Ah! (Dramatic exclamation)',
      'O mio babbino caro (O my dear father)',
      'Nessun dorma (None shall sleep)',
      'Dramatic repetition for emphasis',
    ],
    usage: 'Essential for operatic and dramatic Italian songs',
  },

  {
    name: 'Hendiadys',
    type: 'structure',
    description: 'Italian poetic device - expressing one idea with two words',
    examples: [
      'Dolce e amaro (Sweet and bitter) = bittersweet',
      'Giorno e notte (Day and night) = always',
      'Fuoco e fiamma (Fire and flame) = passionate',
    ],
    usage: 'Common in Italian poetry and opera',
  },
];

// ==================== SINGING STYLES ====================

const italianSingingStyles: SingingStyle[] = [
  {
    id: 'bel-canto-opera',
    name: 'Bel Canto Opera',
    characteristics: ['Operatic', 'Classical technique', 'Beautiful tone', 'Dramatic', 'Virtuosic'],
    vocalTechniques: ['Bel canto technique', 'Vibrato', 'Legato phrasing', 'Perfect Italian diction', 'Dramatic expression'],
    emotionalDelivery: 'Dramatic, operatic, beautiful tone, theatrical emotion',
    culturalContext: 'Italian opera tradition',
    referenceArtists: ['Luciano Pavarotti', 'Maria Callas', 'Andrea Bocelli', 'Cecilia Bartoli'],
    sunoStyleHints: [
      'bel canto opera',
      'Italian operatic vocals',
      'dramatic delivery',
      'classical Italian singing',
      'theatrical style',
    ],
  },

  {
    id: 'napoletana-romantic',
    name: 'Canzone Napoletana (Romantic)',
    characteristics: ['Passionate', 'Romantic', 'Neapolitan', 'Soulful', 'Traditional'],
    vocalTechniques: ['Passionate delivery', 'Neapolitan dialect', 'Traditional Italian singing', 'Emotional expression'],
    emotionalDelivery: 'Passionate, romantic, soulful, traditional Italian emotion',
    culturalContext: 'Neapolitan song tradition',
    referenceArtists: ['Enrico Caruso', 'Roberto Murolo', 'Massimo Ranieri', 'Traditional Neapolitan singers'],
    sunoStyleHints: [
      'canzone napoletana style',
      'passionate Italian vocals',
      'Neapolitan singing',
      'romantic delivery',
      'traditional style',
    ],
  },

  {
    id: 'italian-pop-male',
    name: 'Italian Pop Male',
    characteristics: ['Melodic', 'Romantic', 'Clear', 'Emotional', 'Accessible'],
    vocalTechniques: ['Clear Italian pronunciation', 'Melodic phrasing', 'Pop vocal techniques', 'Emotional delivery'],
    emotionalDelivery: 'Romantic, melodic, accessible, emotional but controlled',
    culturalContext: 'Italian pop music tradition',
    referenceArtists: ['Eros Ramazzotti', 'Tiziano Ferro', 'Zucchero', 'Vasco Rossi'],
    sunoStyleHints: [
      'Italian pop male vocals',
      'melodic Italian singing',
      'romantic delivery',
      'clear pronunciation',
      'modern style',
    ],
  },

  {
    id: 'italian-pop-female',
    name: 'Italian Pop Female',
    characteristics: ['Sweet', 'Expressive', 'Melodic', 'Emotional', 'Beautiful'],
    vocalTechniques: ['Sweet tone', 'Clear Italian diction', 'Emotional expression', 'Melodic phrasing'],
    emotionalDelivery: 'Sweet, expressive, romantic, melodic beauty',
    culturalContext: 'Italian female pop tradition',
    referenceArtists: ['Laura Pausini', 'Giorgia', 'Elisa', 'Mina'],
    sunoStyleHints: [
      'Italian pop female vocals',
      'sweet Italian singing',
      'melodic delivery',
      'expressive style',
      'romantic tone',
    ],
  },

  {
    id: 'trap-italiano-style',
    name: 'Trap Italiano',
    characteristics: ['Urban', 'Modern', 'Trap delivery', 'Italian slang', 'Autotuned'],
    vocalTechniques: ['Trap vocal style', 'Urban Italian', 'Autotuned vocals', 'Rhythmic delivery'],
    emotionalDelivery: 'Urban, modern, street attitude, trap style',
    culturalContext: 'Contemporary Italian urban music',
    referenceArtists: ['Sfera Ebbasta', 'Ghali', 'Capo Plaza', 'Tha Supreme'],
    sunoStyleHints: [
      'Italian trap vocals',
      'urban Italian delivery',
      'autotuned style',
      'trap italiano',
      'modern street style',
    ],
  },

  {
    id: 'cantautore-style',
    name: 'Cantautore (Singer-Songwriter)',
    characteristics: ['Poetic', 'Intellectual', 'Storytelling', 'Literary', 'Emotional depth'],
    vocalTechniques: ['Poetic delivery', 'Clear diction', 'Storytelling techniques', 'Literary Italian'],
    emotionalDelivery: 'Poetic, intellectual, emotional depth, storytelling',
    culturalContext: 'Italian singer-songwriter tradition',
    referenceArtists: ['Fabrizio De André', 'Francesco Guccini', 'Lucio Battisti', 'Lucio Dalla'],
    sunoStyleHints: [
      'cantautore style',
      'poetic Italian vocals',
      'storytelling delivery',
      'intellectual singing',
      'emotional depth',
    ],
  },
];

// ==================== MUSICAL SCALES ====================

const italianMusicalScales: MusicalScale[] = [
  {
    id: 'italian-major',
    name: 'Major Scale (Italian)',
    type: 'major',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    mood: 'Bright, joyful, Italian sun',
    culturalContext: 'Used extensively in Italian opera and popular music',
    emotionalEffect: 'Bright, joyful, optimistic',
    usage: 'Italian opera arias, Canzone Napoletana, Italian pop',
  },

  {
    id: 'italian-minor',
    name: 'Natural Minor (Italian)',
    type: 'minor',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    mood: 'Melancholic, emotional, Italian soul',
    culturalContext: 'Used in melancholic Italian songs',
    emotionalEffect: 'Melancholic, emotional, soulful',
    usage: 'Melancholic Canzone Napoletana, emotional Italian ballads',
  },

  {
    id: 'harmonic-minor-italian',
    name: 'Harmonic Minor (Italian usage)',
    type: 'minor',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G#'],
    mood: 'Dramatic, operatic, passionate',
    culturalContext: 'Opera and dramatic Italian music',
    emotionalEffect: 'Dramatic, passionate, theatrical',
    usage: 'Opera, dramatic Italian songs, theatrical pieces',
  },

  {
    id: 'pentatonic-italian',
    name: 'Pentatonic (Italian folk)',
    type: 'pentatonic',
    notes: ['C', 'D', 'E', 'G', 'A'],
    mood: 'Folk, traditional, simple beauty',
    culturalContext: 'Italian regional folk music',
    emotionalEffect: 'Simple, folk beauty, traditional',
    usage: 'Italian folk songs, traditional melodies',
  },

  {
    id: 'italian-chromatic',
    name: 'Chromatic (Opera)',
    type: 'modal',
    notes: ['All 12 semitones'],
    mood: 'Dramatic, operatic, virtuosic',
    culturalContext: 'Italian opera for dramatic effect',
    emotionalEffect: 'Tension, drama, virtuosic display',
    usage: 'Opera arias, dramatic passages, virtuosic singing',
  },
];

// ==================== LYRIC EXAMPLES ====================

const italianLyricExamples: LyricExample[] = [
  // AUTHENTIC OPERA
  {
    type: 'authentic',
    text: 'O mio babbino caro / Mi piace, è bello, bello / Vo\'andare in Porta Rossa / A comperar l\'anello',
    explanation: 'Classic opera (Puccini). Dramatic, beautiful Italian. "O mio babbino caro" (O my dear father). Natural flow.',
    context: 'Opera Aria (Gianni Schicchi)',
  },

  // AUTHENTIC CANZONE NAPOLETANA
  {
    type: 'authentic',
    text: 'O sole mio / Sta \'nfronte a te / O sole, o sole mio / Sta \'nfronte a te, sta \'nfronte a te',
    explanation: 'Classic Canzone Napoletana. Neapolitan dialect. "O sole mio" (My sunshine). Iconic Italian song.',
    context: 'Canzone Napoletana classic',
  },

  {
    type: 'authentic',
    text: 'Torna a Surriento / Famme campà / Vide \'o mare quant\'è bello / Spira tantu sentimento',
    explanation: 'Neapolitan dialect. "Return to Sorrento". Sea imagery (Naples). Natural Neapolitan language.',
    context: 'Traditional Canzone Napoletana',
  },

  // AUTHENTIC ITALIAN POP
  {
    type: 'authentic',
    text: 'Ti amo / E non ti lascio mai più sola / Nel cuore e nella mente / Sei la mia stella più brillante',
    explanation: 'Modern Italian pop. Natural Italian. "Ti amo" (I love you). Heart and mind. Star imagery.',
    context: 'Contemporary Italian Pop',
  },

  {
    type: 'authentic',
    text: 'Una lunga storia d\'amore / Che non finirà mai / Come il mare che va / E poi ritorna',
    explanation: 'Italian pop ballad. Natural Italian phrasing. Sea metaphor (returns). Long love story theme.',
    context: 'Italian Pop Ballad',
  },

  // AUTHENTIC TRAP ITALIANO
  {
    type: 'authentic',
    text: 'Sulla strada con i miei fra / Milano città che non dorme mai / Trap italiano, nuovo stile / Siamo qui per restare',
    explanation: 'Modern Italian trap. Urban slang ("fra" = fratello/brother). Milan reference. Street authenticity.',
    context: 'Trap Italiano',
  },

  // AUTHENTIC CANTAUTORE
  {
    type: 'authentic',
    text: 'Sono solo un cantastorie / Che racconta la sua vita / Parole semplici e sincere / Come l\'acqua che scorre via',
    explanation: 'Cantautore style. Poetic, philosophical. "I\'m just a storyteller". Water metaphor. Sincere words.',
    context: 'Italian Singer-Songwriter',
  },

  // BAD EXAMPLES (AVOID)
  {
    type: 'avoid',
    text: 'Baby baby ooh / Tu sei il mio raggio di sole / Ti amo così tanto tanto / Il mio cuore è in fiamme',
    explanation: 'Direct English translation. "Baby baby ooh". "Heart on fire" unnatural. Sounds like translated pop.',
    context: 'AVOID - Translated English clichés',
  },

  {
    type: 'avoid',
    text: 'Metti le mani in alto / DJ alza la musica / Balliamo tutta la notte / Party fino all\'alba',
    explanation: 'Generic club clichés. "Hands up", "DJ turn it up". No Italian cultural depth or authenticity.',
    context: 'AVOID - Generic party lyrics',
  },

  // REFERENCE (CLASSIC STYLES)
  {
    type: 'reference',
    text: 'Nessun dorma / Nessun dorma / Tu pure, o Principessa / Nella tua fredda stanza',
    explanation: 'Puccini opera (Turandot). Iconic opera aria. "None shall sleep". Dramatic Italian opera style.',
    context: 'Opera reference (Puccini)',
  },

  {
    type: 'reference',
    text: 'Cose della vita / A volte ritornano / Ma si sa la vita / È fatta anche di momenti così',
    explanation: 'Eros Ramazzotti style. Natural Italian. "Things of life". Philosophical but accessible. Italian pop.',
    context: 'Italian Pop reference (Eros Ramazzotti)',
  },
];

// ==================== ITALIAN LANGUAGE CONFIG ====================

export const italianConfig: LanguageConfig = {
  id: 'italian',
  name: 'Italian',
  nativeName: 'Italiano',
  tier: 'tier2',
  
  scripts: ['Latin (Italiano)'],
  
  dialects: [
    'Standard Italian (Italiano standard)',
    'Neapolitan (Napoletano)',
    'Sicilian (Siciliano)',
    'Roman (Romano)',
    'Milanese (Milanese)',
  ],
  
  musicalTraditions: italianMusicalTraditions,
  poeticDevices: italianPoeticDevices,
  singingStyles: italianSingingStyles,
  musicalScales: italianMusicalScales,
  
  commonInstruments: [
    'Mandolin (Mandolino)',
    'Classical Guitar (Chitarra classica)',
    'Accordion (Fisarmonica)',
    'Piano (Pianoforte)',
    'Violin (Violino)',
    'Orchestra',
    'Tamburello',
    'Synthesizers',
  ],
  
  culturalThemes: [
    'Amore (Love)',
    'La dolce vita (The sweet life)',
    'Dolce far niente (Sweetness of doing nothing)',
    'Luna (Moon)',
    'Mare (Sea - especially Naples)',
    'Sole (Sun)',
    'Cuore (Heart)',
    'Famiglia (Family)',
    'Italia (Italian identity)',
    'Passione (Passion)',
  ],
  
  lyricExamples: italianLyricExamples,
  
  enabled: true,
};

// ==================== ITALIAN SONG STRUCTURES ====================

export const italianSongStructures = {
  opera: {
    aria: ['recitative', 'cavatina', 'cabaletta'],
    duet: ['intro', 'verse1', 'verse2', 'resolution'],
  },
  
  napoletana: {
    classic: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'verse3', 'chorus'],
    romantic: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'outro'],
  },
  
  pop: {
    romantic: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus', 'outro'],
    modern: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'pre-chorus', 'chorus', 'bridge', 'chorus'],
  },
  
  trap: {
    standard: ['intro', 'verse1', 'hook', 'verse2', 'hook', 'outro'],
  },
  
  cantautore: {
    storytelling: ['intro', 'verse1', 'verse2', 'chorus', 'verse3', 'chorus', 'outro'],
  },
};

// ==================== CULTURAL NOTES ====================

export const italianCulturalNotes = {
  opera: 'Opera is THE Italian art form. Bel canto technique is essential. Perfect Italian diction required.',
  napoletana: 'Canzone Napoletana is Italian soul. Neapolitan dialect essential. Sea and Naples imagery central.',
  dolceVita: 'La dolce vita (the sweet life) is fundamental Italian concept - leisure, beauty, pleasure.',
  food: 'Italian culture uses food/wine metaphors extensively in romantic songs.',
  
  language: {
    musicality: 'Italian is naturally musical - perfect for singing. Every word ends in a vowel.',
    pronunciation: 'Clear Italian pronunciation essential. No silent letters. Musical language.',
    diminutives: 'Italian loves diminutives (-ino/-ina) for affection and tenderness.',
  },
  
  avoidances: [
    'Don\'t translate English idioms - they sound unnatural in Italian',
    'Avoid generic lyrics without Italian cultural depth',
    'Don\'t ignore regional variations (Neapolitan, Sicilian, etc.)',
    'Maintain clear Italian pronunciation - it\'s a musical language',
    'For opera, bel canto technique is non-negotiable',
  ],
};

// ==================== EXPORT ====================

export default italianConfig;
