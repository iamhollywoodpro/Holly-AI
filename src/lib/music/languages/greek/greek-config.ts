/**
 * HOLLY - Greek Language Configuration (TIER 2)
 * Rebetiko, Laïkó, Traditional Greek Music Integration
 * 
 * Complete cultural and musical context for authentic Greek songwriting
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

const greekMusicalTraditions: MusicalTradition[] = [
  // Rebetiko (Greek Blues)
  {
    id: 'rebetiko-classic',
    name: 'Rebetiko (Classic)',
    category: 'folk',
    description: 'Greek urban folk music - the Greek blues, outcasts and suffering',
    characteristics: [
      'Melancholic',
      'Urban working class',
      'Themes: hashish, prison, poverty, love',
      'Bouzouki-driven',
      'Minor keys',
      'Greek soul and suffering',
    ],
    typicalInstruments: ['Bouzouki', 'Baglamas', 'Guitar', 'Accordion', 'Santouri'],
    vocaStyleGuidance: 'Raw, emotional, Greek blues style, working-class authenticity, soulful delivery, melancholic',
  },

  {
    id: 'rebetiko-piraeus',
    name: 'Rebetiko (Piraeus Style)',
    category: 'folk',
    description: 'Piraeus rebetiko - port city style, more commercial',
    characteristics: [
      'Port city culture',
      'More accessible than Smyrna style',
      'Love and romance themes',
      'Bouzouki prominent',
      'Greek coastal atmosphere',
      'Working class identity',
    ],
    typicalInstruments: ['Bouzouki', 'Guitar', 'Baglamas'],
    vocaStyleGuidance: 'Emotional, Greek coastal style, accessible delivery, romantic but melancholic',
  },

  // Laïkó (Greek Popular Music)
  {
    id: 'laiko-classic',
    name: 'Laïkó (Classic)',
    category: 'modern',
    description: 'Classic Greek popular music - evolved from rebetiko',
    characteristics: [
      'Popular Greek style',
      'Orchestral arrangements',
      'Romantic themes',
      'Greek cultural identity',
      'Accessible melodies',
      'Emotional delivery',
    ],
    typicalInstruments: ['Bouzouki', 'Orchestra', 'Electric Guitar', 'Keyboard', 'Drums'],
    vocaStyleGuidance: 'Emotional Greek vocals, popular style, romantic delivery, accessible',
  },

  {
    id: 'laiko-modern',
    name: 'Laïkó (Modern)',
    category: 'modern',
    description: 'Contemporary Greek popular music',
    characteristics: [
      'Modern production',
      'Greek lyrics',
      'International influences',
      'Dance-oriented',
      'Urban Greek style',
      'Electronic elements',
    ],
    typicalInstruments: ['Bouzouki', 'Synthesizers', 'Electronic beats', 'Guitar', 'Modern production'],
    vocaStyleGuidance: 'Modern Greek vocals, contemporary delivery, dance-oriented, accessible style',
  },

  // Traditional Greek
  {
    id: 'dimotiko-traghoudi',
    name: 'Dimotiko Traghoudi (Folk Song)',
    category: 'folk',
    description: 'Traditional Greek folk songs from rural areas',
    characteristics: [
      'Regional variations',
      'Traditional instruments',
      'Rural themes',
      'Ancient Greek roots',
      'Dance accompaniment',
      'Regional identity',
    ],
    typicalInstruments: ['Lyra', 'Clarinet', 'Laouto', 'Daouli', 'Tambourine'],
    vocaStyleGuidance: 'Traditional Greek folk, regional accent, authentic folk delivery, cultural depth',
  },

  {
    id: 'island-music',
    name: 'Island Music (Nisiotika)',
    category: 'folk',
    description: 'Greek island music - light, festive, coastal',
    characteristics: [
      'Island themes',
      'Sea and coastal imagery',
      'Light, festive',
      'Dance-oriented',
      'Violin and laouto',
      'Aegean culture',
    ],
    typicalInstruments: ['Violin', 'Laouto', 'Santouri', 'Tambourine'],
    vocaStyleGuidance: 'Light, festive Greek vocals, island accent, coastal atmosphere, joyful delivery',
  },

  // Byzantine
  {
    id: 'byzantine-chant',
    name: 'Byzantine Chant',
    category: 'classical',
    description: 'Greek Orthodox religious music - ancient tradition',
    characteristics: [
      'Sacred, religious',
      'Ancient Greek scales',
      'Unaccompanied vocals',
      'Church acoustics',
      'Spiritual depth',
      'Byzantine tradition',
    ],
    typicalInstruments: ['None (a cappella)', 'Voice only'],
    vocaStyleGuidance: 'Sacred, reverent, Byzantine vocal technique, Greek Orthodox style, spiritual delivery',
  },

  // Entehno (Art Music)
  {
    id: 'entehno',
    name: 'Entehno (Art Music)',
    category: 'modern',
    description: 'Greek art music - poetry and classical fusion',
    characteristics: [
      'Poetry-based',
      'Sophisticated arrangements',
      'Classical influences',
      'Literary Greek',
      'Intellectual depth',
      'Greek cultural sophistication',
    ],
    typicalInstruments: ['Orchestra', 'Bouzouki', 'Classical instruments', 'Piano'],
    vocaStyleGuidance: 'Sophisticated Greek vocals, poetic delivery, intellectual style, classical influence',
  },

  // Modern Greek Pop/Rock
  {
    id: 'greek-pop-rock',
    name: 'Greek Pop/Rock',
    category: 'modern',
    description: 'Contemporary Greek pop and rock music',
    characteristics: [
      'Western influences',
      'Greek lyrics',
      'Modern production',
      'Youth-oriented',
      'International appeal',
      'Greek identity maintained',
    ],
    typicalInstruments: ['Electric Guitar', 'Bass', 'Drums', 'Keyboards', 'Modern production'],
    vocaStyleGuidance: 'Modern Greek vocals, pop/rock delivery, contemporary style, youth-oriented',
  },

  // Zeibekiko
  {
    id: 'zeibekiko',
    name: 'Zeibekiko',
    category: 'folk',
    description: 'Greek dance and musical style - solo male dance of sorrow',
    characteristics: [
      'Solo dance music',
      'Masculine, proud',
      'Themes: pain, pride, manhood',
      'Slow-medium tempo',
      '9/8 time signature',
      'Emotional intensity',
    ],
    typicalInstruments: ['Bouzouki', 'Baglamas', 'Accordion'],
    vocaStyleGuidance: 'Masculine, proud, emotional intensity, Greek male identity, powerful delivery',
  },
];

// ==================== POETIC DEVICES ====================

const greekPoeticDevices: PoeticDevice[] = [
  {
    name: 'Kefi (Κέφι)',
    type: 'cultural',
    description: 'Untranslatable Greek concept - joy, passion, high spirits, soul in celebration',
    examples: [
      'Έχω κέφι (I have kefi - I\'m in high spirits)',
      'Με κέφι (With kefi - with passion/joy)',
      'Το κέφι της ζωής (The kefi of life)',
    ],
    usage: 'Essential Greek emotional concept - joy and passion combined',
  },

  {
    name: 'Merak (Μεράκι)',
    type: 'cultural',
    description: 'Greek/Turkish concept - doing something with soul, creativity, and love',
    examples: [
      'Με μεράκι (With merak - with soul and love)',
      'Έχει μεράκι (Has merak - done with passion)',
      'Το μεράκι του τεχνίτη (The craftsman\'s merak)',
    ],
    usage: 'Essential Greek concept - soul and passion in creation',
  },

  {
    name: 'Greek Nature Imagery',
    type: 'metaphor',
    description: 'Greek landscape and nature in poetry',
    examples: [
      'Θάλασσα (Thalassa - Sea) = Freedom, Greece, homeland',
      'Ήλιος (Helios - Sun) = Life, Greece, warmth',
      'Φεγγάρι (Moon) = Romance, melancholy',
      'Νησί (Island) = Home, escape, Greek identity',
      'Ελιά (Olive tree) = Greece, peace, ancient roots',
    ],
    usage: 'Essential for authentic Greek lyrics',
  },

  {
    name: 'Rebetiko Vocabulary',
    type: 'cultural',
    description: 'Specific rebetiko slang and expressions',
    examples: [
      'Μάγκας (Mangas - Tough guy, street-smart)',
      'Χασίς (Hashish - drug culture reference)',
      'Τεκές (Tekés - Hashish den)',
      'Ρεμπέτης (Rebetis - Rebetiko musician/lifestyle)',
    ],
    usage: 'Essential for authentic rebetiko - working class/outcast culture',
  },

  {
    name: 'Greek Rhyme Schemes',
    type: 'rhyme',
    description: 'Greek rhyming patterns in song',
    examples: [
      '-α endings: Καρδιά/Αγκαλιά (Heart/Embrace)',
      '-ος/-η endings: Έρωτας/Ζωή (Love/Life)',
      '-ια: Νύχτα/Ψυχή (Night/Soul)',
    ],
    usage: 'Greek has rich rhyming possibilities in song lyrics',
  },

  {
    name: 'Greek Mythology References',
    type: 'cultural',
    description: 'Ancient Greek mythology in modern lyrics',
    examples: [
      'Odyssey (Οδύσσεια) = Journey, adventure',
      'Aphrodite (Αφροδίτη) = Love, beauty',
      'Eros (Έρωτας) = Passionate love',
      'Hades (Άδης) = Darkness, underworld',
    ],
    usage: 'Greek culture naturally incorporates mythology',
  },

  {
    name: 'Alliteration (Greek)',
    type: 'structure',
    description: 'Repetition of consonant sounds in Greek',
    examples: [
      'Μάτια μου μαύρα (My black eyes)',
      'Καρδιά και κόσμος (Heart and world)',
      'Πόνος και πάθος (Pain and passion)',
    ],
    usage: 'Creates musicality in Greek lyrics',
  },

  {
    name: 'Greek Exclamations',
    type: 'structure',
    description: 'Traditional Greek emotional exclamations',
    examples: [
      'Αχ (Ah - pain/sorrow)',
      'Αμάν (Aman - Turkish-Greek exclamation of sorrow)',
      'Ωπά (Opa - celebration)',
      'Έλα (Ela - come on/expression)',
    ],
    usage: 'Essential for authentic Greek emotional expression',
  },

  {
    name: 'Ancient Greek Echoes',
    type: 'cultural',
    description: 'Modern Greek retains ancient Greek vocabulary and concepts',
    examples: [
      'Philosophical vocabulary',
      'Ancient concepts in modern context',
      'Classical imagery',
    ],
    usage: 'Greek lyrics naturally carry ancient cultural weight',
  },
];

// ==================== SINGING STYLES ====================

const greekSingingStyles: SingingStyle[] = [
  {
    id: 'rebetiko-style',
    name: 'Rebetiko',
    characteristics: ['Raw', 'Emotional', 'Melancholic', 'Working-class', 'Soulful'],
    vocalTechniques: ['Raw delivery', 'Greek blues style', 'Emotional expression', 'Urban Greek pronunciation'],
    emotionalDelivery: 'Raw, emotional, Greek blues, working-class soul, melancholic',
    culturalContext: 'Greek urban folk tradition',
    referenceArtists: ['Markos Vamvakaris', 'Vassilis Tsitsanis', 'Sotiria Bellou', 'Marika Ninou'],
    sunoStyleHints: [
      'rebetiko vocals',
      'Greek blues style',
      'raw emotional delivery',
      'melancholic Greek singing',
      'working-class authenticity',
    ],
  },

  {
    id: 'laiko-male',
    name: 'Laïkó Male',
    characteristics: ['Emotional', 'Powerful', 'Greek passion', 'Romantic', 'Popular'],
    vocalTechniques: ['Powerful Greek vocals', 'Emotional delivery', 'Popular style', 'Clear pronunciation'],
    emotionalDelivery: 'Emotional, powerful, romantic, Greek passion',
    culturalContext: 'Greek popular music',
    referenceArtists: ['Stelios Kazantzidis', 'Stratos Dionisiou', 'Tolis Voskopoulos'],
    sunoStyleHints: [
      'laïkó male vocals',
      'powerful Greek singing',
      'emotional delivery',
      'romantic style',
      'popular Greek',
    ],
  },

  {
    id: 'laiko-female',
    name: 'Laïkó Female',
    characteristics: ['Emotional', 'Powerful', 'Greek passion', 'Expressive', 'Soulful'],
    vocalTechniques: ['Powerful female vocals', 'Emotional expression', 'Greek soul', 'Popular style'],
    emotionalDelivery: 'Emotional, powerful, expressive, Greek female passion',
    culturalContext: 'Greek female popular tradition',
    referenceArtists: ['Marinella', 'Haris Alexiou', 'Glykeria', 'Vicky Leandros'],
    sunoStyleHints: [
      'laïkó female vocals',
      'powerful Greek female singing',
      'emotional delivery',
      'expressive style',
      'Greek soul',
    ],
  },

  {
    id: 'entehno-style',
    name: 'Entehno (Art Music)',
    characteristics: ['Sophisticated', 'Poetic', 'Intellectual', 'Classical influence', 'Literary'],
    vocalTechniques: ['Sophisticated delivery', 'Poetic phrasing', 'Classical influence', 'Literary Greek'],
    emotionalDelivery: 'Sophisticated, poetic, intellectual, classical Greek beauty',
    culturalContext: 'Greek art music tradition',
    referenceArtists: ['Mikis Theodorakis', 'Manos Hadjidakis', 'Maria Farantouri'],
    sunoStyleHints: [
      'entehno vocals',
      'sophisticated Greek singing',
      'poetic delivery',
      'classical influence',
      'intellectual style',
    ],
  },

  {
    id: 'island-folk',
    name: 'Island Folk (Nisiotika)',
    characteristics: ['Light', 'Festive', 'Coastal', 'Joyful', 'Traditional'],
    vocalTechniques: ['Light delivery', 'Festive tone', 'Island accent', 'Traditional Greek folk'],
    emotionalDelivery: 'Light, festive, joyful, coastal Greek atmosphere',
    culturalContext: 'Greek island music tradition',
    referenceArtists: ['Island folk singers', 'Traditional nisiotika artists'],
    sunoStyleHints: [
      'Greek island vocals',
      'festive island singing',
      'light delivery',
      'coastal Greek',
      'traditional folk',
    ],
  },

  {
    id: 'zeibekiko-style',
    name: 'Zeibekiko',
    characteristics: ['Masculine', 'Proud', 'Emotional intensity', 'Powerful', 'Greek male identity'],
    vocalTechniques: ['Powerful male delivery', 'Emotional intensity', 'Proud tone', 'Greek masculinity'],
    emotionalDelivery: 'Masculine, proud, emotional intensity, Greek male soul',
    culturalContext: 'Greek male dance and song tradition',
    referenceArtists: ['Zeibekiko specialists', 'Traditional Greek male singers'],
    sunoStyleHints: [
      'zeibekiko vocals',
      'masculine Greek singing',
      'powerful delivery',
      'emotional intensity',
      'proud style',
    ],
  },
];

// ==================== MUSICAL SCALES ====================

const greekMusicalScales: MusicalScale[] = [
  {
    id: 'greek-minor-harmonic',
    name: 'Greek Minor (Harmonic Minor)',
    type: 'minor',
    notes: ['E', 'F#', 'G', 'A', 'B', 'C', 'D#'],
    mood: 'Greek melancholy, rebetiko soul',
    culturalContext: 'THE rebetiko scale - Greek blues',
    emotionalEffect: 'Greek melancholy, sorrow, soul',
    usage: 'Essential for rebetiko and laïkó',
  },

  {
    id: 'phrygian-greek',
    name: 'Phrygian Mode (Greek)',
    type: 'modal',
    notes: ['E', 'F', 'G', 'A', 'B', 'C', 'D'],
    mood: 'Greek traditional, Byzantine echoes',
    culturalContext: 'Ancient Greek modes, Byzantine chant influence',
    emotionalEffect: 'Greek traditional character, ancient echoes',
    usage: 'Traditional Greek music, Byzantine influence',
  },

  {
    id: 'double-harmonic-greek',
    name: 'Double Harmonic Major (Greek/Turkish)',
    type: 'major',
    notes: ['C', 'Db', 'E', 'F', 'G', 'Ab', 'B'],
    mood: 'Exotic, Eastern Mediterranean',
    culturalContext: 'Greek-Turkish cultural exchange, rebetiko',
    emotionalEffect: 'Exotic, Eastern Mediterranean, Greek-Turkish fusion',
    usage: 'Rebetiko, Greek folk with Eastern influence',
  },

  {
    id: 'hijaz-greek',
    name: 'Hijaz Maqam (Greek/Turkish)',
    type: 'maqam',
    notes: ['D', 'Eb', 'F#', 'G', 'A', 'Bb', 'C'],
    mood: 'Eastern Mediterranean, passionate',
    culturalContext: 'Greek-Turkish musical fusion',
    emotionalEffect: 'Passionate, Eastern Mediterranean character',
    usage: 'Rebetiko, Greek music with Ottoman influence',
  },

  {
    id: 'byzantine-modes',
    name: 'Byzantine Modes (Echoi)',
    type: 'modal',
    notes: ['Eight Byzantine modes'],
    mood: 'Sacred, ancient Greek, spiritual',
    culturalContext: 'Greek Orthodox Church music',
    emotionalEffect: 'Sacred, spiritual, ancient Greek tradition',
    usage: 'Byzantine chant, religious Greek music',
  },
];

// ==================== LYRIC EXAMPLES ====================

const greekLyricExamples: LyricExample[] = [
  // AUTHENTIC REBETIKO
  {
    type: 'authentic',
    text: 'Φραγκοσυριανή μικρή / Πού \'χεις το μαγαζί / Κι όταν περνώ απ\' τα μπαλκόνια σου / Τα όμορφα μαλλιά σου / Με τυλίγουνε γύρω μου',
    explanation: 'Classic rebetiko (Markos Vamvakaris). Working-class Greek. Natural Greek phrasing. "Franco-Syrian girl".',
    context: 'Classic Rebetiko',
  },

  {
    type: 'authentic',
    text: 'Μάγκα μου μωρέ / Τί \'ναι τούτο που κρατείς / Φουστανέλα κι όλα μαύρα / Φουστανέλα κι όλα μαύρα',
    explanation: 'Rebetiko. "Μάγκας" (mangas - tough guy). Black clothes theme. Repetition for emphasis.',
    context: 'Rebetiko (Urban Folk)',
  },

  // AUTHENTIC LAÏKÓ
  {
    type: 'authentic',
    text: 'Η αγάπη θέλει δύο / Δύο καρδιές που χτυπούν μαζί / Μα εσύ μ\' άφησες μόνο / Και πονάω κάθε βράδυ',
    explanation: 'Laïkó. "Love needs two". Natural Greek. "Two hearts beating together". Romantic pain theme.',
    context: 'Laïkó (Popular Music)',
  },

  {
    type: 'authentic',
    text: 'Έλα να με βρεις απόψε / Στο παλιό μας το στέκι / Να σου πω πόσο σ\' αγαπώ / Και πόσο μου λείπεις',
    explanation: 'Modern laïkó. "Come find me tonight". "Our old hangout". Natural Greek phrasing. Missing someone.',
    context: 'Modern Laïkó',
  },

  // AUTHENTIC ENTEHNO
  {
    type: 'authentic',
    text: 'Στο περιγιάλι το κρυφό / Κι άσπρο σαν περιστέρι / Διψάσαμε το μεσημέρι / Μα το νερό ήταν αλμυρό',
    explanation: 'Entehno (Odysseas Elytis poetry). Sophisticated Greek. Poetic imagery. "On the secret seashore".',
    context: 'Entehno (Art Music)',
  },

  // AUTHENTIC ISLAND MUSIC
  {
    type: 'authentic',
    text: 'Στο νησί μου το μικρό / Με την άσπρη αμμουδιά / Περιμένω κάθε μέρα / Το καράβι που θα \'ρθει',
    explanation: 'Island music. "On my small island". White sand beach. Waiting for the ship. Coastal Greek.',
    context: 'Nisiotika (Island Music)',
  },

  // AUTHENTIC ZEIBEKIKO
  {
    type: 'authentic',
    text: 'Εγώ είμαι ο ρεμπέτης / Που χορεύω μόνος μου / Με τον πόνο και τη λύπη / Στο ζεϊμπέκικό μου',
    explanation: 'Zeibekiko. "I am the rebetis who dances alone". Pain and sorrow. Solo male dance theme.',
    context: 'Zeibekiko',
  },

  // BAD EXAMPLES (AVOID)
  {
    type: 'avoid',
    text: 'Μπέιμπι μπέιμπι ουού / Είσαι η ηλιοφάνεια μου / Σ\' αγαπώ τόσο πολύ / Η καρδιά μου φλέγεται',
    explanation: 'Direct English translation. "Baby baby ooh". "My sunshine" unnatural. "Heart burning" forced.',
    context: 'AVOID - Translated English clichés',
  },

  {
    type: 'avoid',
    text: 'Σήκω τα χέρια ψηλά / DJ παίξε δυνατά / Χόρεψε όλη τη νύχτα / Πάρτι μέχρι το πρωί',
    explanation: 'Generic club clichés. "Hands up", "DJ play loud". No Greek cultural authenticity.',
    context: 'AVOID - Generic party lyrics',
  },

  // REFERENCE (CLASSIC STYLES)
  {
    type: 'reference',
    text: 'Του Βοτσαλακιού / Τα πόδια πατούσαν στο βοτσαλάκι / Κι άκουγε το κύμα της θάλασσας / Να την τραγουδά',
    explanation: 'Classic Greek song structure. Pebbles under feet. Sound of waves. Natural Greek imagery.',
    context: 'Classic Greek Pop reference',
  },

  {
    type: 'reference',
    text: 'Συννεφιασμένη Κυριακή / Με λύπη στην καρδιά / Μοιάζει με τρελή / Που δε θα ξημερώσει ποτέ',
    explanation: 'Classic laïkó (Vassilis Tsitsanis). "Cloudy Sunday". Sadness in heart. Natural Greek melancholy.',
    context: 'Laïkó reference (Tsitsanis)',
  },
];

// ==================== GREEK LANGUAGE CONFIG ====================

export const greekConfig: LanguageConfig = {
  id: 'greek',
  name: 'Greek',
  nativeName: 'Ελληνικά',
  tier: 'tier2',
  
  scripts: ['Greek (Ελληνικό αλφάβητο)'],
  
  dialects: [
    'Standard Modern Greek',
    'Athenian',
    'Cretan',
    'Island dialects (Nisiotika)',
    'Cypriot Greek',
  ],
  
  musicalTraditions: greekMusicalTraditions,
  poeticDevices: greekPoeticDevices,
  singingStyles: greekSingingStyles,
  musicalScales: greekMusicalScales,
  
  commonInstruments: [
    'Bouzouki (Μπουζούκι)',
    'Baglamas (Μπαγλαμάς)',
    'Lyra (Λύρα)',
    'Laouto (Λαούτο)',
    'Clarinet (Κλαρίνο)',
    'Santouri (Σαντούρι)',
    'Accordion',
    'Guitar',
    'Violin',
  ],
  
  culturalThemes: [
    'Κέφι (Kefi - Joy/passion)',
    'Μεράκι (Merak - Soul/passion in creation)',
    'Θάλασσα (Sea)',
    'Νησί (Island)',
    'Έρωτας (Love)',
    'Πόνος (Pain)',
    'Μάγκας (Mangas - Street-smart tough guy)',
    'Ελλάδα (Greece/Greek identity)',
    'Πατρίδα (Homeland)',
    'Ελευθερία (Freedom)',
  ],
  
  lyricExamples: greekLyricExamples,
  
  enabled: true,
};

// ==================== GREEK SONG STRUCTURES ====================

export const greekSongStructures = {
  rebetiko: {
    classic: ['intro', 'verse1', 'instrumental', 'verse2', 'instrumental', 'verse3'],
    piraeus: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'instrumental', 'chorus'],
  },
  
  laiko: {
    classic: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus'],
    modern: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'pre-chorus', 'chorus', 'bridge', 'chorus'],
  },
  
  entehno: {
    art: ['intro', 'verse1', 'verse2', 'chorus', 'verse3', 'chorus', 'outro'],
  },
  
  island: {
    nisiotika: ['intro', 'verse1', 'chorus', 'instrumental', 'verse2', 'chorus', 'outro'],
  },
  
  zeibekiko: {
    traditional: ['intro', 'verse1', 'instrumental', 'verse2', 'instrumental', 'outro'],
  },
};

// ==================== CULTURAL NOTES ====================

export const greekCulturalNotes = {
  rebetiko: 'Rebetiko is THE Greek blues. Working-class, outcasts, suffering. Bouzouki essential. Minor keys.',
  kefi: 'Κέφι (Kefi) is essential Greek concept - joy, passion, high spirits. Must understand for Greek music.',
  merak: 'Μεράκι (Merak) - doing something with soul and passion. Essential Greek cultural concept.',
  bouzouki: 'Bouzouki is THE Greek instrument. Central to rebetiko and laïkó.',
  
  language: {
    alphabet: 'Greek uses Greek alphabet (Ελληνικό αλφάβητο) - different from Latin.',
    pronunciation: 'Greek pronunciation is distinct. Clear vowels. Stress matters.',
    ancient: 'Modern Greek carries weight of ancient Greek culture and philosophy.',
  },
  
  avoidances: [
    'Don\'t translate English idioms - they sound unnatural in Greek',
    'Don\'t ignore minor keys - Greek music loves melancholy',
    'Don\'t forget kefi and merak concepts - they\'re essential',
    'Rebetiko requires authenticity - working class, suffering, bouzouki',
    'Greek music is deeply emotional - understatement doesn\'t work',
  ],
};

// ==================== EXPORT ====================

export default greekConfig;
