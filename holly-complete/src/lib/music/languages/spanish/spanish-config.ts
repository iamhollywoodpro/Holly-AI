/**
 * HOLLY - Spanish Language Configuration (TIER 2)
 * Flamenco, Spanish Pop, Copla, Rumba Integration
 * 
 * Complete cultural and musical context for authentic Spanish songwriting
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

const spanishMusicalTraditions: MusicalTradition[] = [
  // Flamenco
  {
    id: 'flamenco-solea',
    name: 'Flamenco Soleá',
    category: 'folk',
    description: 'Deep, emotional flamenco style - mother of flamenco palos',
    characteristics: [
      'Slow to medium tempo',
      'Deep emotional expression (pena)',
      'Compás of 12 beats',
      'Duende (soul/spirit)',
      'Gypsy cultural roots',
      'Improvisation within structure',
    ],
    typicalInstruments: ['Spanish Guitar', 'Palmas (handclaps)', 'Cajón', 'Voice only'],
    vocaStyleGuidance: 'Raw, emotional, guttural at times, deep soul (duende), Andalusian accent, passionate delivery',
  },

  {
    id: 'flamenco-buleria',
    name: 'Flamenco Bulería',
    category: 'folk',
    description: 'Fast, festive flamenco style for celebrations',
    characteristics: [
      'Fast tempo',
      'Complex 12-beat compás',
      'Festive, celebratory',
      'Improvisation',
      'Call-and-response',
      'Dance-oriented',
    ],
    typicalInstruments: ['Spanish Guitar', 'Palmas', 'Cajón', 'Castanets'],
    vocaStyleGuidance: 'Energetic, festive, rhythmic precision, Andalusian pronunciation, celebratory delivery',
  },

  {
    id: 'flamenco-alegrias',
    name: 'Flamenco Alegrías',
    category: 'folk',
    description: 'Joyful flamenco from Cádiz, festive and bright',
    characteristics: [
      'Major key (unlike most flamenco)',
      'Joyful, festive mood',
      '12-beat compás',
      'Cádiz origins',
      'Dance-friendly',
      'Celebratory lyrics',
    ],
    typicalInstruments: ['Spanish Guitar', 'Palmas', 'Cajón'],
    vocaStyleGuidance: 'Joyful, bright, festive delivery, clear Andalusian accent, celebratory tone',
  },

  {
    id: 'flamenco-seguiriya',
    name: 'Flamenco Seguiriya',
    category: 'folk',
    description: 'Most serious and emotional flamenco form',
    characteristics: [
      'Tragic, deeply emotional',
      'Slow, solemn',
      'Complex rhythm',
      'Highest level of duende',
      'Death, loss, tragedy themes',
      'Ultimate expression of pena',
    ],
    typicalInstruments: ['Spanish Guitar', 'Voice (often solo)'],
    vocaStyleGuidance: 'Tragic, deeply emotional, raw vulnerability, maximum duende, guttural expression, slow delivery',
  },

  // Spanish Pop/Rock
  {
    id: 'spanish-pop-rock',
    name: 'Spanish Pop/Rock',
    category: 'modern',
    description: 'Contemporary Spanish pop and rock music',
    characteristics: [
      'Western pop structures',
      'Spanish lyrics',
      'Modern production',
      'Catchy melodies',
      'Urban themes',
      'International appeal',
    ],
    typicalInstruments: ['Electric Guitar', 'Bass', 'Drums', 'Keyboards', 'Synthesizers'],
    vocaStyleGuidance: 'Modern, clear Spanish pronunciation, pop delivery, youth-oriented, catchy phrasing',
  },

  {
    id: 'movida-madrilena',
    name: 'Movida Madrileña Style',
    category: 'modern',
    description: 'Madrid cultural movement (1980s) - punk, new wave influence',
    characteristics: [
      'Punk and new wave influence',
      'Counter-culture themes',
      'Raw, energetic',
      'Madrid dialect',
      'Urban, rebellious',
      'Experimental sounds',
    ],
    typicalInstruments: ['Electric Guitar', 'Bass', 'Drums', 'Synth'],
    vocaStyleGuidance: 'Raw, energetic, Madrid accent, rebellious delivery, punk attitude',
  },

  // Traditional Spanish
  {
    id: 'copla',
    name: 'Copla',
    category: 'traditional',
    description: 'Traditional Spanish song style, emotional and theatrical',
    characteristics: [
      'Theatrical delivery',
      'Emotional, dramatic',
      'Spanish identity themes',
      'Storytelling',
      'Orchestral arrangements',
      'Golden age Spanish cinema',
    ],
    typicalInstruments: ['Orchestra', 'Spanish Guitar', 'Accordion'],
    vocaStyleGuidance: 'Theatrical, dramatic, emotional intensity, clear Spanish diction, storytelling delivery',
  },

  {
    id: 'rumba-catalana',
    name: 'Rumba Catalana',
    category: 'folk',
    description: 'Catalan rumba - fusion of flamenco and Cuban rumba',
    characteristics: [
      'Upbeat, danceable',
      'Catalan-Spanish mix',
      'Flamenco + Caribbean fusion',
      'Party atmosphere',
      'Barcelona origins',
      'Gipsy Kings style',
    ],
    typicalInstruments: ['Spanish Guitar', 'Bongos', 'Cajón', 'Palmas'],
    vocaStyleGuidance: 'Upbeat, festive, Catalan accent possible, party delivery, fusion style',
  },

  {
    id: 'jota',
    name: 'Jota',
    category: 'folk',
    description: 'Traditional Spanish regional folk dance and song',
    characteristics: [
      'Regional variations (Aragonese most famous)',
      'Fast triple meter',
      'Dance accompaniment',
      'Traditional Spanish identity',
      'Castanets and guitar',
    ],
    typicalInstruments: ['Spanish Guitar', 'Bandurria', 'Castanets', 'Accordion'],
    vocaStyleGuidance: 'Traditional, energetic, regional Spanish accent, folk delivery',
  },

  // Modern Urban
  {
    id: 'spanish-trap-urban',
    name: 'Spanish Trap/Urban',
    category: 'modern',
    description: 'Contemporary Spanish trap and urban music',
    characteristics: [
      'Trap beats',
      'Urban slang',
      'Modern production',
      'Latin trap influence',
      'Autotuned vocals',
      'Street themes',
    ],
    typicalInstruments: ['808 bass', 'Hi-hats', 'Synth', 'Trap production'],
    vocaStyleGuidance: 'Urban Spanish, modern slang, trap delivery, autotuned style, street attitude',
  },
];

// ==================== POETIC DEVICES ====================

const spanishPoeticDevices: PoeticDevice[] = [
  {
    name: 'Duende',
    type: 'cultural',
    description: 'Untranslatable Spanish concept - soul, spirit, passion in performance (especially flamenco)',
    examples: [
      'Singing with duende means singing with your soul exposed',
      'Not just emotion, but visceral, raw spiritual expression',
      'The moment when art transcends technique',
    ],
    usage: 'Essential concept for authentic Spanish music, especially flamenco',
  },

  {
    name: 'Pena',
    type: 'cultural',
    description: 'Deep sorrow, pain, suffering - central to flamenco and copla',
    examples: [
      'La pena me mata (The pain kills me)',
      'Llorar de pena (Cry from sorrow)',
      'Pena profunda (Deep sorrow)',
    ],
    usage: 'Core emotional concept in flamenco and traditional Spanish music',
  },

  {
    name: 'Spanish Metaphors (Nature)',
    type: 'metaphor',
    description: 'Spanish poetry uses nature imagery extensively',
    examples: [
      'Luna (Moon) = Love, romance, longing',
      'Mar (Sea) = Freedom, vastness, passion',
      'Sol (Sun) = Life, energy, Andalusia',
      'Rosa (Rose) = Love, beauty, passion',
      'Noche (Night) = Mystery, romance, passion',
    ],
    usage: 'Essential for authentic Spanish lyrics',
  },

  {
    name: 'Andalusian Expressions',
    type: 'cultural',
    description: 'Uniquely Andalusian phrases and imagery',
    examples: [
      'Ole (Expression of approval in flamenco)',
      'Ay (Expression of pain/emotion)',
      'Compás (The rhythm, but also "being in the flow")',
      'Gitano/a (Gypsy - cultural identity in flamenco)',
    ],
    usage: 'Authentic flamenco and Andalusian music',
  },

  {
    name: 'Spanish Rhyme Schemes',
    type: 'rhyme',
    description: 'Common rhyme patterns in Spanish poetry and song',
    examples: [
      '-ar/-or endings: Amar/Llorar, Amor/Dolor',
      '-ón endings: Corazón/Pasión, Canción/Ilusión',
      '-ada/-ido: Enamorada/Olvidada, Perdido/Querido',
    ],
    usage: 'Spanish has rich rhyming possibilities, essential for song lyrics',
  },

  {
    name: 'Alliteration (Spanish)',
    type: 'structure',
    description: 'Repetition of consonant sounds in Spanish',
    examples: [
      'Pena profunda y perdida',
      'Luna llena de locura',
      'Corazón cansado de cantar',
    ],
    usage: 'Creates musicality and memorability in Spanish lyrics',
  },

  {
    name: 'Anaphora',
    type: 'structure',
    description: 'Repetition of words/phrases at beginning of lines',
    examples: [
      'Yo te quiero... Yo te necesito... Yo te llamo...',
      'Si tú supieras... Si tú vieras... Si tú sintieras...',
      'Cuando la noche... Cuando el día... Cuando el viento...',
    ],
    usage: 'Common in Spanish poetry and song, builds emotional intensity',
  },

  {
    name: 'Diminutives (Affection)',
    type: 'cultural',
    description: 'Spanish uses diminutives (-ito/-ita) for affection',
    examples: [
      'Corazoncito (Little heart)',
      'Amorcito (Little love)',
      'Solito (All alone - diminutive)',
    ],
    usage: 'Adds tenderness and intimacy to Spanish lyrics',
  },

  {
    name: 'Flamenco Calls',
    type: 'structure',
    description: 'Traditional flamenco vocal calls and expressions',
    examples: [
      'Ay, ay, ay (Pain/emotion expression)',
      'Ole, ole (Approval/encouragement)',
      'Toma que toma (Rhythmic expression)',
    ],
    usage: 'Essential for authentic flamenco songs',
  },
];

// ==================== SINGING STYLES ====================

const spanishSingingStyles: SingingStyle[] = [
  {
    id: 'flamenco-cante-jondo',
    name: 'Flamenco Cante Jondo (Deep Song)',
    characteristics: ['Raw', 'Emotional', 'Guttural', 'Powerful', 'Duende'],
    vocalTechniques: ['Guttural sounds', 'Melisma', 'Vibrato', 'Raw expression', 'Improvisational ornaments'],
    emotionalDelivery: 'Raw, soul-exposing, maximum duende, visceral emotion',
    culturalContext: 'Andalusian flamenco tradition',
    referenceArtists: ['Camarón de la Isla', 'Enrique Morente', 'Diego El Cigala', 'Carmen Linares'],
    sunoStyleHints: [
      'flamenco cante jondo',
      'deep emotional Spanish vocals',
      'guttural flamenco style',
      'duende',
      'raw Andalusian singing',
    ],
  },

  {
    id: 'flamenco-festive',
    name: 'Flamenco Festive (Bulería/Alegrías)',
    characteristics: ['Energetic', 'Rhythmic', 'Festive', 'Clear', 'Celebratory'],
    vocalTechniques: ['Rhythmic precision', 'Clear diction', 'Palmas coordination', 'Festive delivery'],
    emotionalDelivery: 'Joyful, celebratory, energetic, festive spirit',
    culturalContext: 'Andalusian celebrations and festivals',
    referenceArtists: ['Paco de Lucía (instrumental)', 'Tomatito', 'José Mercé'],
    sunoStyleHints: [
      'festive flamenco vocals',
      'bulería style',
      'celebratory Spanish singing',
      'rhythmic flamenco',
      'alegrias style',
    ],
  },

  {
    id: 'spanish-pop-male',
    name: 'Spanish Pop Male',
    characteristics: ['Clear', 'Melodic', 'Modern', 'Emotional', 'Accessible'],
    vocalTechniques: ['Clear Spanish pronunciation', 'Pop vocal techniques', 'Melodic phrasing'],
    emotionalDelivery: 'Romantic, modern, accessible, emotional but controlled',
    culturalContext: 'Contemporary Spanish pop music',
    referenceArtists: ['Alejandro Sanz', 'Pablo Alborán', 'David Bisbal', 'Malú'],
    sunoStyleHints: [
      'Spanish pop male vocals',
      'clear Spanish pronunciation',
      'romantic delivery',
      'modern Spanish style',
      'melodic singing',
    ],
  },

  {
    id: 'copla-style',
    name: 'Copla (Traditional Spanish)',
    characteristics: ['Theatrical', 'Dramatic', 'Emotional', 'Storytelling', 'Classical'],
    vocalTechniques: ['Theatrical delivery', 'Clear articulation', 'Dramatic expression', 'Storytelling'],
    emotionalDelivery: 'Highly dramatic, theatrical, emotional intensity, storytelling',
    culturalContext: 'Traditional Spanish music and Golden Age cinema',
    referenceArtists: ['Rocío Jurado', 'Isabel Pantoja', 'Lola Flores', 'Imperio Argentina'],
    sunoStyleHints: [
      'copla style',
      'theatrical Spanish vocals',
      'dramatic delivery',
      'traditional Spanish singing',
      'storytelling style',
    ],
  },

  {
    id: 'spanish-rock',
    name: 'Spanish Rock',
    characteristics: ['Powerful', 'Raw', 'Energetic', 'Rock voice', 'Attitude'],
    vocalTechniques: ['Rock vocal techniques', 'Raspy tone', 'Powerful delivery', 'Spanish pronunciation'],
    emotionalDelivery: 'Powerful, rebellious, energetic, raw emotion',
    culturalContext: 'Spanish rock and Movida Madrileña',
    referenceArtists: ['Enrique Bunbury', 'Joaquín Sabina', 'Bunbury', 'Héroes del Silencio'],
    sunoStyleHints: [
      'Spanish rock vocals',
      'raspy Spanish singing',
      'powerful delivery',
      'rock attitude',
      'Madrid style',
    ],
  },

  {
    id: 'rumba-catalana',
    name: 'Rumba Catalana',
    characteristics: ['Upbeat', 'Festive', 'Fusion', 'Party', 'Catalan influence'],
    vocalTechniques: ['Upbeat delivery', 'Catalan accent possible', 'Party vocal style', 'Fusion techniques'],
    emotionalDelivery: 'Festive, party atmosphere, joyful, celebratory',
    culturalContext: 'Barcelona/Catalan fusion music',
    referenceArtists: ['Gipsy Kings', 'Peret', 'Rumba Catalana artists'],
    sunoStyleHints: [
      'rumba catalana style',
      'festive Spanish vocals',
      'Catalan rumba',
      'party singing',
      'gipsy kings style',
    ],
  },
];

// ==================== MUSICAL SCALES ====================

const spanishMusicalScales: MusicalScale[] = [
  {
    id: 'phrygian-dominant',
    name: 'Phrygian Dominant (Flamenco Scale)',
    type: 'mode',
    notes: ['E', 'F', 'G#', 'A', 'B', 'C', 'D'],
    mood: 'Spanish, exotic, passionate, flamenco',
    culturalContext: 'THE flamenco scale - Andalusian cadence',
    emotionalEffect: 'Distinctly Spanish sound, passionate, exotic',
    usage: 'Essential for flamenco and Spanish guitar music',
  },

  {
    id: 'phrygian-mode',
    name: 'Phrygian Mode',
    type: 'mode',
    notes: ['E', 'F', 'G', 'A', 'B', 'C', 'D'],
    mood: 'Dark, Spanish, mysterious',
    culturalContext: 'Common in flamenco and Spanish music',
    emotionalEffect: 'Dark, mysterious, Spanish character',
    usage: 'Flamenco, Spanish folk music',
  },

  {
    id: 'harmonic-minor-spanish',
    name: 'Harmonic Minor (Spanish usage)',
    type: 'scale',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G#'],
    mood: 'Dramatic, passionate, exotic',
    culturalContext: 'Used in flamenco and Spanish classical guitar',
    emotionalEffect: 'Dramatic, passionate, mysterious',
    usage: 'Spanish classical guitar, flamenco variations',
  },

  {
    id: 'major-alegrias',
    name: 'Major Scale (Alegrías)',
    type: 'scale',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    mood: 'Joyful, bright, celebratory',
    culturalContext: 'Used in Alegrías and festive Spanish music',
    emotionalEffect: 'Joyful, bright, celebratory',
    usage: 'Alegrías, festive Spanish songs, rumba',
  },

  {
    id: 'andalusian-cadence',
    name: 'Andalusian Cadence',
    type: 'progression',
    notes: ['Am', 'G', 'F', 'E'],
    mood: 'Quintessentially Spanish/Flamenco',
    culturalContext: 'THE sound of Spain - appears in countless flamenco songs',
    emotionalEffect: 'Instantly recognizable Spanish sound',
    usage: 'Flamenco, Spanish music, creates instant Spanish atmosphere',
  },
];

// ==================== LYRIC EXAMPLES ====================

const spanishLyricExamples: LyricExample[] = [
  // AUTHENTIC FLAMENCO
  {
    type: 'authentic',
    text: 'Ay, la pena me mata / Como un cuchillo en el alma / Y la luna me mira / Llorando mi desgracia',
    explanation: 'Authentic flamenco. "Ay" expression. Pena (sorrow). Dramatic imagery (knife in soul). Moon watching.',
    context: 'Flamenco Soleá',
  },

  {
    type: 'authentic',
    text: 'Ole, ole con ole / Bailando bajo la luna / Tu sonrisa gitana / Ilumina mi fortuna',
    explanation: 'Festive flamenco. "Ole" expressions. Moon imagery. "Gitana" (gypsy) cultural reference. Rhythmic.',
    context: 'Flamenco Bulería',
  },

  // AUTHENTIC SPANISH POP
  {
    type: 'authentic',
    text: 'Te quiero más que ayer / Pero menos que mañana / Mi corazón late tu nombre / En cada madrugada',
    explanation: 'Modern Spanish pop. Romantic but not clichéd. Natural Spanish phrasing. Heart "beats your name".',
    context: 'Contemporary Spanish Pop',
  },

  {
    type: 'authentic',
    text: 'El mar me llama con tu voz / Las olas traen tu recuerdo / Y yo aquí, solo y perdido / Esperando tu regreso',
    explanation: 'Sea metaphor (vastness). Natural Spanish. "Solo y perdido" (alone and lost). Waiting theme.',
    context: 'Spanish Ballad',
  },

  // AUTHENTIC COPLA
  {
    type: 'authentic',
    text: 'Soy española hasta la muerte / Llevo España en mi corazón / Y aunque el destino me separe / España es mi única pasión',
    explanation: 'Classic copla. Spanish identity theme. Dramatic delivery. Theatrical emotion. Patriotic passion.',
    context: 'Traditional Copla',
  },

  // AUTHENTIC RUMBA CATALANA
  {
    type: 'authentic',
    text: 'Baila, baila sin parar / La rumba nos va a alegrar / Con guitarra y con palmadas / Esta noche va a brillar',
    explanation: 'Rumba catalana. Upbeat, party atmosphere. Dance theme. Guitar and palmas mentioned. Festive.',
    context: 'Rumba Catalana',
  },

  // BAD EXAMPLES (AVOID)
  {
    type: 'avoid',
    text: 'Bebé bebé oh / Tú eres mi sol brillante / Yo te amo tanto tanto / Mi corazón está en fuego',
    explanation: 'Direct English translation. "Baby baby oh". "Heart on fire" doesn\'t work in Spanish. Unnatural.',
    context: 'AVOID - Translated English clichés',
  },

  {
    type: 'avoid',
    text: 'Súbelo súbelo / Vamos a la fiesta ahora / Todos las manos en el aire / DJ pon la música',
    explanation: 'Generic club clichés. "Hands in the air", "DJ play music". No Spanish cultural depth.',
    context: 'AVOID - Generic club lyrics',
  },

  // REFERENCE (CLASSIC STYLES)
  {
    type: 'reference',
    text: 'La leyenda del tiempo / No la puedo creer / Que tu vida se agarra / En un papel',
    explanation: 'Camarón de la Isla style. Poetic, philosophical. Natural Spanish. Legendary flamenco.',
    context: 'Flamenco reference (Camarón)',
  },

  {
    type: 'reference',
    text: 'Corazón partío / Y lo peor de todo es que no tengo a nadie / Que se ponga en tu lugar',
    explanation: 'Alejandro Sanz style. "Corazón partío" (broken heart). Natural colloquial Spanish. Pop sensibility.',
    context: 'Spanish Pop reference (Alejandro Sanz)',
  },
];

// ==================== SPANISH LANGUAGE CONFIG ====================

export const spanishConfig: LanguageConfig = {
  id: 'spanish',
  name: 'Spanish',
  nativeName: 'Español',
  tier: 'tier2',
  
  scripts: ['Latin (Español)', 'Castilian Spanish'],
  
  dialects: [
    'Castilian Spanish (España)',
    'Andalusian Spanish (Andalucía)',
    'Madrid Spanish (Madrileño)',
    'Catalan-influenced Spanish (Barcelona)',
    'Latin American Spanish (reference)',
  ],
  
  musicalTraditions: spanishMusicalTraditions,
  poeticDevices: spanishPoeticDevices,
  singingStyles: spanishSingingStyles,
  musicalScales: spanishMusicalScales,
  
  commonInstruments: [
    'Spanish Guitar (Guitarra española)',
    'Palmas (Handclaps)',
    'Cajón',
    'Castanets (Castañuelas)',
    'Bandurria',
    'Accordion',
    'Electric Guitar',
    'Bass',
    'Drums',
  ],
  
  culturalThemes: [
    'Pena (Deep sorrow)',
    'Duende (Soul/spirit in performance)',
    'Amor (Love)',
    'Pasión (Passion)',
    'Luna (Moon - romance)',
    'Mar (Sea - freedom)',
    'Noche (Night - mystery)',
    'Corazón (Heart)',
    'Gitano/a (Gypsy culture)',
    'España (Spanish identity)',
  ],
  
  lyricExamples: spanishLyricExamples,
  
  enabled: true,
};

// ==================== SPANISH SONG STRUCTURES ====================

export const spanishSongStructures = {
  flamenco: {
    solea: ['intro', 'verse1', 'escobilla', 'verse2', 'llamada', 'cierre'],
    buleria: ['intro', 'verse1', 'chorus', 'escobilla', 'verse2', 'chorus', 'remate'],
    alegrias: ['intro', 'verse1', 'chorus', 'silencio', 'verse2', 'chorus', 'cierre'],
    seguiriya: ['largo', 'verse1', 'verse2', 'remate'],
  },
  
  pop: {
    romantic: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus', 'outro'],
    upbeat: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'pre-chorus', 'chorus', 'bridge', 'chorus'],
  },
  
  copla: {
    traditional: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'verse3', 'chorus'],
  },
  
  rumba: {
    catalana: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'instrumental', 'chorus'],
  },
};

// ==================== CULTURAL NOTES ====================

export const spanishCulturalNotes = {
  duende: 'Duende is THE essential Spanish concept. Not just emotion - it\'s visceral, raw, soul-exposing. Essential for flamenco.',
  pena: 'Pena (deep sorrow) is central to flamenco and copla. More than sadness - existential suffering.',
  compas: 'Compás (rhythm) in flamenco is sacred. Being "en compás" means being in the flow of the rhythm.',
  andalusia: 'Andalusia is the heart of flamenco. Phrygian dominant scale is THE flamenco sound.',
  
  language: {
    pronunciation: 'Clear Spanish pronunciation essential. Castilian "th" sound for z/c before e/i.',
    expressions: 'Use authentic Spanish expressions (Ole, Ay, Toma que toma) not translations.',
    diminutives: 'Spanish loves diminutives (-ito/-ita) for affection and intimacy.',
  },
  
  avoidances: [
    'Don\'t translate English idioms directly - they sound unnatural',
    'Avoid generic club/party lyrics without Spanish cultural depth',
    'Don\'t ignore duende concept for flamenco - it\'s everything',
    'Maintain Spanish pronunciation and cultural authenticity',
    'Phrygian dominant scale is essential for flamenco sound',
  ],
};

// ==================== EXPORT ====================

export default spanishConfig;
