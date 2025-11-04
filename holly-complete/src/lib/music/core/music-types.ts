/**
 * HOLLY - Multi-Language Music Generation System
 * Core Type Definitions
 * 
 * Universal types for authentic multi-language music creation
 */

// ==================== LANGUAGE SYSTEM ====================

export type SupportedLanguage = 
  | 'english'
  | 'hindi'
  | 'tamil'
  | 'malayalam'
  | 'portuguese-eu'
  | 'italian'
  | 'spanish'
  | 'telugu'
  | 'kannada'
  | 'marathi'
  | 'bengali'
  | 'punjabi';

export type LanguageTier = 'tier1' | 'tier2' | 'tier3';

export interface LanguageConfig {
  id: SupportedLanguage;
  name: string;
  nativeName: string;
  tier: LanguageTier;
  scripts: string[];
  dialects: string[];
  musicalTraditions: MusicalTradition[];
  poeticDevices: PoeticDevice[];
  singingStyles: SingingStyle[];
  musicalScales: MusicalScale[];
  commonInstruments: string[];
  culturalThemes: string[];
  lyricExamples: LyricExample[];
  enabled: boolean;
}

// ==================== MUSICAL TRADITIONS ====================

export interface MusicalTradition {
  id: string;
  name: string;
  category: 'classical' | 'folk' | 'modern' | 'religious' | 'fusion';
  description: string;
  characteristics: string[];
  typicalInstruments: string[];
  vocaStyleGuidance: string;
}

// ==================== SONG STRUCTURE ====================

export type SongSection = 
  | 'intro'
  | 'verse1'
  | 'verse2'
  | 'verse3'
  | 'pre-chorus'
  | 'chorus'
  | 'bridge'
  | 'outro'
  | 'hook'
  | 'rap-verse'
  | 'interlude'
  // Hindi/Bollywood specific
  | 'mukhda'
  | 'antara'
  | 'sthayi'
  // Other cultural sections
  | 'charanam'
  | 'pallavi';

export interface SongStructure {
  sections: SongSection[];
  repetitionPattern: string;
  totalLength: 'short' | 'medium' | 'long'; // 2-3min, 3-4min, 4-5min+
  culturalFormat?: string; // e.g., "Bollywood Mukhda-Antara", "Western Verse-Chorus"
}

// ==================== LYRICS SYSTEM ====================

export interface LyricLine {
  text: string;
  section: SongSection;
  lineNumber: number;
  syllableCount?: number;
  rhymeScheme?: string;
  transliteration?: string; // For non-Latin scripts
  translation?: string; // English translation if needed
  culturalNotes?: string[];
}

export interface LyricContent {
  language: SupportedLanguage;
  title: string;
  structure: SongStructure;
  lines: LyricLine[];
  fullText: string;
  metadata: {
    theme: string;
    mood: string;
    genre: string;
    culturalContext?: string;
    targetAudience?: string;
  };
}

// ==================== POETIC DEVICES ====================

export interface PoeticDevice {
  name: string;
  type: 'rhyme' | 'meter' | 'metaphor' | 'structure' | 'cultural';
  description: string;
  examples: string[];
  usage: string;
}

export interface RhymeScheme {
  pattern: string; // e.g., "AABB", "ABAB", "AAAA"
  type: 'end-rhyme' | 'internal-rhyme' | 'slant-rhyme' | 'qafiya' | 'radif';
  culturalOrigin?: string;
}

// ==================== MUSICAL THEORY ====================

export interface MusicalScale {
  id: string;
  name: string;
  type: 'major' | 'minor' | 'modal' | 'pentatonic' | 'raga' | 'maqam';
  notes: string[];
  mood: string;
  culturalContext: string;
  timeOfDay?: string; // For ragas
  season?: string; // For ragas
  emotionalEffect: string;
  usage: string;
}

export interface RhythmPattern {
  id: string;
  name: string;
  type: 'tala' | 'compás' | 'western' | 'african' | 'latin';
  beats: number;
  subdivision: string;
  culturalOrigin: string;
  usage: string;
}

// ==================== SINGING STYLES ====================

export interface SingingStyle {
  id: string;
  name: string;
  characteristics: string[];
  vocalTechniques: string[];
  emotionalDelivery: string;
  culturalContext: string;
  referenceArtists?: string[];
  sunoStyleHints: string[]; // How to describe this in Suno API
}

// ==================== CULTURAL AUTHENTICITY ====================

export interface CulturalContext {
  region: string;
  culturalReferences: string[];
  socialNorms: string[];
  metaphorSources: string[]; // Nature, urban, religious, etc.
  tabooTopics?: string[];
  preferredThemes: string[];
  seasonalReferences?: {
    season: string;
    associations: string[];
  }[];
}

