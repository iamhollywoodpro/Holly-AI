/**
 * HOLLY - Korean Language Configuration (TIER 3)
 * K-Pop Structure, K-R&B, Trot Integration
 * 
 * Complete cultural and musical context for authentic Korean songwriting
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

const koreanMusicalTraditions: MusicalTradition[] = [
  // K-Pop
  {
    id: 'kpop-idol',
    name: 'K-Pop (Idol Group)',
    category: 'modern',
    description: 'Korean idol pop - highly produced, dance-oriented, global appeal',
    characteristics: [
      'Highly polished production',
      'Complex choreography tie-in',
      'Multiple language mixing (Korean/English/Japanese)',
      'Hook-driven',
      'Visual presentation',
      'Global appeal',
    ],
    typicalInstruments: ['Synthesizers', 'Electronic beats', '808', 'Trap elements', 'EDM production'],
    vocaStyleGuidance: 'Polished K-Pop vocals, clear Korean pronunciation, rap sections, harmonies, idol delivery, energetic',
  },

  {
    id: 'kpop-ballad',
    name: 'K-Pop Ballad',
    category: 'modern',
    description: 'Korean ballad - emotional, powerful vocals, OST staple',
    characteristics: [
      'Emotional delivery',
      'Powerful vocals',
      'K-Drama OST tie-ins',
      'Piano/strings prominent',
      'Wide vocal range',
      'Dramatic build-ups',
    ],
    typicalInstruments: ['Piano', 'Strings', 'Acoustic Guitar', 'Soft drums', 'Orchestra'],
    vocaStyleGuidance: 'Powerful emotional Korean vocals, wide range, dramatic delivery, OST style, heart-wrenching',
  },

  {
    id: 'kpop-hiphop',
    name: 'K-Hip Hop/Rap',
    category: 'modern',
    description: 'Korean hip hop and rap - street culture',
    characteristics: [
      'Rap-focused',
      'Hip hop beats',
      'Korean street culture',
      'Show Me The Money influence',
      'Bilingual lyrics',
      'Swagger and attitude',
    ],
    typicalInstruments: ['Hip hop beats', '808', 'Trap production', 'Minimal instrumentation'],
    vocaStyleGuidance: 'Korean rap delivery, hip hop flow, street attitude, bilingual mixing, swagger',
  },

  // K-R&B
  {
    id: 'k-rnb',
    name: 'K-R&B',
    category: 'modern',
    description: 'Korean R&B - smooth, sophisticated, emotional',
    characteristics: [
      'Smooth R&B production',
      'Emotional vocals',
      'Neo-soul influence',
      'Sophisticated arrangements',
      'Late-night vibe',
      'English mixing',
    ],
    typicalInstruments: ['Electronic beats', 'Bass', 'Keys', 'Synth', 'Guitar', 'R&B production'],
    vocaStyleGuidance: 'Smooth Korean R&B vocals, emotional delivery, sophisticated style, neo-soul influence',
  },

  // Trot (Traditional Korean Pop)
  {
    id: 'trot-classic',
    name: 'Trot (Classic)',
    category: 'folk',
    description: 'Traditional Korean popular music - older generation appeal',
    characteristics: [
      'Traditional Korean pop',
      'Pentatonic melodies',
      'Repetitive structure',
      'Older generation appeal',
      'Emotional delivery',
      'Korean cultural themes',
    ],
    typicalInstruments: ['Electronic keyboard', 'Accordion', 'Traditional drums', 'Synthesizers'],
    vocaStyleGuidance: 'Traditional trot vocals, Korean vibrato, emotional delivery, older generation style',
  },

  {
    id: 'trot-modern',
    name: 'Trot (Modern Revival)',
    category: 'modern',
    description: 'Modern trot revival - younger generation interest',
    characteristics: [
      'Traditional trot + modern production',
      'Youth appeal',
      'TV show popularity',
      'Modern arrangements',
      'Accessible to all ages',
    ],
    typicalInstruments: ['Modern production', 'Electronic elements', 'Traditional instruments mixed'],
    vocaStyleGuidance: 'Modern trot style, accessible vocals, youthful energy, traditional Korean feeling',
  },

  // Indie/Alternative
  {
    id: 'k-indie',
    name: 'K-Indie',
    category: 'modern',
    description: 'Korean independent music - alternative to mainstream',
    characteristics: [
      'Independent production',
      'Alternative sounds',
      'Artistic freedom',
      'Less polished aesthetic',
      'Authentic expression',
      'Underground culture',
    ],
    typicalInstruments: ['Indie rock instruments', 'Acoustic', 'Alternative production'],
    vocaStyleGuidance: 'Indie Korean vocals, authentic delivery, less polished, emotional honesty',
  },

  // OST
  {
    id: 'k-drama-ost',
    name: 'K-Drama OST',
    category: 'modern',
    description: 'Korean drama soundtrack - emotional, scene-specific',
    characteristics: [
      'Emotional storytelling',
      'Scene-specific',
      'Character themes',
      'Dramatic vocals',
      'Piano/strings heavy',
      'Ballad structure',
    ],
    typicalInstruments: ['Piano', 'Strings', 'Orchestra', 'Acoustic guitar', 'Emotional production'],
    vocaStyleGuidance: 'Emotional OST vocals, dramatic delivery, scene storytelling, heart-wrenching Korean',
  },

  // Traditional
  {
    id: 'pansori',
    name: 'Pansori (Traditional Opera)',
    category: 'folk',
    description: 'Traditional Korean musical storytelling',
    characteristics: [
      'Traditional Korean opera',
      'Narrative storytelling',
      'Drum accompaniment',
      'Ancient tradition',
      'Powerful vocals',
      'Cultural heritage',
    ],
    typicalInstruments: ['Puk (Korean drum)', 'Voice'],
    vocaStyleGuidance: 'Traditional pansori vocals, narrative delivery, powerful Korean, ancient technique',
  },

  // Electronic/EDM
  {
    id: 'k-edm',
    name: 'K-EDM',
    category: 'modern',
    description: 'Korean electronic dance music',
    characteristics: [
      'EDM production',
      'Festival/club oriented',
      'Drop-focused',
      'Electronic synths',
      'Dance energy',
      'International appeal',
    ],
    typicalInstruments: ['Synthesizers', 'EDM production', 'Drop elements', 'Electronic beats'],
    vocaStyleGuidance: 'EDM vocal style, Korean lyrics, energetic delivery, drop-focused, festival vibes',
  },
];

// ==================== POETIC DEVICES ====================

const koreanPoeticDevices: PoeticDevice[] = [
  {
    name: 'Han (한)',
    type: 'cultural',
    description: 'Korean concept - deep sorrow, resentment, regret mixed with hope',
    examples: [
      'Deep collective sorrow',
      'Historical pain + resilience',
      'Bittersweet emotion',
    ],
    usage: 'ESSENTIAL Korean emotional concept - appears in trot and ballads',
  },

  {
    name: 'Jeong (정)',
    type: 'cultural',
    description: 'Korean concept - deep emotional connection, attachment, affection',
    examples: [
      '정이 들다 (Jeong-i deulda - To develop affection)',
      'Deep bonds between people',
      'Family/community connection',
    ],
    usage: 'Essential Korean cultural concept for relationships',
  },

  {
    name: 'Nunchi (눈치)',
    type: 'cultural',
    description: 'Korean social awareness - reading the room/situation',
    examples: [
      'Social awareness',
      'Unspoken understanding',
      'Situational sensitivity',
    ],
    usage: 'Korean social concept that can appear in lyrics about relationships',
  },

  {
    name: 'Korean Nature Imagery',
    type: 'metaphor',
    description: 'Four seasons and nature in Korean poetry',
    examples: [
      '달 (Dal - Moon) = Loneliness, romance',
      '비 (Bi - Rain) = Sadness, nostalgia',
      '꽃 (Kkot - Flower) = Beauty, youth',
      '바다 (Bada - Ocean) = Freedom, vastness',
      '하늘 (Haneul - Sky) = Dreams, hope',
    ],
    usage: 'Essential for authentic Korean lyrics',
  },

  {
    name: 'Korean Onomatopoeia',
    type: 'structure',
    description: 'Extensive onomatopoeia system in Korean',
    examples: [
      '반짝반짝 (Banjjak banjjak - Sparkling)',
      '두근두근 (Dugeun dugeun - Heart pounding)',
      '살랑살랑 (Sallang sallang - Gentle breeze)',
    ],
    usage: 'Very common in K-Pop lyrics',
  },

  {
    name: 'Honorifics in Lyrics',
    type: 'cultural',
    description: 'Korean honorific system affects song lyrics',
    examples: [
      '반말 (Banmal - Casual speech) for intimacy',
      '존댓말 (Jondaenmal - Polite speech) for respect',
      'Different pronouns (나/너 vs 저/당신)',
    ],
    usage: 'Speech level shows relationship and emotion',
  },

  {
    name: 'English/Korean Code-Switching',
    type: 'structure',
    description: 'Strategic bilingual lyrics in K-Pop',
    examples: [
      'English hooks for global appeal',
      'Korean verses for cultural authenticity',
      'Seamless language mixing',
    ],
    usage: 'ESSENTIAL K-Pop technique for international market',
  },

  {
    name: 'Korean Rhyme Schemes',
    type: 'rhyme',
    description: 'Rhyming patterns in Korean lyrics',
    examples: [
      '-이/-히 endings',
      '-아/-야 endings',
      'Syllable-based rhyming',
    ],
    usage: 'Korean rhyming is syllable-based rather than phonetic',
  },

  {
    name: 'Repetition (Emphasis)',
    type: 'structure',
    description: 'Repetition for emotional emphasis in Korean',
    examples: [
      '사랑해 사랑해 사랑해 (Saranghae saranghae saranghae - I love you x3)',
      '미안해 미안해 (Mianhae mianhae - I\'m sorry x2)',
      'Emotional intensification through repetition',
    ],
    usage: 'Very common in K-Pop and ballads',
  },
];

// ==================== SINGING STYLES ====================

const koreanSingingStyles: SingingStyle[] = [
  {
    id: 'kpop-idol-style',
    name: 'K-Pop Idol',
    characteristics: ['Polished', 'Energetic', 'Harmonies', 'Rap sections', 'Dance-oriented'],
    vocalTechniques: ['Polished vocals', 'Group harmonies', 'Rap delivery', 'Ad-libs', 'Energetic delivery'],
    emotionalDelivery: 'Polished, energetic, idol charm, global appeal, youthful',
    culturalContext: 'Korean idol industry',
    referenceArtists: ['BTS', 'BLACKPINK', 'TWICE', 'Stray Kids', 'NewJeans'],
    sunoStyleHints: [
      'K-Pop idol vocals',
      'polished Korean singing',
      'group harmonies',
      'energetic delivery',
      'idol style',
    ],
  },

  {
    id: 'kpop-ballad-power',
    name: 'K-Pop Ballad (Powerful)',
    characteristics: ['Powerful', 'Emotional', 'Wide range', 'Dramatic', 'OST style'],
    vocalTechniques: ['Powerful belt', 'Wide vocal range', 'Emotional expression', 'Dramatic build-up', 'Clear Korean'],
    emotionalDelivery: 'Powerful, emotional, dramatic, heart-wrenching, OST style',
    culturalContext: 'K-Drama OST tradition',
    referenceArtists: ['Taeyeon', 'Ailee', 'IU', 'Baek Yerin', 'Chen'],
    sunoStyleHints: [
      'powerful K-Pop ballad',
      'emotional Korean vocals',
      'dramatic singing',
      'OST style',
      'heart-wrenching delivery',
    ],
  },

  {
    id: 'k-hip-hop-rap',
    name: 'K-Hip Hop/Rap',
    characteristics: ['Rap flow', 'Hip hop delivery', 'Swagger', 'Bilingual', 'Street attitude'],
    vocalTechniques: ['Korean rap flow', 'Hip hop delivery', 'Bilingual mixing', 'Swagger', 'Street attitude'],
    emotionalDelivery: 'Hip hop swagger, street attitude, confident delivery, Korean flow',
    culturalContext: 'Korean hip hop scene',
    referenceArtists: ['Tiger JK', 'Jay Park', 'Epik High', 'Zico', 'Bewhy'],
    sunoStyleHints: [
      'K-Hip hop vocals',
      'Korean rap flow',
      'hip hop delivery',
      'street attitude',
      'bilingual style',
    ],
  },

  {
    id: 'k-rnb-smooth',
    name: 'K-R&B (Smooth)',
    characteristics: ['Smooth', 'Soulful', 'Emotional', 'Neo-soul', 'Sophisticated'],
    vocalTechniques: ['Smooth delivery', 'R&B runs', 'Emotional expression', 'Neo-soul influence', 'Sophisticated phrasing'],
    emotionalDelivery: 'Smooth, soulful, emotional depth, neo-soul vibe, sophisticated',
    culturalContext: 'Korean R&B scene',
    referenceArtists: ['Dean', 'Crush', 'Heize', 'Colde', 'Zion.T'],
    sunoStyleHints: [
      'K-R&B vocals',
      'smooth Korean singing',
      'neo-soul style',
      'emotional delivery',
      'sophisticated',
    ],
  },

  {
    id: 'trot-traditional',
    name: 'Trot',
    characteristics: ['Traditional', 'Vibrato', 'Emotional', 'Korean style', 'Older generation'],
    vocalTechniques: ['Traditional Korean vibrato', 'Trot style', 'Emotional delivery', 'Korean pronunciation'],
    emotionalDelivery: 'Traditional Korean emotion, vibrato, older generation style, cultural depth',
    culturalContext: 'Traditional Korean popular music',
    referenceArtists: ['Song Ga-in', 'Im Young-woong', 'Hong Jin-young', 'Classic trot singers'],
    sunoStyleHints: [
      'trot vocals',
      'traditional Korean singing',
      'vibrato style',
      'emotional delivery',
      'Korean cultural',
    ],
  },

  {
    id: 'k-indie-authentic',
    name: 'K-Indie',
    characteristics: ['Authentic', 'Less polished', 'Emotional honesty', 'Alternative', 'Raw'],
    vocalTechniques: ['Authentic delivery', 'Less polished', 'Emotional honesty', 'Raw expression', 'Alternative style'],
    emotionalDelivery: 'Authentic, emotionally honest, less polished, indie charm, raw',
    culturalContext: 'Korean indie music scene',
    referenceArtists: ['Hyukoh', 'The Black Skirts', 'Se So Neon', 'Car the Garden'],
    sunoStyleHints: [
      'K-indie vocals',
      'authentic Korean singing',
      'less polished',
      'emotional honesty',
      'indie style',
    ],
  },
];

// ==================== MUSICAL SCALES ====================

const koreanMusicalScales: MusicalScale[] = [
  {
    id: 'korean-pentatonic',
    name: 'Korean Pentatonic',
    type: 'pentatonic',
    notes: ['C', 'D', 'E', 'G', 'A'],
    mood: 'Traditional Korean, folk',
    culturalContext: 'Traditional Korean music, trot',
    emotionalEffect: 'Korean traditional feeling, folk character',
    usage: 'Trot, traditional Korean music, folk',
  },

  {
    id: 'major-kpop',
    name: 'Major Scale (K-Pop)',
    type: 'major',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
    mood: 'Bright, pop, energetic',
    culturalContext: 'Modern K-Pop',
    emotionalEffect: 'Bright, energetic, happy',
    usage: 'K-Pop, modern Korean pop music',
  },

  {
    id: 'minor-natural-kpop',
    name: 'Natural Minor (K-Pop Ballad)',
    type: 'minor',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
    mood: 'Melancholic, emotional',
    culturalContext: 'K-Pop ballads, OST',
    emotionalEffect: 'Melancholic, emotional, sad',
    usage: 'K-Pop ballads, K-Drama OST',
  },

  {
    id: 'harmonic-minor-dramatic',
    name: 'Harmonic Minor (Dramatic)',
    type: 'minor',
    notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G#'],
    mood: 'Dramatic, emotional intensity',
    culturalContext: 'Dramatic K-Pop songs',
    emotionalEffect: 'Dramatic, intense emotion, theatrical',
    usage: 'Dramatic K-Pop, intense ballads',
  },

  {
    id: 'blues-scale-khiphop',
    name: 'Blues Scale (K-Hip Hop)',
    type: 'pentatonic',
    notes: ['C', 'Eb', 'F', 'F#', 'G', 'Bb'],
    mood: 'Hip hop, R&B feel',
    culturalContext: 'K-Hip Hop, K-R&B',
    emotionalEffect: 'Hip hop swagger, R&B soul',
    usage: 'K-Hip Hop, K-R&B, urban music',
  },
];

// ==================== LYRIC EXAMPLES ====================

const koreanLyricExamples: LyricExample[] = [
  // AUTHENTIC K-POP
  {
    type: 'authentic',
    text: '너를 만난 그날부터 / My life has changed / 두근두근 떨리는 마음 / I can\'t stop thinking about you',
    explanation: 'K-Pop style. "From the day I met you". English mixing. Onomatopoeia (dugeun dugeun). Bilingual seamless.',
    context: 'K-Pop romantic song',
  },

  {
    type: 'authentic',
    text: 'Break the rules, make it loud / 우리만의 길을 가자 / No looking back, 지금 이 순간 / We own the night',
    explanation: 'K-Pop energetic. English hooks. Korean verses. "Our own path". "This moment". Global appeal structure.',
    context: 'K-Pop energetic song',
  },

  // AUTHENTIC K-POP BALLAD
  {
    type: 'authentic',
    text: '사랑했던 그 기억들이 / 아직도 내 마음 속에 / 지울 수 없는 너의 흔적 / 영원히 남아있을 거야',
    explanation: 'K-Pop ballad. "Memories of love". "Still in my heart". "Your traces I can\'t erase". Emotional Korean.',
    context: 'K-Pop Ballad',
  },

  {
    type: 'authentic',
    text: '미안해 미안해 미안해 / 돌아와줘 제발 / 너 없이는 살 수 없어 / 다시 한번 기회를 줘',
    explanation: 'K-Drama OST style. Repetition (mianhae x3). "Come back please". Desperate emotion. Classic ballad.',
    context: 'K-Drama OST Ballad',
  },

  // AUTHENTIC K-HIP HOP
  {
    type: 'authentic',
    text: '한강 다리 위에서 / I spit my truth / 이 도시의 밤을 / 내 것으로 만들어',
    explanation: 'K-Hip Hop. Han River bridge (Seoul landmark). English mixing. "This city\'s night". Urban Korean attitude.',
    context: 'K-Hip Hop',
  },

  // AUTHENTIC K-R&B
  {
    type: 'authentic',
    text: '밤이 깊어갈수록 / 네 생각이 더 간절해 / Slowly falling for you / 이 감정을 멈출 수 없어',
    explanation: 'K-R&B. "As the night deepens". "Thinking of you more desperately". English hook. Smooth Korean R&B.',
    context: 'K-R&B',
  },

  // AUTHENTIC TROT
  {
    type: 'authentic',
    text: '아~ 사랑아 내 사랑아 / 왜 나를 떠나가나 / 눈물이 흐르는 이 밤에 / 혼자 남겨진 나',
    explanation: 'Classic trot. "Ah~ my love". "Why do you leave me". "This night of tears". Traditional Korean emotion.',
    context: 'Traditional Trot',
  },

  // BAD EXAMPLES (AVOID)
  {
    type: 'avoid',
    text: '베이비 베이비 오 / 너는 나의 태양이야 / 너무 많이 사랑해 / 내 심장이 불타고 있어',
    explanation: 'Direct English translation. "Baby baby oh". "You are my sun" unnatural. "Heart burning" forced.',
    context: 'AVOID - Translated English clichés',
  },

  {
    type: 'avoid',
    text: '손을 들어 / DJ 더 크게 틀어 / 밤새 춤을 춰 / 새벽까지 파티',
    explanation: 'Generic club clichés. "Hands up", "DJ louder". No Korean cultural depth. Sounds translated.',
    context: 'AVOID - Generic party lyrics',
  },

  // REFERENCE (CLASSIC STYLES)
  {
    type: 'reference',
    text: '좋은 날 / 오늘처럼 / 이렇게 웃을 수 있다면 / 좋겠어',
    explanation: 'K-Pop classic (IU style). "Good day". "Like today". "If I could smile like this". Simple, emotional Korean.',
    context: 'K-Pop reference (IU)',
  },

  {
    type: 'reference',
    text: 'DNA / 처음부터 끝까지 / 내 혈관 속 DNA / 날 이뤄줄 단 하나',
    explanation: 'BTS style. "DNA". "From beginning to end". "In my bloodstream". English mixing. Global K-Pop.',
    context: 'K-Pop reference (BTS)',
  },
];

// ==================== KOREAN LANGUAGE CONFIG ====================

export const koreanConfig: LanguageConfig = {
  id: 'korean',
  name: 'Korean',
  nativeName: '한국어',
  tier: 'tier3',
  
  scripts: ['Hangeul (한글)', 'Romanization (Latin)'],
  
  dialects: [
    'Standard Korean (표준어)',
    'Seoul dialect (서울말)',
    'Busan dialect (부산말)',
    'Jeju dialect (제주말)',
    'North Korean (조선말)',
  ],
  
  musicalTraditions: koreanMusicalTraditions,
  poeticDevices: koreanPoeticDevices,
  singingStyles: koreanSingingStyles,
  musicalScales: koreanMusicalScales,
  
  commonInstruments: [
    'Synthesizers',
    'Electronic beats',
    '808 bass',
    'Electric Guitar',
    'Bass',
    'Drums',
    'Piano',
    'Strings',
    'Puk (북) - Traditional drum',
    'Gayageum (가야금)',
  ],
  
  culturalThemes: [
    'Han (한) - Deep sorrow + resilience',
    'Jeong (정) - Deep affection/connection',
    'Sarang (사랑) - Love',
    'Nunchi (눈치) - Social awareness',
    'Dal (달) - Moon',
    'Bi (비) - Rain',
    'Kkot (꽃) - Flower',
    'Bada (바다) - Ocean',
    'Haneul (하늘) - Sky',
    'Kkum (꿈) - Dream',
  ],
  
  lyricExamples: koreanLyricExamples,
  
  enabled: true,
};

// ==================== KOREAN SONG STRUCTURES ====================

export const koreanSongStructures = {
  kpop: {
    idol: ['intro', 'verse1', 'pre-chorus', 'chorus', 'post-chorus', 'verse2', 'pre-chorus', 'chorus', 'bridge', 'dance-break', 'chorus', 'outro'],
    ballad: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'high-note', 'chorus', 'outro'],
  },
  
  khiphop: {
    standard: ['intro', 'verse1', 'hook', 'verse2', 'hook', 'bridge', 'verse3', 'hook', 'outro'],
  },
  
  krnb: {
    smooth: ['intro', 'verse1', 'pre-chorus', 'chorus', 'verse2', 'pre-chorus', 'chorus', 'bridge', 'chorus', 'outro'],
  },
  
  trot: {
    traditional: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'instrumental', 'chorus', 'outro'],
  },
  
  ost: {
    drama: ['intro', 'verse1', 'chorus', 'verse2', 'chorus', 'bridge', 'chorus', 'outro'],
  },
};

// ==================== CULTURAL NOTES ====================

export const koreanCulturalNotes = {
  han: 'Han (한) is THE essential Korean emotional concept - deep collective sorrow mixed with resilience and hope.',
  jeong: 'Jeong (정) - deep emotional connection and affection. Essential for relationship songs.',
  kpop: 'K-Pop structure: English hooks for global appeal, Korean verses for authenticity, rap sections, dance breaks.',
  honorifics: 'Korean honorific system (banmal vs jondaenmal) shows intimacy level in lyrics.',
  
  language: {
    hangeul: 'Korean uses Hangeul alphabet (한글) - scientific writing system created in 1443.',
    honorifics: 'Speech level (formal/informal) is crucial - shows relationship and emotion.',
    onomatopoeia: 'Korean has extensive onomatopoeia - very common in K-Pop.',
    bilingual: 'K-Pop strategically mixes English and Korean for global appeal.',
  },
  
  avoidances: [
    'Don\'t translate English idioms directly - they sound unnatural',
    'Don\'t ignore English mixing in K-Pop - it\'s essential for structure',
    'Don\'t forget han concept - deep Korean emotion',
    'K-Pop requires polished production sound - not rough/indie',
    'Trot requires traditional Korean emotional delivery',
  ],
};

// ==================== EXPORT ====================

export default koreanConfig;
