/**
 * HOLLY - Brazilian Portuguese Language Configuration (TIER 2)
 * Bossa Nova, Samba, MPB (Música Popular Brasileira) Integration
 * 
 * Complete cultural and musical context for authentic Brazilian Portuguese songwriting
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

const brazilianPortugueseMusicalTraditions: MusicalTradition[] = [
  // Bossa Nova
  {
    id: 'bossa-nova-classic',
    name: 'Bossa Nova (Classic)',
    category: 'folk',
    description: 'Classic Brazilian bossa nova - sophisticated, jazzy, coastal',
    characteristics: [
      'Sophisticated harmony',
      'Jazz influence',
      'Gentle syncopation',
      'Coastal/beach atmosphere',
      'Soft, intimate vocals',
      'Poetic Portuguese lyrics',
    ],
    typicalInstruments: ['Classical Guitar (Violão)', 'Piano', 'Soft percussion', 'Upright Bass', 'Flute'],
    vocaStyleGuidance: 'Soft, intimate, sophisticated, Brazilian Portuguese pronunciation, gentle delivery, jazzy phrasing',
  },

  {
    id: 'bossa-nova-modern',
    name: 'Bossa Nova (Modern)',
    category: 'modern',
    description: 'Contemporary bossa nova with modern production',
    characteristics: [
      'Bossa nova roots',
      'Modern production',
      'Electronic elements',
      'Contemporary themes',
      'International appeal',
      'Urban Brazilian style',
    ],
    typicalInstruments: ['Classical Guitar', 'Electronic beats', 'Synth', 'Bass', 'Modern production'],
    vocaStyleGuidance: 'Modern bossa style, soft Brazilian vocals, contemporary delivery, sophisticated',
  },

  // Samba
  {
    id: 'samba-carnaval',
    name: 'Samba (Carnaval)',
    category: 'folk',
    description: 'Energetic carnival samba - celebration and dance',
    characteristics: [
      'Fast, energetic rhythm',
      'Carnival atmosphere',
      'Party/celebration',
      'Percussion-heavy',
      'Call-and-response',
      'Rio de Janeiro culture',
    ],
    typicalInstruments: ['Surdo', 'Pandeiro', 'Cuíca', 'Tamborim', 'Agogô', 'Cavaquinho'],
    vocaStyleGuidance: 'Energetic, festive, celebratory, clear Brazilian pronunciation, party delivery, Rio accent',
  },

  {
    id: 'samba-canção',
    name: 'Samba-Canção',
    category: 'folk',
    description: 'Slow, romantic samba - melancholic and lyrical',
    characteristics: [
      'Slow tempo',
      'Romantic, melancholic',
      'Lyrical focus',
      'Emotional depth',
      'Golden age Brazilian music',
      'Sophisticated arrangements',
    ],
    typicalInstruments: ['Classical Guitar', 'Piano', 'Strings', 'Soft percussion'],
    vocaStyleGuidance: 'Romantic, melancholic, emotional, classic Brazilian style, sophisticated delivery',
  },

  {
    id: 'pagode',
    name: 'Pagode',
    category: 'folk',
    description: 'Pagode samba - party samba with modern elements',
    characteristics: [
      'Party atmosphere',
      'Modern samba style',
      'Romantic themes',
      'Accessible melodies',
      'Popular Brazilian style',
      'Banjo (Cavaquinho) prominent',
    ],
    typicalInstruments: ['Cavaquinho', 'Pandeiro', 'Tantan', 'Banjo', 'Surdo'],
    vocaStyleGuidance: 'Party delivery, accessible Brazilian vocals, romantic but upbeat, popular style',
  },

  // MPB (Música Popular Brasileira)
  {
    id: 'mpb-classic',
    name: 'MPB (Classic)',
    category: 'modern',
    description: 'Classic MPB - sophisticated Brazilian popular music',
    characteristics: [
      'Sophisticated lyrics',
      'Musical sophistication',
      'Poetic Portuguese',
      'Brazilian identity',
      'Social commentary',
      'Art and pop fusion',
    ],
    typicalInstruments: ['Various - Classical Guitar', 'Piano', 'Bass', 'Drums', 'Strings'],
    vocaStyleGuidance: 'Sophisticated, poetic, emotional depth, Brazilian identity, artistic delivery',
  },

  {
    id: 'mpb-modern',
    name: 'MPB (Modern)',
    category: 'modern',
    description: 'Contemporary MPB with international influences',
    characteristics: [
      'Modern production',
      'International influences',
      'Brazilian roots',
      'Urban themes',
      'Contemporary arrangements',
      'Diverse styles',
    ],
    typicalInstruments: ['Modern production', 'Electronic elements', 'Traditional instruments', 'Synthesizers'],
    vocaStyleGuidance: 'Modern Brazilian vocals, sophisticated, contemporary delivery, urban style',
  },

  // Forró
  {
    id: 'forro',
    name: 'Forró',
    category: 'folk',
    description: 'Northeastern Brazilian dance music - accordion-driven',
    characteristics: [
      'Accordion-driven',
      'Dance rhythm',
      'Northeastern Brazil',
      'Rural themes',
      'Festive atmosphere',
      'Regional identity',
    ],
    typicalInstruments: ['Accordion (Sanfona)', 'Triangle (Triângulo)', 'Zabumba', 'Bass'],
    vocaStyleGuidance: 'Northeastern Brazilian accent, festive delivery, dance-oriented, rural authenticity',
  },

  // Tropicália
  {
    id: 'tropicalia',
    name: 'Tropicália',
    category: 'modern',
    description: 'Experimental Brazilian movement - psychedelic + Brazilian roots',
    characteristics: [
      'Experimental',
      'Psychedelic influence',
      'Brazilian roots fusion',
      'Cultural revolution',
      'Electric guitars + traditional',
      'Artistic freedom',
    ],
    typicalInstruments: ['Electric Guitar', 'Classical Guitar', 'Percussion', 'Electronic elements', 'Traditional instruments'],
    vocaStyleGuidance: 'Experimental, artistic, Brazilian roots, psychedelic influence, revolutionary spirit',
  },

  // Brazilian Funk
  {
    id: 'funk-carioca',
    name: 'Funk Carioca (Baile Funk)',
    category: 'modern',
    description: 'Rio favela funk - electronic beats, party atmosphere',
    characteristics: [
      'Heavy electronic beats',
      'Favela culture',
      'Party/dance',
      'Rio de Janeiro',
      'Urban themes',
      'High energy',
    ],
    typicalInstruments: ['Electronic beats', '808 bass', 'Drum machines', 'Synth'],
    vocaStyleGuidance: 'High energy, Rio slang, favela authenticity, party delivery, urban Brazilian',
  },
];

// ==================== POETIC DEVICES ====================

const brazilianPortuguesePoeticDevices: PoeticDevice[] = [
  {
    name: 'Saudade',
    type: 'cultural',
    description: 'Untranslatable Brazilian/Portuguese concept - deep nostalgia, longing, melancholy',
    examples: [
      'Tenho saudade de você (I feel saudade for you)',
      'Saudade da minha terra (Longing for my homeland)',
      'Saudade do que nunca foi (Nostalgia for what never was)',
    ],
    usage: 'ESSENTIAL Brazilian emotional concept - must appear in authentic Brazilian music',
  },

  {
    name: 'Ginga',
    type: 'cultural',
    description: 'Brazilian concept - swing, swaying, natural rhythm of body and soul',
    examples: [
      'Tem ginga (Has swing/rhythm)',
      'Corpo com ginga (Body with natural rhythm)',
      'Dançar com ginga (Dance with natural swing)',
    ],
    usage: 'Essential Brazilian cultural concept - natural rhythm and flow',
  },

  {
    name: 'Brazilian Nature Imagery',
    type: 'metaphor',
    description: 'Brazilian landscape and nature in poetry',
    examples: [
      'Mar (Sea) = Freedom, Brazil, saudade',
      'Praia (Beach) = Bossa nova, carioca lifestyle',
      'Sol (Sun) = Life, warmth, joy',
      'Lua (Moon) = Romance, saudade',
      'Sertão (Backlands) = Northeastern identity, struggle',
    ],
    usage: 'Essential for authentic Brazilian lyrics',
  },

  {
    name: 'Carioca Expressions',
    type: 'cultural',
    description: 'Rio de Janeiro (Carioca) cultural expressions',
    examples: [
      'Garota de Ipanema (Girl from Ipanema)',
      'Vida de carioca (Carioca life)',
      'Bossa na praia (Bossa on the beach)',
      'Zona Sul (South Zone - affluent Rio)',
    ],
    usage: 'Authentic Rio de Janeiro/bossa nova lyrics',
  },

  {
    name: 'Brazilian Portuguese Rhyme',
    type: 'rhyme',
    description: 'Rich rhyming in Brazilian Portuguese',
    examples: [
      '-ão endings: Coração/Canção/Paixão',
      '-ar/-or: Amar/Chorar, Amor/Dor',
      '-ade: Saudade/Verdade/Cidade',
    ],
    usage: 'Brazilian Portuguese is naturally musical and rhyme-rich',
  },

  {
    name: 'Brazilian Diminutives',
    type: 'cultural',
    description: 'Brazilian Portuguese uses diminutives extensively (-inho/-inha)',
    examples: [
      'Amorzinho (Little love)',
      'Coraçãozinho (Little heart)',
      'Sozinho (All alone)',
      'Devagarinho (Very slowly)',
    ],
    usage: 'Adds affection and Brazilian flavor to lyrics',
  },

  {
    name: 'Samba Language',
    type: 'cultural',
    description: 'Samba-specific expressions and vocabulary',
    examples: [
      'Batucada (Drum ensemble)',
      'Malandragem (Streetwise charm)',
      'Batucar (To drum/play samba)',
      'Sambista (Samba musician/dancer)',
    ],
    usage: 'Essential for authentic samba lyrics',
  },

  {
    name: 'Bossa Nova Sophistication',
    type: 'structure',
    description: 'Sophisticated, poetic language of bossa nova',
    examples: [
      'Philosophical themes',
      'Sophisticated vocabulary',
      'Jazz-influenced phrasing',
      'Understated emotion',
    ],
    usage: 'Bossa nova requires sophisticated, poetic Portuguese',
  },

  {
    name: 'Northeastern Imagery',
    type: 'metaphor',
    description: 'Northeastern Brazil (Nordeste) cultural imagery',
    examples: [
      'Sertão (Backlands) = Struggle, identity',
      'Cangaceiro (Outlaw) = Freedom, rebellion',
      'Seca (Drought) = Hardship',
      'Forró na roça (Forró in the countryside)',
    ],
    usage: 'Essential for forró and northeastern Brazilian music',
  },
];

// ==================== SINGING STYLES ====================

const brazilianPortugueseSingingStyles: SingingStyle[] = [
  {
    id: 'bossa-nova-classic-style',
    name: 'Bossa Nova (Classic)',
    characteristics: ['Soft', 'Intimate', 'Jazzy', 'Sophisticated', 'Understated'],
    vocalTechniques: ['Soft delivery', 'Jazz phrasing', 'Brazilian Portuguese pronunciation', 'Intimate tone', 'Subtle emotion'],
    emotionalDelivery: 'Soft, intimate, sophisticated, understated emotion, cool delivery',
    culturalContext: 'Brazilian bossa nova tradition',
    referenceArtists: ['João Gilberto', 'Astrud Gilberto', 'Tom Jobim', 'Nara Leão'],
    sunoStyleHints: [
      'bossa nova vocals',
      'soft Brazilian singing',
      'intimate delivery',
      'jazzy Portuguese',
      'sophisticated style',
    ],
  },

  {
    id: 'samba-festive',
    name: 'Samba (Festive)',
    characteristics: ['Energetic', 'Celebratory', 'Rhythmic', 'Party atmosphere', 'Clear'],
    vocalTechniques: ['Energetic delivery', 'Rhythmic precision', 'Clear Brazilian Portuguese', 'Festive tone'],
    emotionalDelivery: 'Energetic, celebratory, festive, party atmosphere, joyful',
    culturalContext: 'Brazilian carnival and samba tradition',
    referenceArtists: ['Alcione', 'Zeca Pagodinho', 'Martinho da Vila', 'Beth Carvalho'],
    sunoStyleHints: [
      'samba vocals',
      'festive Brazilian singing',
      'carnival style',
      'energetic delivery',
      'party atmosphere',
    ],
  },

  {
    id: 'mpb-sophisticated',
    name: 'MPB (Sophisticated)',
    characteristics: ['Sophisticated', 'Poetic', 'Emotional depth', 'Brazilian identity', 'Artistic'],
    vocalTechniques: ['Sophisticated delivery', 'Poetic phrasing', 'Emotional expression', 'Brazilian cultural depth'],
    emotionalDelivery: 'Sophisticated, poetic, emotional depth, Brazilian soul, artistic',
    culturalContext: 'MPB (Música Popular Brasileira)',
    referenceArtists: ['Elis Regina', 'Caetano Veloso', 'Gal Costa', 'Milton Nascimento'],
    sunoStyleHints: [
      'MPB vocals',
      'sophisticated Brazilian singing',
      'poetic delivery',
      'emotional depth',
      'artistic style',
    ],
  },

  {
    id: 'samba-cancao-romantic',
    name: 'Samba-Canção (Romantic)',
    characteristics: ['Romantic', 'Melancholic', 'Lyrical', 'Emotional', 'Classic'],
    vocalTechniques: ['Romantic delivery', 'Emotional expression', 'Lyrical phrasing', 'Classic Brazilian style'],
    emotionalDelivery: 'Romantic, melancholic, emotional, classic Brazilian soul',
    culturalContext: 'Golden age Brazilian music',
    referenceArtists: ['Elizeth Cardoso', 'Dolores Duran', 'Dick Farney'],
    sunoStyleHints: [
      'samba-canção vocals',
      'romantic Brazilian singing',
      'melancholic delivery',
      'classic style',
      'emotional depth',
    ],
  },

  {
    id: 'forro-northeastern',
    name: 'Forró (Northeastern)',
    characteristics: ['Energetic', 'Northeastern accent', 'Festive', 'Dance-oriented', 'Rural'],
    vocalTechniques: ['Northeastern Brazilian accent', 'Energetic delivery', 'Folk style', 'Dance rhythm'],
    emotionalDelivery: 'Energetic, festive, northeastern authenticity, party delivery',
    culturalContext: 'Northeastern Brazil (Nordeste)',
    referenceArtists: ['Luiz Gonzaga', 'Dominguinhos', 'Elba Ramalho'],
    sunoStyleHints: [
      'forró vocals',
      'northeastern Brazilian accent',
      'festive delivery',
      'accordion-driven style',
      'rural authenticity',
    ],
  },

  {
    id: 'funk-carioca-style',
    name: 'Funk Carioca',
    characteristics: ['High energy', 'Rio slang', 'Urban', 'Party', 'Favela culture'],
    vocalTechniques: ['High energy delivery', 'Rio slang', 'Urban Brazilian style', 'Party vocals'],
    emotionalDelivery: 'High energy, party atmosphere, favela authenticity, urban Brazilian',
    culturalContext: 'Rio de Janeiro favela culture',
    referenceArtists: ['MC Kevinho', 'Anitta', 'Ludmilla'],
    sunoStyleHints: [
      'funk carioca vocals',
      'Rio party style',
      'high energy delivery',
      'favela authenticity',
      'urban Brazilian',
    ],
  },
];

// ==================== MUSICAL SCALES ====================

const brazilianPortugueseMusicalScales: MusicalScale[] = [
  {
    id: 'bossa-nova-harmony',
    name: 'Bossa Nova Harmony (Jazz-influenced)',
    type: 'harmonic system',
    notes: ['Complex jazz chords', 'Extended harmonies'],
    mood: 'Sophisticated, jazzy, coastal',
    culturalContext: 'Bossa nova\'s signature sophisticated harmony',
    emotionalEffect: 'Sophisticated, jazzy, romantic, coastal atmosphere',
    usage: 'Essential for bossa nova - jazz-influenced harmonies',
  },

  {
    id: 'major-brazilian',
    name: 'Major Scale (Brazilian)',
    type: 'scale',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    mood: 'Bright, joyful, Brazilian sun',
    culturalContext: 'Used in samba, bossa nova, MPB',
    emotionalEffect: 'Bright, joyful, optimistic, Brazilian warmth',
    usage: 'Samba, upbeat bossa nova, festive Brazilian music',
  },

  {
    id: 'minor-brazilian',
    name: 'Natural Minor (Brazilian)',
    type: 'scale',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    mood: 'Melancholic, saudade',
    culturalContext: 'Used for melancholic Brazilian songs',
    emotionalEffect: 'Saudade, melancholy, nostalgic',
    usage: 'Samba-canção, melancholic bossa nova, saudade songs',
  },

  {
    id: 'northeastern-modes',
    name: 'Northeastern Brazilian Modes',
    type: 'mode',
    notes: ['Modal scales from Northeastern Brazil'],
    mood: 'Regional, folk, northeastern identity',
    culturalContext: 'Northeastern Brazil (forró, baião)',
    emotionalEffect: 'Regional identity, folk authenticity, northeastern character',
    usage: 'Forró, baião, northeastern Brazilian music',
  },

  {
    id: 'mixolydian-brazilian',
    name: 'Mixolydian (Brazilian usage)',
    type: 'mode',
    notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F'],
    mood: 'Bright, folk, Brazilian character',
    culturalContext: 'Common in Brazilian folk and popular music',
    emotionalEffect: 'Bright, folk character, Brazilian flavor',
    usage: 'Brazilian folk, samba, forró',
  },
];

// ==================== LYRIC EXAMPLES ====================

const brazilianPortugueseLyricExamples: LyricExample[] = [
  // AUTHENTIC BOSSA NOVA
  {
    type: 'authentic',
    text: 'Olha que coisa mais linda / Mais cheia de graça / É ela, menina / Que vem e que passa',
    explanation: 'Classic bossa nova (Garota de Ipanema). Sophisticated Portuguese. Poetic. Natural Brazilian phrasing.',
    context: 'Bossa Nova classic (Tom Jobim)',
  },

  {
    type: 'authentic',
    text: 'Eu sei que você sabe / Que a vida é mais que isso / Tenho medo do esquecimento / E eu quero o seu sorriso',
    explanation: 'Modern bossa nova. Philosophical themes. Natural Brazilian Portuguese. Sophisticated vocabulary.',
    context: 'Contemporary Bossa Nova',
  },

  // AUTHENTIC SAMBA
  {
    type: 'authentic',
    text: 'Deixa a vida me levar / Vida leva eu / Deixa a vida me levar / Sou assim feliz também',
    explanation: 'Classic samba/pagode (Zeca Pagodinho). Natural Brazilian Portuguese. "Let life take me". Carefree spirit.',
    context: 'Samba/Pagode classic',
  },

  {
    type: 'authentic',
    text: 'Se você jurou / Que me amava pra sempre / Onde é que está o amor / Que não vejo em você',
    explanation: 'Samba-canção. Romantic, melancholic. Natural Brazilian phrasing. Classic samba structure.',
    context: 'Samba-Canção',
  },

  // AUTHENTIC MPB
  {
    type: 'authentic',
    text: 'É tanta saudade que eu sinto / Que não sei nem como começar / A falar de tudo que sinto / Quando você não está',
    explanation: 'MPB style. "Saudade" (essential Brazilian concept). Natural Portuguese. Emotional depth. Poetic.',
    context: 'MPB (Música Popular Brasileira)',
  },

  {
    type: 'authentic',
    text: 'Alegria, alegria / Caminhando contra o vento / Sem lenço e sem documento / No sol de quase dezembro',
    explanation: 'Tropicália (Caetano Veloso). Poetic imagery. Cultural revolution. "Walking against the wind".',
    context: 'Tropicália/MPB reference',
  },

  // AUTHENTIC FORRÓ
  {
    type: 'authentic',
    text: 'Asa Branca, quando tu voltas / Pro meu sertão querido / Eu já voltei pro meu sertão / Pra nunca mais partir',
    explanation: 'Classic forró (Luiz Gonzaga). Northeastern vocabulary ("sertão"). Regional identity. Asa Branca (bird).',
    context: 'Forró classic (Northeastern)',
  },

  // AUTHENTIC FUNK CARIOCA
  {
    type: 'authentic',
    text: 'Vai dançando, vai mexendo / Na pista até o chão / Esse funk é do Rio / Favela é emoção',
    explanation: 'Funk carioca. Rio slang. Favela reference. Party atmosphere. Dance-oriented. Urban Brazilian.',
    context: 'Funk Carioca (Baile Funk)',
  },

  // BAD EXAMPLES (AVOID)
  {
    type: 'avoid',
    text: 'Baby baby oh / Você é meu raio de sol / Eu te amo tanto / Meu coração está queimando',
    explanation: 'Direct English translation. "Baby baby oh". "Heart burning" unnatural. Sounds translated.',
    context: 'AVOID - Translated English clichés',
  },

  {
    type: 'avoid',
    text: 'Coloque as mãos no ar / DJ aumente o som / Vamos dançar a noite toda / Festa até amanhecer',
    explanation: 'Generic club clichés. No Brazilian cultural depth. "Hands in the air", "DJ turn it up".',
    context: 'AVOID - Generic party lyrics',
  },

  // REFERENCE (CLASSIC STYLES)
  {
    type: 'reference',
    text: 'Tom Jobim:, Chega de Saudade / Vai, minha tristeza / E diz a ela que sem ela não pode ser',
    explanation: 'Bossa nova masterpiece. "Saudade" concept. Sophisticated Portuguese. Natural Brazilian phrasing.',
    context: 'Bossa Nova reference (Tom Jobim)',
  },

  {
    type: 'reference',
    text: 'O mundo é um moinho / Que faz moer a gente / E dói no coração / Ver o mundo passar',
    explanation: 'Classic MPB (Cartola). Philosophical. "World is a mill". Samba-canção style. Deep emotion.',
    context: 'MPB/Samba-Canção reference',
  },
];

// ==================== BRAZILIAN PORTUGUESE LANGUAGE CONFIG ====================

export const brazilianPortugueseConfig: LanguageConfig = {
  id: 'brazilian-portuguese',
  name: 'Brazilian Portuguese',
  nativeName: 'Português Brasileiro',
  tier: 'tier2',
  
  scripts: ['Latin (Português)'],
  
  dialects: [
    'Carioca (Rio de Janeiro)',
    'Paulista (São Paulo)',
    'Northeastern (Nordeste)',
    'Mineiro (Minas Gerais)',
    'Gaúcho (Rio Grande do Sul)',
  ],
  
  musicalTraditions: brazilianPortugueseMusicalTraditions,
  poeticDevices: brazilianPortuguesePoeticDevices,
  singingStyles: brazilianPortugueseSingingStyles,
  musicalScales: brazilianPortugueseMusicalScales,
  
  commonInstruments: [
    'Classical Guitar (Violão)',
    'Cavaquinho',
    'Pandeiro',
    'Surdo',
    'Cuíca',
    'Tamborim',
    'Piano',
    'Accordion (Sanfona)',
    'Agogô',
    'Triangle (Triângulo)',
  ],
  
  culturalThemes: [
    'Saudade (Nostalgia/longing)',
    'Ginga (Natural rhythm)',
    'Praia (Beach)',
    'Mar (Sea)',
    'Carnaval (Carnival)',
    'Favela (Community)',
    'Sertão (Backlands)',
    'Amor (Love)',
    'Vida (Life)',
    'Brasilidade (Brazilian identity)',
  ],
  
  lyricExamples: brazilianPortugueseLyricExamples,
  
  enabled: true,
};

// ==================== BRAZILIAN PORTUGUESE SONG STRUCTURES ====================

export const brazilianPortugueseSongStructures = {
  bossaNova: {
    classic: ['intro', 'verse1', 'verse2', 'bridge', 'verse1-reprise', 'outro'],
    modern: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus'],
  },
  
  samba: {
    carnaval: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'verse3', 'chorus', 'refrão'],
    cancao: ['intro', 'verse1', 'verse2', 'chorus', 'verse3', 'chorus'],
    pagode: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus'],
  },
  
  mpb: {
    classic: ['intro', 'verse1', 'verse2', 'chorus', 'verse3', 'chorus', 'outro'],
    modern: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'pre-chorus', 'chorus', 'bridge', 'chorus'],
  },
  
  forro: {
    traditional: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'instrumental', 'chorus'],
  },
  
  funkCarioca: {
    baile: ['intro', 'verse1', 'drop', 'verse2', 'drop', 'outro'],
  },
};

// ==================== CULTURAL NOTES ====================

export const brazilianPortugueseCulturalNotes = {
  saudade: 'SAUDADE is THE essential Brazilian emotional concept. Must appear in authentic Brazilian music. Untranslatable.',
  ginga: 'Ginga (natural swing/rhythm) is essential Brazilian concept - body and soul in natural rhythm.',
  bossaNova: 'Bossa nova is sophisticated, jazzy, coastal. Soft vocals, complex harmony, understated emotion.',
  samba: 'Samba is Brazilian soul. Carnival, celebration, community. Percussion-heavy. Rio de Janeiro identity.',
  mpb: 'MPB is sophisticated Brazilian popular music. Poetic, artistic, Brazilian cultural depth.',
  
  language: {
    pronunciation: 'Brazilian Portuguese is softer than European Portuguese. Nasal vowels. Musical language.',
    diminutives: 'Brazilian Portuguese LOVES diminutives (-inho/-inha) - use extensively.',
    carioca: 'Carioca (Rio) accent for bossa nova and funk carioca. Distinct from other Brazilian accents.',
  },
  
  avoidances: [
    'Never confuse Brazilian Portuguese with European Portuguese - very different',
    'Don\'t translate English idioms - they sound unnatural',
    'Don\'t ignore SAUDADE concept - it\'s essential to Brazilian music',
    'Avoid generic lyrics without Brazilian cultural depth',
    'Bossa nova requires sophisticated, understated emotion - not dramatic',
  ],
};

// ==================== EXPORT ====================

export default brazilianPortugueseConfig;
