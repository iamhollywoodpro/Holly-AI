/**
 * HOLLY Music System — Core Types
 *
 * Shared type definitions used by all language-specific music configuration
 * files in src/lib/music/languages/{lang}/
 */

// ── Musical Traditions ────────────────────────────────────────────────────────

export interface MusicalTradition {
  id: string;
  name: string;
  /** e.g. 'modern' | 'folk' | 'classical' | 'traditional' */
  category: string;
  description: string;
  characteristics: string[];
  typicalInstruments: string[];
  /** Guidance for vocal style coaching / Suno prompt hints */
  vocaStyleGuidance: string;
}

// ── Poetic Devices ────────────────────────────────────────────────────────────

export interface PoeticDevice {
  name: string;
  /** e.g. 'rhyme' | 'metaphor' | 'structure' | 'imagery' */
  type: string;
  description: string;
  examples: string[];
  usage: string;
}

// ── Singing Styles ────────────────────────────────────────────────────────────

export interface SingingStyle {
  id: string;
  name: string;
  characteristics: string[];
  vocalTechniques: string[];
  emotionalDelivery: string;
  culturalContext: string;
  referenceArtists: string[];
  /** Tags to append to a Suno / ACE-Step prompt */
  sunoStyleHints: string[];
}

// ── Musical Scales ────────────────────────────────────────────────────────────

export interface MusicalScale {
  id: string;
  name: string;
  /** e.g. 'major' | 'minor' | 'pentatonic' | 'modal' */
  type: string;
  notes: string[];
  mood: string;
  culturalContext: string;
  emotionalEffect: string;
  usage: string;
  /** Raga-specific: traditional time of day for performance (e.g. Hindi ragas) */
  timeOfDay?: string;
  /** Raga-specific: associated season for performance */
  season?: string;
}

// ── Lyric Examples ────────────────────────────────────────────────────────────

export interface LyricExample {
  /** 'authentic' | 'reference' | 'avoid' */
  type: 'authentic' | 'reference' | 'avoid';
  text: string;
  explanation: string;
  context: string;
}

// ── Language Configuration (top-level) ───────────────────────────────────────

export interface LanguageConfig {
  id: string;
  name: string;
  /** Name of the language in that language itself */
  nativeName: string;
  /** Support tier: 'tier1' (full) | 'tier2' (partial) | 'tier3' (basic) */
  tier: 'tier1' | 'tier2' | 'tier3';
  /** Writing systems used e.g. ['Latin'] | ['Devanagari'] | ['Kanji', 'Hiragana'] */
  scripts: string[];
  dialects?: string[];
  musicalTraditions: MusicalTradition[];
  poeticDevices: PoeticDevice[];
  singingStyles: SingingStyle[];
  musicalScales: MusicalScale[];
  commonInstruments: string[];
  culturalThemes: string[];
  lyricExamples: LyricExample[];
  enabled: boolean;
}
