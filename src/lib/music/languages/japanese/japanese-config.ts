/**
 * HOLLY - Japanese Language Configuration (TIER 3)
 * J-Pop, Enka, City Pop Integration
 * 
 * Complete cultural and musical context for authentic Japanese songwriting
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

const japaneseMusicalTraditions: MusicalTradition[] = [
  // J-Pop
  {
    id: 'jpop-mainstream',
    name: 'J-Pop (Mainstream)',
    category: 'modern',
    description: 'Contemporary Japanese pop music - catchy, polished, idol culture',
    characteristics: [
      'Catchy melodies',
      'Polished production',
      'Idol culture influence',
      'Anime/manga tie-ins',
      'High energy',
      'Youth-oriented',
    ],
    typicalInstruments: ['Synthesizers', 'Electronic beats', 'Guitar', 'Bass', 'Drums', 'Strings'],
    vocaStyleGuidance: 'Bright, cute (kawaii), energetic, clear Japanese pronunciation, idol-style delivery, youthful',
  },

  {
    id: 'jpop-ballad',
    name: 'J-Pop Ballad',
    category: 'modern',
    description: 'Emotional Japanese pop ballads',
    characteristics: [
      'Emotional delivery',
      'Piano/strings prominent',
      'Love and loss themes',
      'Dramatic vocals',
      'TV drama tie-ins',
      'Sophisticated arrangements',
    ],
    typicalInstruments: ['Piano', 'Strings', 'Acoustic Guitar', 'Soft drums'],
    vocaStyleGuidance: 'Emotional, powerful, Japanese ballad style, clear diction, dramatic delivery',
  },

  // Enka
  {
    id: 'enka-traditional',
    name: 'Enka (Traditional)',
    category: 'traditional',
    description: 'Traditional Japanese popular music - soul and nostalgia',
    characteristics: [
      'Traditional Japanese soul',
      'Nostalgia (natsukashii)',
      'Kobushi vocal technique',
      'Pentatonic scales',
      'Older generation appeal',
      'Japanese cultural themes',
    ],
    typicalInstruments: ['Shamisen', 'Shakuhachi', 'Koto', 'Strings', 'Traditional drums'],
    vocaStyleGuidance: 'Traditional Japanese vocals, kobushi technique, emotional depth, nostalgic delivery, classical pronunciation',
  },

  {
    id: 'enka-modern',
    name: 'Enka (Modern)',
    category: 'traditional',
    description: 'Modern enka with contemporary production',
    characteristics: [
      'Traditional enka roots',
      'Modern production',
      'Accessible to younger audiences',
      'Kobushi technique maintained',
      'Orchestral arrangements',
    ],
    typicalInstruments: ['Orchestra', 'Modern production', 'Traditional instruments mixed'],
    vocaStyleGuidance: 'Modern enka style, kobushi technique, emotional but accessible, clear Japanese',
  },

  // City Pop
  {
    id: 'city-pop-80s',
    name: 'City Pop (80s)',
    category: 'modern',
    description: 'Japanese 80s urban pop - sophisticated, jazzy, nostalgic',
    characteristics: [
      'Sophisticated production',
      'Jazz/funk influence',
      'Urban Tokyo lifestyle',
      'Nostalgia for 80s Japan',
      'English mixing',
      'International appeal',
    ],
    typicalInstruments: ['Synthesizers', 'Electric Guitar', 'Bass', 'Drums', 'Saxophones', 'Keys'],
    vocaStyleGuidance: 'Smooth, sophisticated, 80s Japanese vocals, jazzy delivery, urban cool, English mixing',
  },

  {
    id: 'city-pop-modern',
    name: 'City Pop (Modern Revival)',
    category: 'modern',
    description: 'Contemporary city pop revival - lo-fi aesthetic',
    characteristics: [
      '80s city pop influence',
      'Lo-fi aesthetic',
      'Vaporwave connections',
      'International fanbase',
      'Nostalgic production',
      'Modern electronic elements',
    ],
    typicalInstruments: ['Vintage synths', 'Lo-fi beats', 'Electric guitar', 'Bass', 'Modern production'],
    vocaStyleGuidance: 'Smooth, nostalgic, modern Japanese vocals, lo-fi aesthetic, chill delivery',
  },

  // Rock/Visual Kei
  {
    id: 'visual-kei',
    name: 'Visual Kei',
    category: 'modern',
    description: 'Japanese rock with visual aesthetics - theatrical',
    characteristics: [
      'Theatrical presentation',
      'Visual aesthetics',
      'Rock/metal influence',
      'Dramatic vocals',
      'Gothic/punk elements',
      'Subculture movement',
    ],
    typicalInstruments: ['Electric Guitar', 'Bass', 'Drums', 'Keyboards'],
    vocaStyleGuidance: 'Dramatic, theatrical, powerful Japanese rock vocals, emotional intensity, visual kei style',
  },

  // Anime/Game Music
  {
    id: 'anison',
    name: 'Anison (Anime Song)',
    category: 'modern',
    description: 'Anime opening/ending theme songs',
    characteristics: [
      'High energy',
      'Catchy hooks',
      'Anime tie-in',
      'Character themes',
      'Youth appeal',
      'Diverse styles',
    ],
    typicalInstruments: ['Full band', 'Orchestral elements', 'Electronic production'],
    vocaStyleGuidance: 'Energetic, anime-style vocals, character-driven, catchy delivery, youthful',
  },

  // Traditional
  {
    id: 'min-yo',
    name: 'Min\'yō (Folk Song)',
    category: 'folk',
    description: 'Traditional Japanese folk songs',
    characteristics: [
      'Regional variations',
      'Traditional instruments',
      'Folk melodies',
      'Cultural heritage',
      'Work songs/festival songs',
    ],
    typicalInstruments: ['Shamisen', 'Shakuhachi', 'Taiko', 'Traditional percussion'],
    vocaStyleGuidance: 'Traditional Japanese folk, regional dialect, authentic folk delivery, cultural depth',
  },

  // J-Hip Hop/R&B
  {
    id: 'japanese-rnb',
    name: 'Japanese R&B',
    category: 'modern',
    description: 'Contemporary Japanese R&B and urban music',
    characteristics: [
      'R&B influence',
      'Urban Japanese style',
      'Smooth production',
      'English mixing',
      'Modern youth culture',
    ],
    typicalInstruments: ['Electronic beats', '808', 'Synth', 'Modern production'],
    vocaStyleGuidance: 'Smooth Japanese R&B vocals, urban style, modern delivery, English mixing',
  },
];

// ==================== POETIC DEVICES ====================

const japanesePoeticDevices: PoeticDevice[] = [
  {
    name: 'Mono no Aware (物の哀れ)',
    type: 'cultural',
    description: 'Awareness of impermanence, bittersweet beauty of transient things',
    examples: [
      '桜が散る (Sakura ga chiru - Cherry blossoms falling)',
      '儚い (Hakanai - Fleeting, ephemeral)',
      '切ない (Setsunai - Bittersweet longing)',
    ],
    usage: 'ESSENTIAL Japanese emotional concept - transience and beauty',
  },

  {
    name: 'Wabi-Sabi (侘寂)',
    type: 'cultural',
    description: 'Finding beauty in imperfection and transience',
    examples: [
      'Imperfect beauty',
      'Aged, weathered things',
      'Simple, unadorned aesthetics',
    ],
    usage: 'Japanese aesthetic philosophy in lyrics',
  },

  {
    name: 'Natsukashii (懐かしい)',
    type: 'cultural',
    description: 'Nostalgic, fondly remembering the past',
    examples: [
      '懐かしい思い出 (Natsukashii omoide - Nostalgic memories)',
      '昔の日々 (Mukashi no hibi - Days of old)',
      'あの頃 (Ano koro - Those days)',
    ],
    usage: 'Essential for enka and nostalgic J-Pop',
  },

  {
    name: 'Japanese Nature Imagery',
    type: 'metaphor',
    description: 'Four seasons and nature central to Japanese culture',
    examples: [
      '桜 (Sakura - Cherry blossoms) = Spring, beauty, transience',
      '月 (Tsuki - Moon) = Romance, loneliness, beauty',
      '雨 (Ame - Rain) = Sadness, nostalgia, atmosphere',
      '雪 (Yuki - Snow) = Purity, winter, loneliness',
      '海 (Umi - Ocean) = Freedom, vastness, summer',
    ],
    usage: 'Essential for authentic Japanese lyrics',
  },

  {
    name: 'Kotodama (言霊)',
    type: 'cultural',
    description: 'Spirit of words - words have spiritual power',
    examples: [
      'Words can affect reality',
      'Positive language brings positive outcomes',
      'Careful choice of words',
    ],
    usage: 'Traditional Japanese belief about power of language',
  },

  {
    name: 'Kanji Wordplay',
    type: 'structure',
    description: 'Multiple meanings through kanji characters',
    examples: [
      '愛 (Ai - Love) can have multiple readings',
      'Homophone wordplay',
      'Visual kanji puns',
    ],
    usage: 'Japanese language allows rich wordplay',
  },

  {
    name: 'Onomatopoeia',
    type: 'structure',
    description: 'Japanese has extensive onomatopoeia system',
    examples: [
      'キラキラ (Kira kira - Sparkling, glittering)',
      'ドキドキ (Doki doki - Heart pounding)',
      'ふわふわ (Fuwa fuwa - Fluffy, soft)',
    ],
    usage: 'Extremely common in J-Pop lyrics',
  },

  {
    name: 'Honorifics in Lyrics',
    type: 'cultural',
    description: 'Japanese honorific system affects song lyrics',
    examples: [
      'Casual forms for intimacy',
      'Polite forms for distance/respect',
      'Different pronouns (boku, ore, watashi, atashi)',
    ],
    usage: 'Pronoun choice shows character/relationship',
  },

  {
    name: 'English Mixing',
    type: 'structure',
    description: 'Strategic English phrases in Japanese lyrics',
    examples: [
      'I love you (common in J-Pop)',
      'Single English words for impact',
      'Engrish (intentional creative English)',
    ],
    usage: 'Very common in modern J-Pop, adds international appeal',
  },
];

// ==================== SINGING STYLES ====================

const japaneseSingingStyles: SingingStyle[] = [
  {
    id: 'jpop-idol',
    name: 'J-Pop Idol',
    characteristics: ['Bright', 'Cute (Kawaii)', 'Energetic', 'High-pitched', 'Youthful'],
    vocalTechniques: ['Bright tone', 'High register', 'Cute delivery', 'Group harmonies', 'Energetic'],
    emotionalDelivery: 'Bright, cute, energetic, youthful innocence, idol charm',
    culturalContext: 'Japanese idol culture',
    referenceArtists: ['AKB48', 'Nogizaka46', 'Perfume', 'Twice (Japanese)'],
    sunoStyleHints: [
      'J-Pop idol vocals',
      'bright kawaii singing',
      'energetic Japanese',
      'cute delivery',
      'idol style',
    ],
  },

  {
    id: 'jpop-ballad-power',
    name: 'J-Pop Ballad (Powerful)',
    characteristics: ['Emotional', 'Powerful', 'Wide range', 'Dramatic', 'Clear'],
    vocalTechniques: ['Powerful vocals', 'Wide range', 'Emotional expression', 'Clear Japanese', 'Dramatic delivery'],
    emotionalDelivery: 'Emotional, powerful, dramatic, heart-wrenching, passionate',
    culturalContext: 'Japanese drama/film music',
    referenceArtists: ['Utada Hikaru', 'Ayaka', 'Superfly', 'Aimer'],
    sunoStyleHints: [
      'powerful J-Pop vocals',
      'emotional Japanese ballad',
      'dramatic singing',
      'wide vocal range',
      'heart-wrenching delivery',
    ],
  },

  {
    id: 'enka-traditional',
    name: 'Enka Traditional',
    characteristics: ['Kobushi technique', 'Emotional', 'Traditional', 'Nostalgic', 'Mature'],
    vocalTechniques: ['Kobushi (vibrato ornament)', 'Traditional technique', 'Emotional depth', 'Classical Japanese'],
    emotionalDelivery: 'Traditional Japanese soul, nostalgic, emotional depth, mature delivery',
    culturalContext: 'Traditional Japanese popular music',
    referenceArtists: ['Hibari Misora', 'Saburo Kitajima', 'Sayuri Ishikawa', 'Jero'],
    sunoStyleHints: [
      'enka vocals',
      'kobushi technique',
      'traditional Japanese singing',
      'nostalgic delivery',
      'emotional depth',
    ],
  },

  {
    id: 'city-pop-smooth',
    name: 'City Pop (Smooth)',
    characteristics: ['Smooth', 'Sophisticated', 'Jazzy', 'Urban', 'Nostalgic'],
    vocalTechniques: ['Smooth delivery', 'Jazz influence', 'Sophisticated phrasing', 'Urban cool', 'English mixing'],
    emotionalDelivery: 'Smooth, sophisticated, urban cool, nostalgic 80s vibe',
    culturalContext: '80s Japanese urban pop',
    referenceArtists: ['Mariya Takeuchi', 'Tatsuro Yamashita', 'Anri', 'Junko Yagami'],
    sunoStyleHints: [
      'city pop vocals',
      'smooth Japanese singing',
      '80s urban style',
      'jazzy delivery',
      'sophisticated',
    ],
  },

  {
    id: 'visual-kei-dramatic',
    name: 'Visual Kei',
    characteristics: ['Dramatic', 'Theatrical', 'Powerful', 'Rock', 'Emotional intensity'],
    vocalTechniques: ['Dramatic delivery', 'Rock vocals', 'Theatrical expression', 'Powerful range', 'Emotional intensity'],
    emotionalDelivery: 'Dramatic, theatrical, powerful emotion, rock intensity',
    culturalContext: 'Japanese visual kei movement',
    referenceArtists: ['X Japan', 'Dir en grey', 'The GazettE', 'Versailles'],
    sunoStyleHints: [
      'visual kei vocals',
      'dramatic Japanese rock',
      'theatrical singing',
      'powerful delivery',
      'emotional intensity',
    ],
  },

  {
    id: 'anison-energetic',
    name: 'Anison (Anime)',
    characteristics: ['High energy', 'Catchy', 'Anime style', 'Character-driven', 'Youthful'],
    vocalTechniques: ['High energy delivery', 'Catchy phrasing', 'Character voice', 'Anime style', 'Clear Japanese'],
    emotionalDelivery: 'High energy, anime character-driven, catchy, youthful enthusiasm',
    culturalContext: 'Anime opening/ending themes',
    referenceArtists: ['LiSA', 'Aimer', 'YOASOBI', 'ClariS'],
    sunoStyleHints: [
      'anison vocals',
      'anime song style',
      'high energy Japanese',
      'catchy delivery',
      'character-driven',
    ],
  },
];

// ==================== MUSICAL SCALES ====================

const japaneseMusicalScales: MusicalScale[] = [
  {
    id: 'pentatonic-japanese',
    name: 'Japanese Pentatonic (Yo Scale)',
    type: 'scale',
    notes: ['C', 'D', 'E', 'G', 'A'],
    mood: 'Traditional Japanese, peaceful',
    culturalContext: 'Traditional Japanese music, enka',
    emotionalEffect: 'Japanese traditional feeling, peaceful, nostalgic',
    usage: 'Enka, traditional Japanese music, folk',
  },

  {
    id: 'in-scale',
    name: 'In Scale (Japanese Minor Pentatonic)',
    type: 'scale',
    notes: ['C', 'D', 'Eb', 'G', 'Ab'],
    mood: 'Melancholic, traditional Japanese',
    culturalContext: 'Traditional Japanese music',
    emotionalEffect: 'Melancholic, traditional Japanese sadness',
    usage: 'Traditional Japanese music, emotional enka',
  },

  {
    id: 'hirajoshi',
    name: 'Hirajoshi Scale',
    type: 'scale',
    notes: ['C', 'Db', 'E', 'F', 'Ab'],
    mood: 'Japanese traditional, exotic',
    culturalContext: 'Traditional Japanese music',
    emotionalEffect: 'Japanese traditional character, exotic to Western ears',
    usage: 'Traditional Japanese music, creating Japanese atmosphere',
  },

  {
    id: 'major-western-jpop',
    name: 'Major Scale (J-Pop)',
    type: 'scale',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    mood: 'Bright, pop, universal',
    culturalContext: 'Modern J-Pop influenced by Western pop',
    emotionalEffect: 'Bright, happy, accessible',
    usage: 'J-Pop, modern Japanese pop music',
  },

  {
    id: 'minor-natural-jpop',
    name: 'Natural Minor (J-Pop Ballad)',
    type: 'scale',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    mood: 'Melancholic, emotional',
    culturalContext: 'J-Pop ballads, emotional songs',
    emotionalEffect: 'Melancholic, emotional, sad',
    usage: 'J-Pop ballads, emotional Japanese songs',
  },
];

// ==================== LYRIC EXAMPLES ====================

const japaneseLyricExamples: LyricExample[] = [
  // AUTHENTIC J-POP
  {
    type: 'authentic',
    text: 'キミと出会えた奇跡に / 感謝してるよ / 桜舞う季節に / また会えますように',
    explanation: 'J-Pop style. "Miracle of meeting you". "Gratitude". Cherry blossoms (sakura). Natural Japanese. Hopeful.',
    context: 'J-Pop romantic song',
  },

  {
    type: 'authentic',
    text: '涙がキラキラ光ってる / でも笑顔で手を振るよ / さよならじゃなくて / またねって言わせて',
    explanation: 'J-Pop. Onomatopoeia (kira kira). "Not goodbye but see you". Bittersweet but hopeful. Natural Japanese.',
    context: 'J-Pop emotional song',
  },

  // AUTHENTIC ENKA
  {
    type: 'authentic',
    text: '北の港に霧が降る / あなた待つ私の / 胸に響く汽笛の音 / 今日も帰らぬ船',
    explanation: 'Classic enka. Northern port imagery. Fog. Waiting. Ship horn. Traditional Japanese nostalgia.',
    context: 'Traditional Enka',
  },

  {
    type: 'authentic',
    text: '懐かしいあの日々 / もう戻らない時間 / でも心の中に / いつまでも生きている',
    explanation: 'Modern enka. "Natsukashii" (nostalgic). "Those days won\'t return". Heart memory. Emotional depth.',
    context: 'Modern Enka',
  },

  // AUTHENTIC CITY POP
  {
    type: 'authentic',
    text: '真夜中のダンスフロアで / 君とI fall in love / ネオンの海に / 溺れていたいの',
    explanation: 'City Pop. Midnight dance floor. English mixing ("I fall in love"). Neon sea. Urban Tokyo 80s vibe.',
    context: 'City Pop (80s)',
  },

  {
    type: 'authentic',
    text: '雨の首都高 / Driving through the night / 君の横顔が / 切なくて美しい',
    explanation: 'City Pop. Rain + highway. English mixing. Profile view. "Setsunai" (bittersweet). Urban romance.',
    context: 'City Pop',
  },

  // AUTHENTIC ANISON
  {
    type: 'authentic',
    text: '負けない 立ち上がれ / 君の力信じて / 未来へと羽ばたけ / 夢を掴むまで',
    explanation: 'Anison style. "Don\'t lose, stand up". "Believe in your power". Flying to future. Inspirational. Anime themes.',
    context: 'Anime Opening (Anison)',
  },

  // BAD EXAMPLES (AVOID)
  {
    type: 'avoid',
    text: 'ベイビーベイビーオー / 君は僕の太陽だ / とても愛してる / 心が燃えている',
    explanation: 'Direct English translation. "Baby baby oh". "You are my sun" unnatural. "Heart burning" forced.',
    context: 'AVOID - Translated English clichés',
  },

  {
    type: 'avoid',
    text: '手を上げて / DJもっと大きく / 一晩中踊ろう / 朝までパーティー',
    explanation: 'Generic club clichés. "Hands up", "DJ louder". No Japanese cultural depth. Sounds translated.',
    context: 'AVOID - Generic party lyrics',
  },

  // REFERENCE (CLASSIC STYLES)
  {
    type: 'reference',
    text: '春よ、来い / 早く来い / あるきはじめた / みいちゃんが / 赤い鼻緒の / じょじょはいて',
    explanation: 'Classic Japanese song. Simple, nostalgic. "Spring, come". Childlike innocence. Natural Japanese.',
    context: 'Japanese classic (Matsutoya Yumi style)',
  },

  {
    type: 'reference',
    text: '会いたくて会いたくて / 震える / 思いはせつなさを連れて来る / 今もこうして目を閉じれば',
    explanation: 'J-Pop ballad (Nishino Kana style). "Want to see you". "Setsunai" (bittersweet). Emotional, natural Japanese.',
    context: 'J-Pop Ballad reference',
  },
];

// ==================== JAPANESE LANGUAGE CONFIG ====================

export const japaneseConfig: LanguageConfig = {
  id: 'japanese',
  name: 'Japanese',
  nativeName: '日本語',
  tier: 'tier3',
  
  scripts: ['Japanese (Kanji, Hiragana, Katakana)', 'Romaji (Latin)'],
  
  dialects: [
    'Standard Japanese (標準語)',
    'Kansai dialect (関西弁)',
    'Tokyo dialect (東京弁)',
    'Hokkaido dialect',
    'Okinawan Japanese',
  ],
  
  musicalTraditions: japaneseMusicalTraditions,
  poeticDevices: japanesePoeticDevices,
  singingStyles: japaneseSingingStyles,
  musicalScales: japaneseMusicalScales,
  
  commonInstruments: [
    'Shamisen (三味線)',
    'Shakuhachi (尺八)',
    'Koto (琴)',
    'Taiko (太鼓)',
    'Synthesizers',
    'Electric Guitar',
    'Bass',
    'Drums',
    'Piano',
  ],
  
  culturalThemes: [
    'Mono no aware (物の哀れ) - Transience',
    'Natsukashii (懐かしい) - Nostalgia',
    'Setsunai (切ない) - Bittersweet',
    'Sakura (桜) - Cherry blossoms',
    'Tsuki (月) - Moon',
    'Ame (雨) - Rain',
    'Yume (夢) - Dream',
    'Ai (愛) - Love',
    'Kokoro (心) - Heart',
    'Kizuna (絆) - Bonds',
  ],
  
  lyricExamples: japaneseLyricExamples,
  
  enabled: true,
};

// ==================== JAPANESE SONG STRUCTURES ====================

export const japaneseSongStructures = {
  jpop: {
    standard: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'pre-chorus', 'chorus', 'bridge', 'chorus', 'outro'],
    ballad: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus', 'outro'],
  },
  
  enka: {
    traditional: ['intro', 'verse1', 'verse2', 'chorus', 'verse3', 'chorus', 'outro'],
  },
  
  cityPop: {
    classic: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'instrumental', 'bridge', 'chorus', 'outro'],
  },
  
  anison: {
    opening: ['intro', 'verse1', 'pre-chorus', 'chorus', 'instrumental', 'verse2', 'pre-chorus', 'chorus', 'outro'],
    ending: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'outro'],
  },
  
  visualKei: {
    rock: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'pre-chorus', 'chorus', 'bridge', 'guitar-solo', 'chorus', 'outro'],
  },
};

// ==================== CULTURAL NOTES ====================

export const japaneseCulturalNotes = {
  monoNoAware: 'Mono no aware (物の哀れ) is THE essential Japanese concept - awareness of transience, bittersweet beauty.',
  natsukashii: 'Natsukashii (懐かしい) - nostalgia is huge in Japanese music, especially enka.',
  kawaii: 'Kawaii (可愛い) culture influences J-Pop heavily - cute aesthetics, bright sounds.',
  fourSeasons: 'Four seasons imagery is essential - cherry blossoms (spring), fireworks (summer), leaves (fall), snow (winter).',
  
  language: {
    scripts: 'Japanese uses 3 writing systems: Kanji (Chinese characters), Hiragana, Katakana.',
    honorifics: 'Japanese has complex honorific system - affects pronouns and verb forms in lyrics.',
    onomatopoeia: 'Japanese has EXTENSIVE onomatopoeia - very common in J-Pop (kira kira, doki doki).',
    englishMixing: 'English phrases are very common in J-Pop - adds international appeal.',
  },
  
  avoidances: [
    'Don\'t translate English idioms directly - they sound unnatural',
    'Don\'t ignore Japanese pentatonic scales for traditional music',
    'Don\'t forget mono no aware concept - transience is core to Japanese aesthetics',
    'Enka requires kobushi vocal technique and traditional feeling',
    'J-Pop often mixes English - use strategically, not excessively',
  ],
};

// ==================== EXPORT ====================

export default japaneseConfig;