export interface AuthenticityCheck {
  category: 'language' | 'culture' | 'music' | 'poetic' | 'style';
  passed: boolean;
  score: number; // 0-100
  issues: string[];
  suggestions: string[];
  autoFixAvailable: boolean;
}

export interface AuthenticityReport {
  overallScore: number;
  checks: AuthenticityCheck[];
  culturallyAuthentic: boolean;
  recommendations: string[];
}

// ==================== LYRIC GENERATION ====================

export interface LyricGenerationParams {
  language: SupportedLanguage;
  concept: string;
  genre: string;
  mood: string;
  structure?: SongStructure;
  musicalTradition?: string;
  vocalStyle?: string;
  culturalContext?: Partial<CulturalContext>;
  includeTranslation?: boolean;
  includeTransliteration?: boolean;
  referenceArtists?: string[];
  customInstructions?: string;
}

export interface LyricGenerationResult {
  lyrics: LyricContent;
  authenticityReport: AuthenticityReport;
  culturalGuidance: string[];
  musicTheoryRecommendations: {
    suggestedScales: MusicalScale[];
    suggestedRhythms: RhythmPattern[];
    instrumentRecommendations: string[];
  };
  sunoStylePrompt: string;
  alternatives?: LyricContent[]; // Multiple variations
}

// ==================== SUNO API INTEGRATION ====================

export interface SunoGenerationParams {
  lyrics: string;
  stylePrompt: string;
  title: string;
  instrumental: boolean;
  language?: string;
  makeInstrumental?: boolean;
  waitAudio?: boolean;
}

export interface SunoTrack {
  id: string;
  title: string;
  audioUrl: string;
  videoUrl?: string;
  imageUrl?: string;
  imageUrlLarge?: string;
  status: 'queued' | 'generating' | 'complete' | 'error';
  modelName?: string;
  gptDescriptionPrompt?: string;
  prompt?: string;
  style?: string;
  tags?: string;
  duration?: number;
  createdAt: string;
  error?: string;
}

export interface SunoGenerationResult {
  success: boolean;
  tracks: SunoTrack[];
  estimatedWaitTime?: number;
  error?: string;
}

// ==================== MUSIC GENERATION WORKFLOW ====================

export interface MusicGenerationRequest {
  // Step 1: Lyric Generation
  lyricParams: LyricGenerationParams;
  
  // Step 2: Optional Refinement
  allowUserEditing: boolean;
  
  // Step 3: Audio Generation
  sunoParams?: Partial<SunoGenerationParams>;
  
  // Additional Options
  generateMultipleVersions: boolean;
  versionsCount?: number; // Default 2 (Suno standard)
}

export interface MusicGenerationResponse {
  // Lyric Stage
  generatedLyrics: LyricContent;
  authenticityReport: AuthenticityReport;
  
  // Audio Stage
  audioTracks: SunoTrack[];
  
  // Metadata
  generationId: string;
  createdAt: string;
  language: SupportedLanguage;
  genre: string;
  mood: string;
}

// ==================== USER INTERFACE ====================

export interface MusicGeneratorUIState {
  // Language Selection
  selectedLanguage: SupportedLanguage;
  selectedDialect?: string;
  selectedMusicalTradition?: string;
  
  // Concept Input
  concept: string;
  genre: string;
  mood: string;
  referenceArtists: string[];
  
  // Advanced Options
  customStructure?: SongStructure;
  musicalScale?: string;
  rhythmPattern?: string;
  instruments: string[];
  vocalStyle?: string;
  
  // Lyric Editing
  generatedLyrics?: LyricContent;
  userEditedLyrics?: string;
  showTranslation: boolean;
  showTransliteration: boolean;
  
  // Cultural Guidance
  showCulturalTips: boolean;
  activeTips: string[];
  
  // Generation Status
  isGeneratingLyrics: boolean;
  isGeneratingAudio: boolean;
  audioGenerationStatus?: 'queued' | 'generating' | 'complete' | 'error';
  
  // Results
  generatedTracks: SunoTrack[];
  selectedTrackForPlayback?: string;
}

// ==================== EXAMPLE DATA ====================

export interface LyricExample {
  type: 'authentic' | 'avoid' | 'reference';
  text: string;
  explanation: string;
  context?: string;
}

// ==================== EXPORT ALL ====================

export type {
  LanguageConfig,
  MusicalTradition,
  SongStructure,
  LyricContent,
  PoeticDevice,
  RhymeScheme,
  MusicalScale,
  RhythmPattern,
  SingingStyle,
  CulturalContext,
  AuthenticityCheck,
  AuthenticityReport,
  LyricGenerationParams,
  LyricGenerationResult,
  SunoGenerationParams,
  SunoTrack,
  SunoGenerationResult,
  MusicGenerationRequest,
  MusicGenerationResponse,
  MusicGeneratorUIState,
  LyricExample,
  LyricLine,
};
