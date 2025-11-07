/**
 * HOLLY - German Language Configuration (TIER 3)
 * Schlager, Neue Deutsche Welle Integration
 * 
 * Complete cultural and musical context for authentic German songwriting
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

const germanMusicalTraditions: MusicalTradition[] = [
  // Schlager
  {
    id: 'schlager-classic',
    name: 'Schlager (Classic)',
    category: 'modern',
    description: 'Classic German pop - catchy, romantic, mainstream',
    characteristics: [
      'Catchy melodies',
      'Romantic themes',
      'Mainstream appeal',
      'Festival culture',
      'Easy listening',
      'German cultural identity',
    ],
    typicalInstruments: ['Synthesizers', 'Accordion', 'Orchestra', 'Guitar', 'Keyboards'],
    vocaStyleGuidance: 'Schlager vocals, clear German pronunciation, romantic delivery, catchy style, mainstream appeal',
  },

  {
    id: 'schlager-modern',
    name: 'Schlager (Modern)',
    category: 'modern',
    description: 'Contemporary Schlager with modern production',
    characteristics: [
      'Modern production',
      'EDM influences',
      'Party atmosphere',
      'Mallorca/Ballermann culture',
      'Youth appeal',
      'Electronic elements',
    ],
    typicalInstruments: ['Electronic beats', 'Synthesizers', 'Modern production', 'EDM elements'],
    vocaStyleGuidance: 'Modern Schlager vocals, party delivery, EDM-influenced, energetic, youth-oriented',
  },

  // Neue Deutsche Welle (NDW)
  {
    id: 'neue-deutsche-welle',
    name: 'Neue Deutsche Welle (NDW)',
    category: 'modern',
    description: 'German new wave - 80s, experimental, influential',
    characteristics: [
      '80s new wave',
      'Experimental sounds',
      'Synthesizers prominent',
      'German lyrics (revolutionary)',
      'Art rock influence',
      'Cultural movement',
    ],
    typicalInstruments: ['Synthesizers', 'Drum machines', 'Electric guitar', 'Bass', '80s production'],
    vocaStyleGuidance: 'NDW vocals, 80s new wave style, experimental delivery, German pronunciation, art rock influence',
  },

  // German Rock
  {
    id: 'german-rock',
    name: 'Deutschrock',
    category: 'modern',
    description: 'German rock music - powerful, rebellious',
    characteristics: [
      'Rock energy',
      'German lyrics',
      'Powerful vocals',
      'Rebellious themes',
      'Working class appeal',
      'Stadium rock',
    ],
    typicalInstruments: ['Electric Guitar', 'Bass', 'Drums', 'Rock instrumentation'],
    vocaStyleGuidance: 'German rock vocals, powerful delivery, rebellious attitude, stadium rock style',
  },

  // Industrial/Neue Deutsche Härte
  {
    id: 'neue-deutsche-harte',
    name: 'Neue Deutsche Härte',
    category: 'modern',
    description: 'German industrial metal - Rammstein style',
    characteristics: [
      'Industrial metal',
      'Heavy guitars',
      'Electronic elements',
      'Theatrical delivery',
      'Powerful German',
      'Controversial themes',
    ],
    typicalInstruments: ['Heavy guitars', 'Industrial sounds', 'Electronic elements', 'Heavy drums'],
    vocaStyleGuidance: 'Industrial German vocals, powerful delivery, theatrical style, heavy pronunciation, commanding',
  },

  // Krautrock
  {
    id: 'krautrock',
    name: 'Krautrock',
    category: 'modern',
    description: 'German experimental rock - psychedelic, electronic',
    characteristics: [
      'Experimental',
      'Psychedelic',
      'Electronic experimentation',
      'Long instrumental passages',
      'Motorik beat',
      'Avant-garde',
    ],
    typicalInstruments: ['Synthesizers', 'Electric guitar', 'Bass', 'Drums', 'Electronic equipment'],
    vocaStyleGuidance: 'Krautrock vocals, experimental delivery, psychedelic style, minimal lyrics often',
  },

  // German Hip Hop
  {
    id: 'german-hip-hop',
    name: 'German Hip Hop/Rap',
    category: 'modern',
    description: 'German rap - street culture, social commentary',
    characteristics: [
      'Rap-focused',
      'German street culture',
      'Social commentary',
      'Urban themes',
      'Multicultural influences',
      'Berlin/Hamburg scenes',
    ],
    typicalInstruments: ['Hip hop beats', 'Electronic production', 'Minimal instrumentation'],
    vocaStyleGuidance: 'German rap delivery, street German, urban attitude, social commentary, hip hop flow',
  },

  // Volksmusik
  {
    id: 'volksmusik',
    name: 'Volksmusik',
    category: 'folk',
    description: 'Traditional German folk music',
    characteristics: [
      'Traditional folk',
      'Regional variations',
      'Alpine culture',
      'Accordion prominent',
      'Festival music',
      'Heritage preservation',
    ],
    typicalInstruments: ['Accordion', 'Zither', 'Alpine horn', 'Traditional instruments'],
    vocaStyleGuidance: 'Traditional folk vocals, regional German dialects, authentic folk delivery, cultural heritage',
  },

  // German Indie/Alternative
  {
    id: 'german-indie',
    name: 'German Indie/Alternative',
    category: 'modern',
    description: 'German independent music - alternative sounds',
    characteristics: [
      'Indie aesthetic',
      'Alternative sounds',
      'Artistic freedom',
      'German lyrics',
      'Contemporary themes',
      'Less mainstream',
    ],
    typicalInstruments: ['Indie rock instruments', 'Alternative production', 'Experimental sounds'],
    vocaStyleGuidance: 'German indie vocals, alternative delivery, artistic expression, contemporary German',
  },

  // Elektronische Musik
  {
    id: 'german-electronic',
    name: 'German Electronic Music',
    category: 'modern',
    description: 'German electronic/techno - Berlin club culture',
    characteristics: [
      'Electronic/techno',
      'Berlin club scene',
      'Minimal vocals',
      'Dance-oriented',
      'Underground culture',
      'Experimental',
    ],
    typicalInstruments: ['Synthesizers', 'Drum machines', 'Electronic production', 'Techno equipment'],
    vocaStyleGuidance: 'Minimal German vocals, electronic style, Berlin cool, club culture, experimental',
  },
];

// ==================== POETIC DEVICES ====================

const germanPoeticDevices: PoeticDevice[] = [
  {
    name: 'Sehnsucht',
    type: 'cultural',
    description: 'German concept - longing, yearning, wistful desire',
    examples: [
      'Deep longing',
      'Wistful yearning',
      'Romantic desire',
    ],
    usage: 'ESSENTIAL German emotional concept - untranslatable depth',
  },

  {
    name: 'Weltschmerz',
    type: 'cultural',
    description: 'World-weariness, sadness about the state of the world',
    examples: [
      'World-pain',
      'Existential sadness',
      'Philosophical melancholy',
    ],
    usage: 'German philosophical concept in lyrics',
  },

  {
    name: 'Heimat',
    type: 'cultural',
    description: 'Homeland, sense of belonging, roots',
    examples: [
      'Homeland feeling',
      'Sense of belonging',
      'Cultural roots',
    ],
    usage: 'Essential German identity concept',
  },

  {
    name: 'German Nature Imagery',
    type: 'metaphor',
    description: 'German landscape and seasons in poetry',
    examples: [
      'Wald (Forest) = German identity, darkness, mystery',
      'Rhein (Rhine) = German cultural symbol',
      'Mond (Moon) = Romance, night',
      'Herbst (Autumn) = Melancholy, change',
      'Schnee (Snow) = Winter, purity',
    ],
    usage: 'Essential for German lyrics',
  },

  {
    name: 'Compound Words',
    type: 'structure',
    description: 'German creates long compound words',
    examples: [
      'Liebeskummer (Love-sorrow)',
      'Fernweh (Far-pain = Wanderlust)',
      'Herzschmerz (Heart-pain)',
    ],
    usage: 'German language feature - compound words create meaning',
  },

  {
    name: 'German Rhyme Schemes',
    type: 'rhyme',
    description: 'Rhyming patterns in German poetry and song',
    examples: [
      '-en endings: Leben/Geben',
      '-eit endings: Zeit/Ewigkeit',
      '-er endings: Mehr/Sehr',
    ],
    usage: 'German has rich rhyming possibilities',
  },

  {
    name: 'Alliteration (German)',
    type: 'structure',
    description: 'Repetition of consonant sounds in German',
    examples: [
      'Liebe und Leid (Love and sorrow)',
      'Sturm und Drang (Storm and stress)',
      'Herz und Schmerz (Heart and pain)',
    ],
    usage: 'Creates strong effect in German lyrics',
  },

  {
    name: 'Repetition for Emphasis',
    type: 'structure',
    description: 'Emotional emphasis through repetition',
    examples: [
      'Immer, immer, immer (Always, always, always)',
      'Nie, nie, nie (Never, never, never)',
      'Mehr, mehr, mehr (More, more, more)',
    ],
    usage: 'Common in Schlager and German pop',
  },

  {
    name: 'Romantic Tradition',
    type: 'cultural',
    description: 'German Romantic poetry tradition',
    examples: [
      'Nature worship',
      'Emotional intensity',
      'Supernatural themes',
      'Individual expression',
    ],
    usage: 'German Romantic tradition influences modern music',
  },
];

// ==================== SINGING STYLES ====================

const germanSingingStyles: SingingStyle[] = [
  {
    id: 'schlager-classic-style',
    name: 'Schlager (Classic)',
    characteristics: ['Catchy', 'Romantic', 'Clear', 'Mainstream', 'Easy listening'],
    vocalTechniques: ['Clear German pronunciation', 'Catchy delivery', 'Romantic expression', 'Accessible style'],
    emotionalDelivery: 'Catchy, romantic, accessible, mainstream appeal, German charm',
    culturalContext: 'German Schlager tradition',
    referenceArtists: ['Helene Fischer', 'Andrea Berg', 'Roland Kaiser', 'Howard Carpendale'],
    sunoStyleHints: [
      'Schlager vocals',
      'German pop singing',
      'catchy delivery',
      'romantic style',
      'mainstream appeal',
    ],
  },

  {
    id: 'ndw-new-wave',
    name: 'Neue Deutsche Welle',
    characteristics: ['80s', 'New wave', 'Experimental', 'German pronunciation', 'Art rock'],
    vocalTechniques: ['80s new wave style', 'Experimental delivery', 'Clear German', 'Art rock influence'],
    emotionalDelivery: '80s new wave, experimental, German pronunciation, cool delivery',
    culturalContext: 'German new wave movement',
    referenceArtists: ['Nena', 'Falco', 'Ideal', 'Trio'],
    sunoStyleHints: [
      'NDW vocals',
      '80s German new wave',
      'experimental delivery',
      'clear German pronunciation',
      'art rock style',
    ],
  },

  {
    id: 'german-rock-powerful',
    name: 'Deutschrock',
    characteristics: ['Powerful', 'Rock energy', 'Rebellious', 'German pride', 'Stadium style'],
    vocalTechniques: ['Powerful German vocals', 'Rock delivery', 'Rebellious attitude', 'Stadium rock style'],
    emotionalDelivery: 'Powerful, rebellious, rock energy, German pride, stadium style',
    culturalContext: 'German rock tradition',
    referenceArtists: ['Herbert Grönemeyer', 'Udo Lindenberg', 'Die Toten Hosen', 'Scorpions (German lyrics)'],
    sunoStyleHints: [
      'German rock vocals',
      'powerful delivery',
      'rebellious attitude',
      'stadium style',
      'rock energy',
    ],
  },

  {
    id: 'industrial-harte',
    name: 'Neue Deutsche Härte',
    characteristics: ['Industrial', 'Heavy', 'Theatrical', 'Powerful German', 'Commanding'],
    vocalTechniques: ['Industrial delivery', 'Theatrical style', 'Heavy German pronunciation', 'Commanding presence'],
    emotionalDelivery: 'Industrial, theatrical, powerful, commanding, heavy German',
    culturalContext: 'German industrial metal',
    referenceArtists: ['Rammstein', 'Oomph!', 'Eisbrecher'],
    sunoStyleHints: [
      'industrial German vocals',
      'theatrical delivery',
      'heavy pronunciation',
      'commanding style',
      'powerful',
    ],
  },

  {
    id: 'german-rap-street',
    name: 'German Rap',
    characteristics: ['Rap flow', 'Street German', 'Urban', 'Social commentary', 'Multicultural'],
    vocalTechniques: ['German rap flow', 'Street German', 'Urban delivery', 'Social commentary'],
    emotionalDelivery: 'Urban, street attitude, social commentary, German rap style, multicultural',
    culturalContext: 'German hip hop scene',
    referenceArtists: ['Sido', 'Bushido', 'Cro', 'Haftbefehl'],
    sunoStyleHints: [
      'German rap vocals',
      'street German delivery',
      'urban style',
      'hip hop flow',
      'social commentary',
    ],
  },

  {
    id: 'german-indie-alternative',
    name: 'German Indie',
    characteristics: ['Indie', 'Alternative', 'Authentic', 'Artistic', 'Contemporary'],
    vocalTechniques: ['Indie delivery', 'Authentic German', 'Artistic expression', 'Alternative style'],
    emotionalDelivery: 'Indie, authentic, artistic, alternative German, contemporary',
    culturalContext: 'German indie scene',
    referenceArtists: ['AnnenMayKantereit', 'Provinz', 'Wanda', 'Kettcar'],
    sunoStyleHints: [
      'German indie vocals',
      'alternative delivery',
      'authentic style',
      'contemporary German',
      'artistic',
    ],
  },
];

// ==================== MUSICAL SCALES ====================

const germanMusicalScales: MusicalScale[] = [
  {
    id: 'major-german',
    name: 'Major Scale (German)',
    type: 'major',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    mood: 'Bright, optimistic, Schlager',
    culturalContext: 'German Schlager and pop',
    emotionalEffect: 'Bright, joyful, optimistic',
    usage: 'Schlager, German pop, happy songs',
  },

  {
    id: 'minor-natural-german',
    name: 'Natural Minor (German)',
    type: 'minor',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    mood: 'Melancholic, German Weltschmerz',
    culturalContext: 'German ballads, emotional songs',
    emotionalEffect: 'Melancholic, Weltschmerz, emotional',
    usage: 'German ballads, melancholic rock',
  },

  {
    id: 'harmonic-minor-dramatic',
    name: 'Harmonic Minor (Dramatic)',
    type: 'minor',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G#'],
    mood: 'Dramatic, powerful',
    culturalContext: 'Dramatic German rock',
    emotionalEffect: 'Dramatic, intense, powerful',
    usage: 'Neue Deutsche Härte, dramatic rock',
  },

  {
    id: 'chromatic-industrial',
    name: 'Chromatic (Industrial)',
    type: 'modal',
    notes: ['All 12 semitones'],
    mood: 'Industrial, experimental',
    culturalContext: 'Industrial and experimental German music',
    emotionalEffect: 'Industrial, tension, experimental',
    usage: 'Neue Deutsche Härte, industrial music',
  },

  {
    id: 'pentatonic-german-pop',
    name: 'Pentatonic (German Pop)',
    type: 'pentatonic',
    notes: ['C', 'D', 'E', 'G', 'A'],
    mood: 'Accessible, pop',
    culturalContext: 'Modern German pop',
    emotionalEffect: 'Accessible, catchy, pop',
    usage: 'German pop, Schlager, accessible melodies',
  },
];

// ==================== LYRIC EXAMPLES ====================

const germanLyricExamples: LyricExample[] = [
  // AUTHENTIC SCHLAGER
  {
    type: 'authentic',
    text: 'Atemlos durch die Nacht / Bis ein neuer Tag erwacht / Atemlos einfach raus / Deine Augen ziehen mich aus',
    explanation: 'Modern Schlager (Helene Fischer). "Breathless through the night". Catchy, romantic. Natural German.',
    context: 'Modern Schlager',
  },

  {
    type: 'authentic',
    text: 'Über sieben Brücken musst du gehn / Sieben dunkle Jahre überstehn / Siebenmal wirst du die Asche sein / Aber einmal auch der helle Schein',
    explanation: 'Classic German song. "Over seven bridges you must go". Poetic, metaphorical. Natural German depth.',
    context: 'Classic German Pop/Rock',
  },

  // AUTHENTIC NDW
  {
    type: 'authentic',
    text: '99 Luftballons auf ihrem Weg zum Horizont / Hielt man für UFOs aus dem All / Darum schickte ein General / Eine Fliegerstaffel hinterher',
    explanation: 'NDW classic (Nena). "99 balloons". Political commentary. Clear German. 80s new wave style.',
    context: 'Neue Deutsche Welle',
  },

  {
    type: 'authentic',
    text: 'Da da da ich lieb dich nicht du liebst mich nicht / Aha aha aha / Da da da ich lieb dich nicht du liebst mich nicht',
    explanation: 'NDW minimalism (Trio). Repetitive, experimental. Clear German. Art rock simplicity.',
    context: 'Neue Deutsche Welle',
  },

  // AUTHENTIC GERMAN ROCK
  {
    type: 'authentic',
    text: 'Männer sind Schweine / Traue ihnen nicht mein Kind / Sie wollen alle das Eine / Weil Männer nun mal so sind',
    explanation: 'German rock (Die Ärzte). Social commentary. "Men are pigs". Rebellious, humorous. Natural German.',
    context: 'Deutschrock',
  },

  // AUTHENTIC NEUE DEUTSCHE HÄRTE
  {
    type: 'authentic',
    text: 'Du hast / Du hast mich / Du hast mich gefragt / Und ich hab nichts gesagt',
    explanation: 'Industrial (Rammstein). "You have / You have me / You asked me". Powerful, theatrical German. Heavy delivery.',
    context: 'Neue Deutsche Härte',
  },

  // AUTHENTIC GERMAN RAP
  {
    type: 'authentic',
    text: 'Ich komm aus der Stadt wo die Liebe wohnt / Berlin, mein Berlin / Wo jeder sein Ding macht / Und keiner fragt wohin',
    explanation: 'German rap. Berlin reference. "City where love lives". Street German. Urban identity.',
    context: 'German Hip Hop',
  },

  // AUTHENTIC GERMAN INDIE
  {
    type: 'authentic',
    text: 'Oft gefragt / Was ich denn bräuchte um glücklich zu sein / Vielleicht ein Haus am See / Frieden der Seele oder so',
    explanation: 'German indie. "House by the lake". Natural German. Contemporary themes. Indie authenticity.',
    context: 'German Indie',
  },

  // BAD EXAMPLES (AVOID)
  {
    type: 'avoid',
    text: 'Baby Baby oh / Du bist meine Sonne / Ich liebe dich so sehr / Mein Herz brennt',
    explanation: 'Direct English translation. "Baby baby oh". "You are my sun" unnatural. "Heart burns" forced.',
    context: 'AVOID - Translated English clichés',
  },

  {
    type: 'avoid',
    text: 'Hände hoch / DJ mach lauter / Tanze die ganze Nacht / Party bis zum Morgen',
    explanation: 'Generic club clichés. "Hands up", "DJ louder". No German cultural depth. Sounds translated.',
    context: 'AVOID - Generic party lyrics',
  },

  // REFERENCE (CLASSIC STYLES)
  {
    type: 'reference',
    text: 'Mensch wo bist du jetzt / In diesem Augenblick / Mensch was machst du jetzt / In diesem Augenblick',
    explanation: 'Herbert Grönemeyer style. "Human, where are you now". Philosophical. Natural German depth.',
    context: 'Deutschrock reference (Grönemeyer)',
  },

  {
    type: 'reference',
    text: 'Ich war noch niemals in New York / Ich war noch niemals auf Hawaii / Ging nie durch San Francisco / In zerriss\'nen Jeans',
    explanation: 'Udo Jürgens classic. "I\'ve never been to New York". Travel longing. Schlager/pop style. Natural German.',
    context: 'Schlager reference (Jürgens)',
  },
];

// ==================== GERMAN LANGUAGE CONFIG ====================

export const germanConfig: LanguageConfig = {
  id: 'german',
  name: 'German',
  nativeName: 'Deutsch',
  tier: 'tier3',
  
  scripts: ['Latin (Deutsch)'],
  
  dialects: [
    'Standard German (Hochdeutsch)',
    'Bavarian (Bayerisch)',
    'Austrian German (Österreichisch)',
    'Swiss German (Schweizerdeutsch)',
    'Northern German (Norddeutsch)',
  ],
  
  musicalTraditions: germanMusicalTraditions,
  poeticDevices: germanPoeticDevices,
  singingStyles: germanSingingStyles,
  musicalScales: germanMusicalScales,
  
  commonInstruments: [
    'Synthesizers',
    'Accordion',
    'Electric Guitar',
    'Bass',
    'Drums',
    'Piano',
    'Keyboards',
    'Electronic production',
    'Industrial sounds',
  ],
  
  culturalThemes: [
    'Sehnsucht (Longing)',
    'Weltschmerz (World-weariness)',
    'Heimat (Homeland)',
    'Liebe (Love)',
    'Wald (Forest)',
    'Rhein (Rhine)',
    'Herbst (Autumn)',
    'Nacht (Night)',
    'Freiheit (Freedom)',
    'Traum (Dream)',
  ],
  
  lyricExamples: germanLyricExamples,
  
  enabled: true,
};

// ==================== GERMAN SONG STRUCTURES ====================

export const germanSongStructures = {
  schlager: {
    classic: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus', 'outro'],
    modern: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'pre-chorus', 'chorus', 'drop', 'chorus', 'outro'],
  },
  
  ndw: {
    newWave: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus', 'outro'],
  },
  
  rock: {
    deutsch: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'pre-chorus', 'chorus', 'guitar-solo', 'chorus', 'outro'],
  },
  
  industrial: {
    harte: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'pre-chorus', 'chorus', 'breakdown', 'chorus', 'outro'],
  },
  
  rap: {
    standard: ['intro', 'verse1', 'hook', 'verse2', 'hook', 'bridge', 'verse3', 'hook', 'outro'],
  },
};

// ==================== CULTURAL NOTES ====================

export const germanCulturalNotes = {
  sehnsucht: 'Sehnsucht is THE essential German concept - deep longing, untranslatable yearning.',
  schlager: 'Schlager is mainstream German pop - catchy, romantic, festival culture. Huge in German-speaking world.',
  ndw: 'Neue Deutsche Welle revolutionized German music - made German lyrics cool in 80s.',
  compound: 'German creates compound words - creates unique meanings (Liebeskummer, Fernweh, Heimweh).',
  
  language: {
    pronunciation: 'Clear German pronunciation essential - hard consonants, precise articulation.',
    compounds: 'German compound words create rich meanings.',
    dialects: 'German has strong regional dialects - Bavarian, Austrian, Swiss differ significantly.',
    romanticism: 'German Romantic tradition influences modern music - nature, emotion, individual.',
  },
  
  avoidances: [
    'Don\'t translate English idioms directly - they sound unnatural',
    'Don\'t ignore German compound words - they create unique meanings',
    'Don\'t forget Sehnsucht concept - essential German emotion',
    'Schlager requires catchy melodies and clear German',
    'German pronunciation is precise - hard consonants, clear articulation',
  ],
};

// ==================== EXPORT ====================

export default germanConfig;
