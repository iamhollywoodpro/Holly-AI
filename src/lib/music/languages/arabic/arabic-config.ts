/**
 * HOLLY - Arabic Language Configuration (TIER 3)
 * Maqam System, Khaleeji, Shaabi Integration
 * 
 * Complete cultural and musical context for authentic Arabic songwriting
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

const arabicMusicalTraditions: MusicalTradition[] = [
  // Classical Arabic
  {
    id: 'arabic-classical',
    name: 'Arabic Classical Music',
    category: 'classical',
    description: 'Traditional Arabic classical music - maqam-based, sophisticated',
    characteristics: [
      'Maqam system',
      'Taqasim (improvisation)',
      'Quarter tones',
      'Sophisticated arrangements',
      'Classical Arabic poetry',
      'Traditional instruments',
    ],
    typicalInstruments: ['Oud (عود)', 'Qanun (قانون)', 'Ney (ناي)', 'Riq', 'Tabla', 'Violin'],
    vocaStyleGuidance: 'Classical Arabic vocals, maqam adherence, ornamental style, quarter tones, traditional delivery',
  },

  // Tarab
  {
    id: 'tarab',
    name: 'Tarab (طرب)',
    category: 'traditional',
    description: 'Arabic musical ecstasy - emotional, transcendent',
    characteristics: [
      'Emotional ecstasy (tarab)',
      'Umm Kulthum tradition',
      'Long-form compositions',
      'Maqam-based',
      'Orchestral arrangements',
      'Poetic lyrics',
    ],
    typicalInstruments: ['Oud', 'Qanun', 'Violin', 'Ney', 'Orchestra', 'Tabla'],
    vocaStyleGuidance: 'Tarab vocals, emotional ecstasy, ornamental Arabic, maqam adherence, transcendent delivery',
  },

  // Khaleeji (Gulf)
  {
    id: 'khaleeji',
    name: 'Khaleeji (خليجي)',
    category: 'folk',
    description: 'Gulf Arab music - rhythmic, festive, regional identity',
    characteristics: [
      'Gulf Arab identity',
      'Rhythmic patterns',
      'Traditional dance music',
      'Pearl diving themes',
      'Desert imagery',
      'Festive atmosphere',
    ],
    typicalInstruments: ['Oud', 'Tabla', 'Mirwas', 'Drums', 'Synthesizers (modern)'],
    vocaStyleGuidance: 'Khaleeji vocals, Gulf Arabic accent, rhythmic delivery, traditional Gulf style, festive',
  },

  // Shaabi (Popular)
  {
    id: 'shaabi',
    name: 'Shaabi (شعبي)',
    category: 'folk',
    description: 'Egyptian popular music - working class, street',
    characteristics: [
      'Working class themes',
      'Egyptian street music',
      'Accordion prominent',
      'Dance-oriented',
      'Accessible melodies',
      'Cairo culture',
    ],
    typicalInstruments: ['Accordion', 'Tabla', 'Mizmar', 'Oud', 'Synthesizers'],
    vocaStyleGuidance: 'Shaabi vocals, Egyptian colloquial Arabic, street style, working class authenticity, energetic',
  },

  // Levantine Pop
  {
    id: 'levantine-pop',
    name: 'Levantine Pop',
    category: 'modern',
    description: 'Modern Levantine pop - Lebanon, Syria, Jordan',
    characteristics: [
      'Modern production',
      'Western influences',
      'Levantine Arabic',
      'Romantic themes',
      'Catchy melodies',
      'International appeal',
    ],
    typicalInstruments: ['Modern production', 'Oud', 'Synthesizers', 'Electronic beats', 'Guitar'],
    vocaStyleGuidance: 'Modern Levantine vocals, pop delivery, Western-influenced, romantic Arabic, accessible',
  },

  // Mahraganat (Electro Chaabi)
  {
    id: 'mahraganat',
    name: 'Mahraganat (مهرجانات)',
    category: 'modern',
    description: 'Egyptian electro chaabi - electronic, youth culture',
    characteristics: [
      'Electronic production',
      'Auto-tuned vocals',
      'Youth culture',
      'Egyptian slang',
      'Fast-paced',
      'Street culture',
    ],
    typicalInstruments: ['Electronic production', 'Synthesizers', 'Electronic beats', 'Auto-tune'],
    vocaStyleGuidance: 'Mahraganat vocals, auto-tuned, Egyptian slang, fast delivery, youth culture, electronic style',
  },

  // Muwashshah
  {
    id: 'muwashshah',
    name: 'Muwashshah (موشح)',
    category: 'classical',
    description: 'Andalusian Arabic poetic song form',
    characteristics: [
      'Andalusian tradition',
      'Complex poetry',
      'Sophisticated structure',
      'Multiple maqam modulations',
      'Classical Arabic',
      'Literary sophistication',
    ],
    typicalInstruments: ['Oud', 'Qanun', 'Violin', 'Ney', 'Riq'],
    vocaStyleGuidance: 'Muwashshah vocals, Andalusian style, classical Arabic, sophisticated delivery, poetic',
  },

  // Dabke Music
  {
    id: 'dabke',
    name: 'Dabke (دبكة)',
    category: 'folk',
    description: 'Levantine line dance music',
    characteristics: [
      'Folk dance accompaniment',
      'Rhythmic, energetic',
      'Levantine tradition',
      'Wedding/celebration music',
      'Group participation',
      'Festive atmosphere',
    ],
    typicalInstruments: ['Mijwiz', 'Darbuka', 'Zurna', 'Oud', 'Synthesizers'],
    vocaStyleGuidance: 'Dabke vocals, energetic Levantine Arabic, festive delivery, dance-oriented, celebratory',
  },

  // North African (Maghreb)
  {
    id: 'raï',
    name: 'Raï (راي)',
    category: 'folk',
    description: 'Algerian popular music - rebellious, passionate',
    characteristics: [
      'Algerian origins',
      'Rebellious themes',
      'Passionate delivery',
      'Maghrebi Arabic',
      'Modern production',
      'International influence',
    ],
    typicalInstruments: ['Synthesizers', 'Darbouka', 'Violin', 'Accordion', 'Electric guitar'],
    vocaStyleGuidance: 'Raï vocals, Algerian Arabic, passionate delivery, rebellious style, energetic',
  },

  // Modern Arabic Pop
  {
    id: 'arabic-pop-modern',
    name: 'Modern Arabic Pop',
    category: 'modern',
    description: 'Contemporary pan-Arab pop music',
    characteristics: [
      'Modern production',
      'Pan-Arab appeal',
      'Western influences',
      'Romantic themes',
      'Music video culture',
      'Rotana style',
    ],
    typicalInstruments: ['Modern production', 'Synthesizers', 'Electronic beats', 'Oud', 'Traditional elements'],
    vocaStyleGuidance: 'Modern Arabic pop vocals, pan-Arab style, Western-influenced, romantic delivery, accessible',
  },
];

// ==================== POETIC DEVICES ====================

const arabicPoeticDevices: PoeticDevice[] = [
  {
    name: 'Tarab (طرب)',
    type: 'cultural',
    description: 'Musical ecstasy, emotional enchantment, transcendence through music',
    examples: [
      'State of emotional ecstasy',
      'Musical rapture',
      'Transcendence through song',
    ],
    usage: 'ESSENTIAL Arabic musical concept - emotional transcendence',
  },

  {
    name: 'Maqam System (مقام)',
    type: 'musical',
    description: 'Arabic modal system - not just scales, but melodic frameworks',
    examples: [
      'Maqam Bayati (بياتي)',
      'Maqam Rast (راست)',
      'Maqam Hijaz (حجاز)',
      'Maqam Saba (صبا)',
    ],
    usage: 'Foundation of Arabic music - quarter tones, modal system',
  },

  {
    name: 'Classical Arabic Poetry',
    type: 'structure',
    description: 'Ancient poetic traditions in modern music',
    examples: [
      'Qasida (قصيدة) form',
      'Classical meters',
      'Sophisticated vocabulary',
      'Literary references',
    ],
    usage: 'Classical Arabic music uses sophisticated poetic forms',
  },

  {
    name: 'Arabic Nature Imagery',
    type: 'metaphor',
    description: 'Desert, moon, and nature in Arabic poetry',
    examples: [
      'قمر (Qamar - Moon) = Beauty, beloved',
      'صحراء (Sahra - Desert) = Loneliness, vastness',
      'نجوم (Nujum - Stars) = Hope, guidance',
      'بحر (Bahr - Sea) = Freedom, depth',
      'ورد (Ward - Rose) = Love, beauty',
    ],
    usage: 'Essential for authentic Arabic lyrics',
  },

  {
    name: 'Ghazal (غزل)',
    type: 'cultural',
    description: 'Arabic love poetry tradition',
    examples: [
      'Romantic longing',
      'Unrequited love',
      'Beauty of beloved',
      'Passionate expression',
    ],
    usage: 'Central theme in Arabic romantic music',
  },

  {
    name: 'Repetition (Takrar)',
    type: 'structure',
    description: 'Emotional emphasis through repetition',
    examples: [
      'حبيبي حبيبي حبيبي (Habibi habibi habibi)',
      'يا ليل يا ليل (Ya layl ya layl)',
      'Emotional intensification',
    ],
    usage: 'Very common in Arabic music for emphasis',
  },

  {
    name: 'Ya (يا) Vocative',
    type: 'structure',
    description: 'Arabic vocative particle - emotional calling',
    examples: [
      'يا حبيبي (Ya habibi - O my beloved)',
      'يا ليل (Ya layl - O night)',
      'يا عمري (Ya omri - O my life)',
    ],
    usage: 'Essential Arabic emotional expression',
  },

  {
    name: 'Arabic Rhyme Schemes',
    type: 'rhyme',
    description: 'Complex rhyming in Arabic poetry and song',
    examples: [
      'Root-based rhyming',
      'Internal rhymes',
      'Classical meters',
    ],
    usage: 'Arabic is extremely rich in rhyming possibilities',
  },

  {
    name: 'Colloquial vs. Classical',
    type: 'cultural',
    description: 'Code-switching between formal and colloquial Arabic',
    examples: [
      'Classical Arabic (Fusha) for sophistication',
      'Colloquial (Ammiya) for authenticity',
      'Regional dialects for identity',
    ],
    usage: 'Choice of Arabic level affects song style and audience',
  },
];

// ==================== SINGING STYLES ====================

const arabicSingingStyles: SingingStyle[] = [
  {
    id: 'tarab-classical',
    name: 'Tarab (Classical)',
    characteristics: ['Emotional', 'Ornamental', 'Maqam-based', 'Quarter tones', 'Transcendent'],
    vocalTechniques: ['Ornamental style', 'Quarter tones', 'Maqam adherence', 'Melisma', 'Emotional expression'],
    emotionalDelivery: 'Emotional ecstasy (tarab), transcendent, ornamental, classical Arabic beauty',
    culturalContext: 'Arabic classical tradition',
    referenceArtists: ['Umm Kulthum', 'Fairuz', 'Abdel Halim Hafez', 'Warda Al-Jazairia'],
    sunoStyleHints: [
      'tarab vocals',
      'classical Arabic singing',
      'ornamental style',
      'emotional ecstasy',
      'maqam-based',
    ],
  },

  {
    id: 'khaleeji-traditional',
    name: 'Khaleeji',
    characteristics: ['Rhythmic', 'Gulf accent', 'Traditional', 'Festive', 'Regional'],
    vocalTechniques: ['Gulf Arabic pronunciation', 'Rhythmic delivery', 'Traditional style', 'Festive tone'],
    emotionalDelivery: 'Festive, rhythmic, Gulf Arab identity, traditional celebration',
    culturalContext: 'Gulf Arab music tradition',
    referenceArtists: ['Abdulmajeed Abdullah', 'Rashid Al-Majid', 'Nabeel Shuail'],
    sunoStyleHints: [
      'khaleeji vocals',
      'Gulf Arabic singing',
      'traditional style',
      'rhythmic delivery',
      'festive',
    ],
  },

  {
    id: 'shaabi-egyptian',
    name: 'Shaabi (Egyptian)',
    characteristics: ['Energetic', 'Street style', 'Egyptian colloquial', 'Working class', 'Authentic'],
    vocalTechniques: ['Egyptian colloquial Arabic', 'Street style', 'Energetic delivery', 'Working class authenticity'],
    emotionalDelivery: 'Energetic, street authenticity, Egyptian working class, celebratory',
    culturalContext: 'Egyptian popular music',
    referenceArtists: ['Hakim', 'Saad El Soghayar', 'Ahmed Adaweyah'],
    sunoStyleHints: [
      'shaabi vocals',
      'Egyptian street style',
      'colloquial Arabic',
      'energetic delivery',
      'working class',
    ],
  },

  {
    id: 'levantine-pop-modern',
    name: 'Levantine Pop',
    characteristics: ['Modern', 'Romantic', 'Levantine accent', 'Western influence', 'Accessible'],
    vocalTechniques: ['Modern Arabic vocals', 'Levantine pronunciation', 'Pop delivery', 'Western influence'],
    emotionalDelivery: 'Modern, romantic, accessible, Levantine charm, pop sensibility',
    culturalContext: 'Lebanese/Levantine pop music',
    referenceArtists: ['Nancy Ajram', 'Elissa', 'Ragheb Alama', 'Amr Diab'],
    sunoStyleHints: [
      'Levantine pop vocals',
      'modern Arabic singing',
      'romantic delivery',
      'Western-influenced',
      'accessible',
    ],
  },

  {
    id: 'mahraganat-electro',
    name: 'Mahraganat',
    characteristics: ['Auto-tuned', 'Electronic', 'Fast-paced', 'Youth culture', 'Egyptian slang'],
    vocalTechniques: ['Auto-tuned vocals', 'Fast delivery', 'Egyptian slang', 'Electronic style', 'Youth attitude'],
    emotionalDelivery: 'High energy, youth culture, street attitude, electronic style, modern',
    culturalContext: 'Egyptian youth electronic music',
    referenceArtists: ['Oka and Ortega', 'Fifty Cent (Egyptian)', 'Wegz'],
    sunoStyleHints: [
      'mahraganat vocals',
      'auto-tuned Egyptian',
      'electronic style',
      'youth culture',
      'fast delivery',
    ],
  },

  {
    id: 'muwashshah-andalusian',
    name: 'Muwashshah',
    characteristics: ['Sophisticated', 'Andalusian', 'Poetic', 'Classical', 'Complex'],
    vocalTechniques: ['Andalusian style', 'Classical Arabic', 'Sophisticated delivery', 'Poetic phrasing', 'Maqam modulations'],
    emotionalDelivery: 'Sophisticated, poetic, Andalusian beauty, classical refinement',
    culturalContext: 'Andalusian Arabic tradition',
    referenceArtists: ['Sabah Fakhri', 'Fairuz (Muwashshah)', 'Classical ensembles'],
    sunoStyleHints: [
      'muwashshah vocals',
      'Andalusian style',
      'sophisticated Arabic',
      'poetic delivery',
      'classical',
    ],
  },
];

// ==================== MUSICAL SCALES (MAQAMAT) ====================

const arabicMusicalScales: MusicalScale[] = [
  {
    id: 'maqam-bayati',
    name: 'Maqam Bayati (بياتي)',
    type: 'maqam',
    notes: ['D', 'E♭', 'F', 'G', 'A', 'B♭', 'C'],
    mood: 'Melancholic, introspective',
    culturalContext: 'One of most common Arabic maqamat',
    emotionalEffect: 'Melancholic, introspective, emotional depth',
    usage: 'Very common in Arabic music, emotional songs',
  },

  {
    id: 'maqam-rast',
    name: 'Maqam Rast (راست)',
    type: 'maqam',
    notes: ['C', 'D', 'E♭', 'F', 'G', 'A', 'B♭'],
    mood: 'Joyful, bright, celebratory',
    culturalContext: 'Fundamental Arabic maqam',
    emotionalEffect: 'Joyful, bright, optimistic',
    usage: 'Happy Arabic songs, celebrations',
  },

  {
    id: 'maqam-hijaz',
    name: 'Maqam Hijaz (حجاز)',
    type: 'maqam',
    notes: ['D', 'E♭', 'F#', 'G', 'A', 'B♭', 'C'],
    mood: 'Spiritual, passionate, dramatic',
    culturalContext: 'Named after Hijaz region (Saudi Arabia)',
    emotionalEffect: 'Spiritual, passionate, dramatic',
    usage: 'Spiritual Arabic music, dramatic songs',
  },

  {
    id: 'maqam-saba',
    name: 'Maqam Saba (صبا)',
    type: 'maqam',
    notes: ['D', 'E♭', 'F', 'G♭', 'A♭', 'B♭', 'C'],
    mood: 'Deep sadness, longing',
    culturalContext: 'Most melancholic Arabic maqam',
    emotionalEffect: 'Deep sadness, longing, heartbreak',
    usage: 'Sad Arabic songs, heartbreak themes',
  },

  {
    id: 'maqam-nahawand',
    name: 'Maqam Nahawand (نهاوند)',
    type: 'maqam',
    notes: ['C', 'D', 'E♭', 'F', 'G', 'A♭', 'B'],
    mood: 'Melancholic, gentle',
    culturalContext: 'Similar to Western minor scale',
    emotionalEffect: 'Melancholic, gentle sadness',
    usage: 'Melancholic Arabic songs, romantic ballads',
  },
];

// ==================== LYRIC EXAMPLES ====================

const arabicLyricExamples: LyricExample[] = [
  // AUTHENTIC CLASSICAL TARAB
  {
    type: 'authentic',
    text: 'يا حبيبي يا حبيبي / قلبي معاك في كل مكان / أنت عمري وأنت حياتي / يا نور عيني',
    explanation: 'Classical tarab. "Ya habibi" (O my beloved). "My heart is with you everywhere". Classical Arabic emotional.',
    context: 'Classical Arabic Tarab',
  },

  {
    type: 'authentic',
    text: 'سهران لوحدي والليل طويل / والقمر يحكي عن حبي الجميل / يا ليل يا عين / متى يجيني الصبح',
    explanation: 'Tarab style. "Awake alone, the night is long". Moon imagery. "Ya layl ya ein" (O night, O eye). Poetic.',
    context: 'Classical Arabic Romantic',
  },

  // AUTHENTIC KHALEEJI
  {
    type: 'authentic',
    text: 'يا بحر يا بحر / شو في سرك يا بحر / اللؤلؤ والمرجان / من قاع البحر',
    explanation: 'Khaleeji style. "Ya bahr" (O sea). Pearl diving reference. Gulf Arab imagery. Traditional themes.',
    context: 'Khaleeji (Gulf)',
  },

  // AUTHENTIC SHAABI
  {
    type: 'authentic',
    text: 'يلا يلا يا عالم / هاتوا المزيكا / النهاردة عيد / ورقص ودقة',
    explanation: 'Egyptian shaabi. "Yalla yalla" (Come on). "Bring the music". Colloquial Egyptian. Street celebration.',
    context: 'Egyptian Shaabi',
  },

  // AUTHENTIC LEVANTINE POP
  {
    type: 'authentic',
    text: 'حبيتك من أول نظرة / قلبي صار إلك / ما بقدر عيش بدونك / انت حياتي كلها',
    explanation: 'Levantine pop. "Loved you at first sight". "My heart became yours". Modern romantic Arabic. Accessible.',
    context: 'Levantine Pop',
  },

  // AUTHENTIC MAHRAGANAT
  {
    type: 'authentic',
    text: 'دوس يا معلم دوس / الليلة احنا ملوك / صوت عالي وموسيقى / والدنيا كلها بتشوف',
    explanation: 'Mahraganat. Egyptian slang. "Press it master press". Electronic vibe. Youth culture. Fast-paced.',
    context: 'Mahraganat (Electro Chaabi)',
  },

  // AUTHENTIC MUWASHSHAH
  {
    type: 'authentic',
    text: 'جادك الغيث إذا الغيث همى / يا زمان الوصل بالأندلس / لم يكن وصلك إلا حلما / في الكرى أو خلسة المختلس',
    explanation: 'Classical muwashshah. Sophisticated classical Arabic. Andalusian tradition. Complex poetic structure.',
    context: 'Muwashshah (Andalusian)',
  },

  // BAD EXAMPLES (AVOID)
  {
    type: 'avoid',
    text: 'بيبي بيبي أوه / أنت شمسي المشرقة / أحبك كثيراً جداً / قلبي يحترق',
    explanation: 'Direct English translation. "Baby baby oh". "My shining sun" unnatural. "Heart burning" forced.',
    context: 'AVOID - Translated English clichés',
  },

  {
    type: 'avoid',
    text: 'ارفع يديك / دي جي اعلى الصوت / نرقص طول الليل / حفلة حتى الصباح',
    explanation: 'Generic club clichés. "Raise hands", "DJ louder". No Arabic cultural depth. Sounds translated.',
    context: 'AVOID - Generic party lyrics',
  },

  // REFERENCE (CLASSIC STYLES)
  {
    type: 'reference',
    text: 'إنت عمري اللي ابتدا بنورك صباحه / عمري اللي ابتدا بنورك صباحه',
    explanation: 'Umm Kulthum classic. "You are my life that began with your light its morning". Iconic Arabic tarab.',
    context: 'Tarab reference (Umm Kulthum)',
  },

  {
    type: 'reference',
    text: 'هبيني يا هوى / خذني معاك وطير / بعيد بعيد / لمكان ما في غيرنا',
    explanation: 'Fairuz style. "Love me, O love". "Take me with you and fly". Lebanese/Levantine poetic romance.',
    context: 'Levantine reference (Fairuz)',
  },
];

// ==================== ARABIC LANGUAGE CONFIG ====================

export const arabicConfig: LanguageConfig = {
  id: 'arabic',
  name: 'Arabic',
  nativeName: 'العربية',
  tier: 'tier3',
  
  scripts: ['Arabic (العربية)', 'Romanization (Latin)'],
  
  dialects: [
    'Classical Arabic (الفصحى)',
    'Egyptian Arabic (مصري)',
    'Levantine Arabic (شامي)',
    'Gulf Arabic (خليجي)',
    'Maghrebi Arabic (مغربي)',
  ],
  
  musicalTraditions: arabicMusicalTraditions,
  poeticDevices: arabicPoeticDevices,
  singingStyles: arabicSingingStyles,
  musicalScales: arabicMusicalScales,
  
  commonInstruments: [
    'Oud (عود)',
    'Qanun (قانون)',
    'Ney (ناي)',
    'Riq',
    'Tabla',
    'Darbuka',
    'Violin',
    'Accordion',
    'Synthesizers',
    'Electronic production',
  ],
  
  culturalThemes: [
    'Tarab (طرب) - Musical ecstasy',
    'Ghazal (غزل) - Love poetry',
    'Qamar (قمر) - Moon',
    'Layl (ليل) - Night',
    'Bahr (بحر) - Sea',
    'Sahra (صحراء) - Desert',
    'Hubb (حب) - Love',
    'Habibi (حبيبي) - My beloved',
    'Omri (عمري) - My life',
    'Shawq (شوق) - Longing',
  ],
  
  lyricExamples: arabicLyricExamples,
  
  enabled: true,
};

// ==================== ARABIC SONG STRUCTURES ====================

export const arabicSongStructures = {
  classical: {
    tarab: ['taqasim', 'verse1', 'instrumental', 'verse2', 'layali', 'verse3', 'finale'],
    muwashshah: ['intro', 'khana1', 'taslim', 'khana2', 'taslim', 'khana3', 'taslim'],
  },
  
  modern: {
    pop: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus', 'outro'],
    khaleeji: ['intro', 'verse1', 'chorus', 'instrumental', 'verse2', 'chorus', 'outro'],
  },
  
  shaabi: {
    egyptian: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'instrumental', 'chorus'],
  },
  
  mahraganat: {
    electro: ['intro', 'verse1', 'drop', 'verse2', 'drop', 'bridge', 'drop', 'outro'],
  },
};

// ==================== CULTURAL NOTES ====================

export const arabicCulturalNotes = {
  tarab: 'Tarab (طرب) is THE essential Arabic musical concept - emotional ecstasy, transcendence through music.',
  maqam: 'Maqam system is foundation of Arabic music - quarter tones, modal frameworks, not just scales.',
  quarterTones: 'Arabic music uses quarter tones - microtonal intervals essential for authenticity.',
  dialects: 'Arabic has huge dialectical variation - Egyptian, Levantine, Gulf, Maghrebi all sound different.',
  
  language: {
    classical: 'Classical Arabic (Fusha) for sophistication and poetry.',
    colloquial: 'Colloquial (Ammiya) for authenticity and accessibility.',
    regional: 'Regional dialects essential for local identity.',
    script: 'Arabic is written right-to-left in Arabic script.',
  },
  
  avoidances: [
    'Don\'t ignore maqam system - quarter tones are essential',
    'Don\'t translate English idioms - they sound unnatural',
    'Don\'t forget tarab concept - emotional ecstasy is core',
    'Classical vs. colloquial Arabic choice affects entire song',
    'Regional dialects matter - Egyptian sounds different from Levantine',
  ],
};

// ==================== EXPORT ====================

export default arabicConfig;
