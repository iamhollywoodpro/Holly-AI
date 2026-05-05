/**
 * HOLLY - Hindi Language Configuration
 * Complete Bollywood & Hindustani Classical Integration
 * 
 * Authentic Hindi music with Bollywood structure, Urdu poetry, and cultural depth
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

const hindiMusicalTraditions: MusicalTradition[] = [
  // Bollywood
  {
    id: 'bollywood-romantic',
    name: 'Bollywood Romantic',
    category: 'modern',
    description: 'Romantic Hindi film songs with emotional depth and melodic richness',
    characteristics: [
      'Mukhda-Antara structure (Chorus-Verse)',
      'Urdu poetry influence',
      'Emotional storytelling',
      'Orchestral arrangements',
      'Modern production with classical elements',
      'Repetitive mukhda for memorability',
    ],
    typicalInstruments: ['Tabla', 'Harmonium', 'Sitar', 'Strings', 'Flute', 'Modern synths', 'Dholak'],
    vocaStyleGuidance: 'Emotional, expressive, clear Hindustani pronunciation, vocal ornamentations (gamak), dramatic crescendos',
  },
  
  {
    id: 'bollywood-upbeat',
    name: 'Bollywood Dance/Upbeat',
    category: 'modern',
    description: 'Energetic Bollywood songs for celebrations and dance sequences',
    characteristics: [
      'Fast tempo',
      'Rhythmic dhol and tabla',
      'Call-and-response patterns',
      'Simple, catchy lyrics',
      'Electronic + traditional fusion',
      'Party atmosphere',
    ],
    typicalInstruments: ['Dhol', 'Tabla', 'Synthesizers', '808s', 'Traditional drums', 'Tumbi'],
    vocaStyleGuidance: 'Energetic, celebratory, clear diction, rhythmic emphasis, group vocals',
  },
  
  {
    id: 'bollywood-sad',
    name: 'Bollywood Sad/Ghazal-inspired',
    category: 'modern',
    description: 'Melancholic songs with heavy Urdu poetry and classical influence',
    characteristics: [
      'Slow tempo',
      'Heavy Urdu vocabulary (Ishq, Judaai, Gham)',
      'Poetic metaphors',
      'Minimalist arrangements',
      'Emotional depth',
      'Classical vocal techniques',
    ],
    typicalInstruments: ['Harmonium', 'Tabla', 'Sarangi', 'Sitar', 'Strings', 'Flute'],
    vocaStyleGuidance: 'Melancholic, soft, emotional vulnerability, slow meend (glides), classical ornamentations',
  },
  
  // Classical
  {
    id: 'hindustani-classical',
    name: 'Hindustani Classical',
    category: 'classical',
    description: 'North Indian classical music tradition with raga-based compositions',
    characteristics: [
      'Raga framework (specific scales and moods)',
      'Tala (rhythmic cycles)',
      'Alap-Jor-Jhala structure',
      'Improvisation within rules',
      'Time and season associations',
      'Spiritual and devotional themes',
    ],
    typicalInstruments: ['Sitar', 'Tabla', 'Tanpura', 'Sarod', 'Bansuri', 'Harmonium'],
    vocaStyleGuidance: 'Classical vocal techniques, gamak, meend, layakari, precise raga adherence',
  },
  
  {
    id: 'ghazal',
    name: 'Ghazal',
    category: 'classical',
    description: 'Urdu poetic form with rhyme scheme (qafiya) and refrain (radif)',
    characteristics: [
      'Couplet structure (sher)',
      'Matla (opening couplet with full rhyme)',
      'Maqta (final couplet with pen name)',
      'Qafiya (rhyme) and Radif (refrain)',
      'Romantic and philosophical themes',
      'Each couplet is complete thought',
    ],
    typicalInstruments: ['Harmonium', 'Tabla', 'Sarangi'],
    vocaStyleGuidance: 'Poetic delivery, emphasis on words, emotional expression, classical pronunciation',
  },
  
  {
    id: 'thumri',
    name: 'Thumri',
    category: 'classical',
    description: 'Semi-classical form with romantic and devotional themes',
    characteristics: [
      'Romantic lyrics (often Krishna-Radha)',
      'Lighter than full classical',
      'Emphasis on lyrics and emotion',
      'Bandish (fixed composition) with improvisation',
      'Feminine perspective common',
    ],
    typicalInstruments: ['Harmonium', 'Tabla', 'Sarangi', 'Tanpura'],
    vocaStyleGuidance: 'Emotional, expressive, feminine sensibility, classical ornamentations',
  },
  
  // Folk & Regional
  {
    id: 'bhangra',
    name: 'Bhangra/Punjabi Folk',
    category: 'folk',
    description: 'Energetic Punjabi folk music, popular in Bollywood fusion',
    characteristics: [
      'Dhol-driven rhythm',
      'Celebratory themes',
      'Agricultural and festival references',
      'Call-and-response',
      'High energy',
    ],
    typicalInstruments: ['Dhol', 'Tumbi', 'Chimta', 'Algoza'],
    vocaStyleGuidance: 'Energetic, loud, celebratory, Punjabi accent and flavor',
  },
  
  // Modern/Contemporary
  {
    id: 'hindi-pop',
    name: 'Hindi Pop/Indie',
    category: 'modern',
    description: 'Contemporary Hindi pop music with Western influences',
    characteristics: [
      'Western song structure (Verse-Chorus)',
      'Modern production',
      'Urban themes',
      'English mixing common',
      'Conversational Hindi',
    ],
    typicalInstruments: ['Synthesizers', 'Guitar', 'Bass', 'Drums', 'Electronic production'],
    vocaStyleGuidance: 'Modern, urban, conversational delivery, Western pop influence',
  },
  
  {
    id: 'hindi-rap',
    name: 'Hindi Hip-Hop',
    category: 'modern',
    description: 'Indian hip-hop with Hindi/Hinglish lyrics and cultural themes',
    characteristics: [
      'Complex Hindi rhyme schemes',
      'Street culture references',
      'Social commentary',
      'Hinglish (Hindi-English mix)',
      'Indian instruments + trap beats',
    ],
    typicalInstruments: ['Tabla loops', 'Trap drums', 'Bass', 'Synthesizers', 'Indian samples'],
    vocaStyleGuidance: 'Confident rap flow, Hindi pronunciation, urban slang, rhythmic delivery',
  },
];

// ==================== POETIC DEVICES ====================

const hindiPoeticDevices: PoeticDevice[] = [
  {
    name: 'Qafiya (قافیہ) - Rhyme',
    type: 'rhyme',
    description: 'End rhyme in Urdu/Hindi poetry, essential in Ghazals and Bollywood songs',
    examples: [
      'दिल (dil) - ज़िल (zil)',
      'रात (raat) - बात (baat)',
      'आसमान (aasmaan) - जहान (jahaan)',
    ],
    usage: 'Essential in all Hindi songs. Urdu words often used for better rhyme options.',
  },
  
  {
    name: 'Radif (ردیف) - Refrain',
    type: 'rhyme',
    description: 'Repeated word or phrase after the rhyme in each line',
    examples: [
      'तेरे बिना... / मेरे बिना... (without you / without me)',
      'हो गया है... / खो गया है... (has become / has been lost)',
    ],
    usage: 'Common in Ghazals and romantic Bollywood songs. Creates rhythm and emphasis.',
  },
  
  {
    name: 'Mukhda-Antara Structure',
    type: 'structure',
    description: 'Bollywood song structure: Mukhda (chorus) comes first, then Antaras (verses)',
    examples: [
      'Mukhda (repeated) → Antara 1 → Mukhda → Antara 2 → Mukhda → Bridge → Mukhda',
    ],
    usage: 'Standard Bollywood structure. Different from Western Verse-Chorus order.',
  },
  
  {
    name: 'Urdu Shayari Influence',
    type: 'cultural',
    description: 'Poetic language from Urdu tradition, adds sophistication and depth',
    examples: [
      'Using "इश्क़" (Ishq) instead of "प्यार" (Pyaar) for love',
      'Using "ग़म" (Gham) instead of "दुःख" (Dukh) for sorrow',
      'Using "जुदाई" (Judaai) instead of "अलगाव" (Alagaav) for separation',
    ],
    usage: 'Makes lyrics more poetic and emotionally rich. Common in romantic and sad songs.',
  },
  
  {
    name: 'Metaphors from Nature',
    type: 'metaphor',
    description: 'Using nature imagery for emotions and situations',
    examples: [
      'चाँद (Chaand - Moon) = Beauty, beloved',
      'बारिश (Baarish - Rain) = Sadness, romance, memories',
      'सूरज (Sooraj - Sun) = Hope, new beginning',
      'रात (Raat - Night) = Loneliness, longing',
      'सावन (Saawan - Monsoon) = Romance, separation',
    ],
    usage: 'Universal in Hindi songs. Cultural associations are important.',
  },
  
  {
    name: 'Religious/Spiritual Metaphors',
    type: 'metaphor',
    description: 'Hindu and Sufi spiritual concepts as romantic metaphors',
    examples: [
      'Comparing beloved to देवी (Devi - goddess)',
      'Using भक्ति (Bhakti - devotion) for romantic love',
      'Sufi concepts: मस्ती (Masti - divine intoxication)',
    ],
    usage: 'Common in devotional and deeply romantic songs.',
  },
  
  {
    name: 'Repetition (Aavartana)',
    type: 'structure',
    description: 'Repeating phrases for emphasis and memorability',
    examples: [
      'तुम ही हो, तुम ही हो, तुम ही हो (You are the one, repeated)',
      'क्यों... क्यों... क्यों... (Why... why... why...)',
    ],
    usage: 'Makes songs catchy and emphasizes emotion.',
  },
  
  {
    name: 'Anupras (अनुप्रास) - Alliteration',
    type: 'structure',
    description: 'Repetition of consonant sounds',
    examples: [
      'पल पल दिल के पास (Pal pal dil ke paas)',
      'बिन तेरे बिन तेरे (Bin tere bin tere)',
    ],
    usage: 'Creates musicality and flow in Hindi lyrics.',
  },
];

// ==================== SINGING STYLES ====================

const hindiSingingStyles: SingingStyle[] = [
  {
    id: 'bollywood-romantic-male',
    name: 'Bollywood Romantic (Male)',
    characteristics: ['Emotional', 'Clear Hindi diction', 'Vocal ornamentations', 'Dynamic range'],
    vocalTechniques: ['Gamak (oscillations)', 'Meend (glides)', 'Murki (fast ornamentations)', 'Aakaar singing'],
    emotionalDelivery: 'Deeply emotional, vulnerable, romantic, passionate',
    culturalContext: 'Modern Bollywood romantic tradition',
    referenceArtists: ['Arijit Singh', 'Atif Aslam', 'Armaan Malik', 'Jubin Nautiyal'],
    sunoStyleHints: [
      'Bollywood romantic',
      'male vocals',
      'emotional Hindi',
      'Arijit Singh style',
      'heartfelt delivery',
      'vocal ornamentations',
    ],
  },
  
  {
    id: 'bollywood-romantic-female',
    name: 'Bollywood Romantic (Female)',
    characteristics: ['Sweet', 'Expressive', 'Clear pronunciation', 'Emotional depth'],
    vocalTechniques: ['Gamak', 'Meend', 'Taan (fast note patterns)', 'Soft-loud dynamics'],
    emotionalDelivery: 'Romantic, expressive, sometimes playful, emotional',
    culturalContext: 'Bollywood female vocal tradition',
    referenceArtists: ['Shreya Ghoshal', 'Sunidhi Chauhan', 'Neha Kakkar', 'Jonita Gandhi'],
    sunoStyleHints: [
      'Bollywood romantic',
      'female vocals',
      'emotional Hindi',
      'Shreya Ghoshal style',
      'sweet and expressive',
    ],
  },
  
  {
    id: 'classical-hindustani',
    name: 'Hindustani Classical',
    characteristics: ['Disciplined', 'Raga-based', 'Complex ornamentations', 'Powerful'],
    vocalTechniques: ['Gamak', 'Meend', 'Taan', 'Bol-taan', 'Layakari (rhythm play)', 'Aakaar'],
    emotionalDelivery: 'Spiritual, powerful, controlled emotion',
    culturalContext: 'North Indian classical music tradition',
    referenceArtists: ['Pandit Jasraj', 'Rashid Khan', 'Kaushiki Chakraborty'],
    sunoStyleHints: [
      'Hindustani classical',
      'traditional vocals',
      'raga-based',
      'classical ornamentations',
      'spiritual',
    ],
  },
  
  {
    id: 'ghazal-style',
    name: 'Ghazal Style',
    characteristics: ['Poetic', 'Urdu pronunciation', 'Emotional', 'Sophisticated'],
    vocalTechniques: ['Clear Urdu diction', 'Emphasis on words', 'Classical influence', 'Controlled emotion'],
    emotionalDelivery: 'Poetic, sophisticated, melancholic, philosophical',
    culturalContext: 'Urdu poetry and Ghazal tradition',
    referenceArtists: ['Jagjit Singh', 'Ghulam Ali', 'Farida Khanum', 'Talat Aziz'],
    sunoStyleHints: [
      'Ghazal style',
      'Urdu poetry',
      'melancholic',
      'sophisticated vocals',
      'emotional depth',
    ],
  },
  
  {
    id: 'hindi-rap',
    name: 'Hindi Rap/Hip-Hop',
    characteristics: ['Rhythmic', 'Clear Hindi diction', 'Confident', 'Urban'],
    vocalTechniques: ['Fast flow', 'Complex rhyme schemes', 'Breath control', 'Code-switching (Hindi-English)'],
    emotionalDelivery: 'Confident, assertive, storytelling, sometimes aggressive',
    culturalContext: 'Indian hip-hop culture',
    referenceArtists: ['DIVINE', 'Naezy', 'Badshah', 'Raftaar', 'KR$NA'],
    sunoStyleHints: [
      'Hindi rap',
      'hip-hop style',
      'rhythmic delivery',
      'urban Hindi',
      'confident flow',
    ],
  },
  
  {
    id: 'sufi-style',
    name: 'Sufi/Qawwali Style',
    characteristics: ['Spiritual', 'Powerful', 'Repetitive', 'Trance-inducing'],
    vocalTechniques: ['Powerful projection', 'Repetition', 'Call-and-response', 'Building intensity'],
    emotionalDelivery: 'Spiritual ecstasy, devotional, powerful',
    culturalContext: 'Sufi Islamic tradition in South Asia',
    referenceArtists: ['Nusrat Fateh Ali Khan', 'Rahat Fateh Ali Khan', 'Abida Parveen'],
    sunoStyleHints: [
      'Sufi style',
      'qawwali influence',
      'spiritual vocals',
      'powerful delivery',
      'devotional',
    ],
  },
];

// ==================== MUSICAL SCALES (RAGAS) ====================

const hindiMusicalScales: MusicalScale[] = [
  {
    id: 'raag-yaman',
    name: 'Raag Yaman (यमन)',
    type: 'raga',
    notes: ['C', 'D', 'E', 'F#', 'G', 'A', 'B'],
    mood: 'Romantic, peaceful, devotional',
    culturalContext: 'One of the most popular ragas in Hindustani classical and Bollywood',
    timeOfDay: 'Evening (6 PM - 9 PM)',
    emotionalEffect: 'Romantic, creates peaceful and devotional atmosphere',
    usage: 'Bollywood romantic songs, classical performances, devotional music',
  },
  
  {
    id: 'raag-bhairav',
    name: 'Raag Bhairav (भैरव)',
    type: 'raga',
    notes: ['C', 'Db', 'E', 'F', 'G', 'Ab', 'B'],
    mood: 'Serious, devotional, morning freshness',
    culturalContext: 'Morning raga, associated with Lord Shiva',
    timeOfDay: 'Early morning (6 AM - 9 AM)',
    emotionalEffect: 'Serious, devotional, creates reverent atmosphere',
    usage: 'Devotional songs, classical morning concerts, spiritual themes',
  },
  
  {
    id: 'raag-kafi',
    name: 'Raag Kafi (काफी)',
    type: 'raga',
    notes: ['C', 'D', 'Eb', 'F', 'G', 'A', 'Bb'],
    mood: 'Folk-like, versatile, earthy',
    culturalContext: 'Based on folk music, very flexible and popular',
    emotionalEffect: 'Natural, earthy, versatile emotional range',
    usage: 'Bollywood songs, Thumri, folk-inspired music, wide variety of moods',
  },
  
  {
    id: 'raag-bhairavi',
    name: 'Raag Bhairavi (भैरवी)',
    type: 'raga',
    notes: ['C', 'Db', 'Eb', 'F', 'G', 'Ab', 'Bb'],
    mood: 'Sad, devotional, peaceful',
    culturalContext: 'Morning raga, often used to conclude concerts',
    timeOfDay: 'Early morning (6 AM - 9 AM)',
    emotionalEffect: 'Melancholic, devotional, peaceful resolution',
    usage: 'Sad Bollywood songs, devotional music, morning prayers',
  },
  
  {
    id: 'raag-desh',
    name: 'Raag Desh (देश)',
    type: 'raga',
    notes: ['C', 'D', 'E', 'F', 'G', 'A', 'Bb'],
    mood: 'Romantic, monsoon season',
    culturalContext: 'Monsoon raga, associated with rain and romance',
    season: 'Monsoon (Sawan)',
    emotionalEffect: 'Romantic, longing, rain-related emotions',
    usage: 'Romantic Bollywood songs, monsoon-themed music, separation themes',
  },
  
  {
    id: 'raag-jaunpuri',
    name: 'Raag Jaunpuri (जौनपुरी)',
    type: 'raga',
    notes: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
    mood: 'Sad, melancholic, serious',
    culturalContext: 'Popular in Bollywood for sad songs',
    emotionalEffect: 'Melancholy, sadness, serious emotions',
    usage: 'Sad Bollywood songs, emotional ballads, separation themes',
  },
  
  {
    id: 'raag-pilu',
    name: 'Raag Pilu (पीलू)',
    type: 'raga',
    notes: ['C', 'D', 'Eb-E', 'F', 'G', 'A', 'Bb-B'],
    mood: 'Romantic, light, flexible',
    culturalContext: 'Very flexible raga, popular in light classical and Bollywood',
    emotionalEffect: 'Romantic, playful, versatile',
    usage: 'Romantic Bollywood songs, Thumri, light classical music',
  },
];

// ==================== LYRIC EXAMPLES ====================

const hindiLyricExamples: LyricExample[] = [
  // AUTHENTIC BOLLYWOOD
  {
    type: 'authentic',
    text: 'तेरे बिना ज़िन्दगी से कोई शिकवा तो नहीं / शिकवा नहीं... शिकवा नहीं... / तेरे बिना ज़िन्दगी भी लेकिन ज़िन्दगी तो नहीं',
    explanation: 'Classic Bollywood structure. Uses Urdu words (Shikwa = complaint). Repetition creates emotion. Poetic paradox.',
    context: 'Bollywood romantic song - Kishore Kumar style',
  },
  
  {
    type: 'authentic',
    text: 'काली काली ज़ुल्फों के फंदे डाल के / दिल का दुपट्टा मेरा चुराया तूने',
    explanation: 'Visual metaphors. "Zulfon ke fande" (trap of black hair). Cultural reference (dupatta). Playful romantic imagery.',
    context: 'Bollywood playful romantic - 90s style',
  },
  
  {
    type: 'authentic',
    text: 'तुम ही हो... तुम ही हो / ज़िन्दगी अब तुम ही हो / चैन भी, मेरा दर्द भी / मेरी आशिक़ी अब तुम ही हो',
    explanation: 'Modern Bollywood. Repetition of "Tum hi ho". Urdu word "Aashiqui". Simple but deeply emotional.',
    context: 'Arijit Singh style modern romantic',
  },
  
  {
    type: 'authentic',
    text: 'मेरे दिल में आज क्या है / तू कहीं पास दीखे / तेरी ओट में जहाँ से / ख़ुदा भी ख़फ़ा दीखे',
    explanation: 'Urdu poetry influence. Spiritual metaphor (God seems angry because beloved is there). Sophisticated language.',
    context: 'Ghazal-influenced Bollywood sad song',
  },
  
  // AUTHENTIC MODERN HINDI
  {
    type: 'authentic',
    text: 'सुबह की चाय में तेरी यादें घुली हैं / रात को तेरे ख्वाब में मैं हूँ',
    explanation: 'Specific imagery (morning tea). Natural Hindi. Modern conversational style.',
    context: 'Modern Hindi indie/pop',
  },
  
  // URDU SHAYARI INFLUENCE
  {
    type: 'authentic',
    text: 'इश्क़ में ग़ैरत-ए-जज़्बात ने रोने न दिया / वर्ना क्या बात थी किस बात ने रोने न दिया',
    explanation: 'Pure Urdu Ghazal structure. Qafiya (roNE) and Radif (nA diyA). Each line complete thought.',
    context: 'Traditional Ghazal - Jagjit Singh style',
  },
  
  // BAD EXAMPLES (AVOID)
  {
    type: 'avoid',
    text: 'बेबी बेबी ऊह / तुम मेरी सनशाइन हो / मुझे बहुत प्यार है तुमसे',
    explanation: 'Direct English translation ("baby baby ooh", "sunshine"). Awkward Hindi "mujhe bahut pyaar hai tumse" (too literal).',
    context: 'AVOID - AI-translated garbage',
  },
  
  {
    type: 'avoid',
    text: 'मेरा दिल आग में है / तुम मुझे ऊंचा और ऊंचा ले जाते हो / हमारा प्यार कभी नहीं मरेगा',
    explanation: 'Literal translation of English clichés. "Dil aag mein hai" (heart on fire), "uncha aur uncha" (higher and higher) - doesn\'t work in Hindi.',
    context: 'AVOID - Translated English clichés',
  },
  
  {
    type: 'avoid',
    text: 'लड़की तुम इतनी सुंदर हो / हमारा प्यार अद्भुत है / साथ में हम अजेय हैं',
    explanation: 'Generic, no emotion, literal words. "Adbhut" (wonderful) too formal. "Ajey" (unstoppable) sounds translated.',
    context: 'AVOID - Generic AI nonsense',
  },
  
  // REFERENCE (ACTUAL BOLLYWOOD HITS)
  {
    type: 'reference',
    text: 'कभी कभी अदिति ज़िन्दगी में युं ही कोई अपना लगता है / कभी कभी वो बिछड़ के दूर दूर हो जाता है',
    explanation: 'Classic Bollywood structure. Natural Hindi. Deep emotion without being melodramatic. (Kabhi Kabhie - 1976)',
    context: 'Classic Bollywood reference',
  },
  
  {
    type: 'reference',
    text: 'तू जो मिला तो मुझको यकीं आया / के प्यार होता है',
    explanation: 'Simple words, deep meaning. Colloquial "tu jo mila". Modern Bollywood emotional style. (Bajrangi Bhaijaan - 2015)',
    context: 'Modern Bollywood hit reference',
  },
];

// ==================== HINDI LANGUAGE CONFIG ====================

export const hindiConfig: LanguageConfig = {
  id: 'hindi',
  name: 'Hindi',
  nativeName: 'हिन्दी',
  tier: 'tier1',
  
  scripts: ['Devanagari (देवनागरी)', 'Romanized (Latin)'],
  
  dialects: [
    'Standard Hindi (मानक हिन्दी)',
    'Bollywood Hindi (फ़िल्मी हिन्दी)',
    'Hindustani (हिन्दुस्तानी) - Hindi with Urdu words',
    'Urban Hindi (शहरी हिन्दी)',
  ],
  
  musicalTraditions: hindiMusicalTraditions,
  poeticDevices: hindiPoeticDevices,
  singingStyles: hindiSingingStyles,
  musicalScales: hindiMusicalScales,
  
  commonInstruments: [
    'Tabla (तबला)',
    'Harmonium (हारमोनियम)',
    'Sitar (सितार)',
    'Dholak (ढोलक)',
    'Dhol (ढोल)',
    'Flute/Bansuri (बांसुरी)',
    'Sarangi (सारंगी)',
    'Tanpura (तानपुरा)',
    'Modern Synthesizers',
    'Strings (Orchestral)',
  ],
  
  culturalThemes: [
    'इश्क़ (Ishq) - Love (deeper than Pyaar)',
    'जुदाई (Judaai) - Separation',
    'मिलन (Milan) - Union',
    'याद (Yaad) - Memory/Remembrance',
    'दर्द (Dard) - Pain/Heartache',
    'ख़ुशी (Khushi) - Happiness',
    'सावन (Saawan) - Monsoon/Romance',
    'भक्ति (Bhakti) - Devotion',
    'तन्हाई (Tanhai) - Loneliness',
    'ग़म (Gham) - Sorrow',
    'मस्ती (Masti) - Joy/Intoxication',
  ],
  
  lyricExamples: hindiLyricExamples,
  
  enabled: true,
};

// ==================== BOLLYWOOD SONG STRUCTURES ====================

export const bollywoodSongStructures = {
  romantic: {
    standard: ['mukhda', 'antara', 'mukhda', 'antara', 'mukhda', 'bridge', 'mukhda'],
    classic: ['intro', 'mukhda', 'interlude', 'antara', 'mukhda', 'interlude', 'antara', 'mukhda', 'outro'],
    modern: ['intro', 'mukhda', 'antara', 'mukhda', 'antara', 'bridge', 'mukhda', 'mukhda'],
  },
  
  upbeat: {
    standard: ['intro', 'mukhda', 'antara', 'mukhda', 'antara', 'mukhda', 'outro'],
    dance: ['intro', 'mukhda', 'dhol-break', 'antara', 'mukhda', 'rap-section', 'mukhda'],
  },
  
  sad: {
    standard: ['mukhda', 'antara', 'mukhda', 'antara', 'mukhda'],
    ghazalInfluenced: ['mukhda', 'antara', 'mukhda', 'antara', 'mukhda', 'outro'],
  },
  
  qawwali: {
    standard: ['intro-chant', 'mukhda', 'antara', 'mukhda', 'antara', 'mukhda', 'building-intensity', 'final-mukhda'],
  },
};

// ==================== URDU VOCABULARY GUIDE ====================

export const urduVocabularyGuide = {
  love: {
    basic: 'प्यार (Pyaar)',
    poetic: 'इश्क़ (Ishq)',
    deep: 'मोहब्बत (Mohabbat)',
    passionate: 'आशिक़ी (Aashiqui)',
  },
  
  pain: {
    basic: 'दुःख (Dukh)',
    poetic: 'ग़म (Gham)',
    heartache: 'दर्द (Dard)',
    suffering: 'अज़ाब (Azaab)',
  },
  
  separation: {
    basic: 'अलगाव (Alagaav)',
    poetic: 'जुदाई (Judaai)',
    distance: 'दूरी (Doori)',
    farewell: 'विदा (Vidaa)',
  },
  
  beauty: {
    basic: 'सुंदरता (Sundarta)',
    poetic: 'हुस्न (Husn)',
    charm: 'अदा (Ada)',
    elegance: 'नाज़ुकी (Naazuki)',
  },
  
  heart: {
    basic: 'हृदय (Hriday)',
    poetic: 'दिल (Dil)',
    soul: 'रूह (Rooh)',
    self: 'ज़ात (Zaat)',
  },
};

// ==================== CULTURAL NOTES ====================

export const hindiCulturalNotes = {
  monsoon: 'Sawan (monsoon season) is deeply romantic in Hindi culture. Associated with separation, longing, and romance.',
  honorifics: 'Use "aap" (आप) for respect, "tum" (तुम) for intimacy, "tu" (तू) for very close/poetic.',
  metaphors: {
    moon: 'Chaand (चाँद) represents beauty and the beloved',
    night: 'Raat (रात) represents loneliness and longing',
    rain: 'Baarish (बारिश) represents sadness and romance',
    eyes: 'Aankhein (आँखें) are windows to emotion and love',
  },
  avoidances: [
    'Don\'t translate English idioms literally',
    'Avoid overuse of "baby" - sounds unnatural in Hindi',
    'Don\'t mix too much English in traditional/classical styles',
    'Be careful with religious metaphors - context matters',
  ],
};

// ==================== EXPORT ====================

export default hindiConfig;
