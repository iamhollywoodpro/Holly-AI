/**
 * HOLLY Tool Hub — Core Types
 *
 * Defines the shared interfaces used across all hub tools:
 * AURA, Sentinel, and any future tools registered in the framework.
 */

// ─── Tool identity ────────────────────────────────────────────────────────────

export type ToolId = 'aura' | 'sentinel' | string;

export interface ToolManifest {
  id:          ToolId;
  name:        string;
  version:     string;
  description: string;
  author:      string;
  category:    'music' | 'code' | 'analytics' | 'creative' | 'utility';
  actions:     ActionManifest[];
  baseUrl:     string;   // e.g. /api/hub/aura
  auth:        'hub_key' | 'public';
  rateLimit:   { rpm: number; rpd: number };
  status:      'active' | 'beta' | 'maintenance';
}

export interface ActionManifest {
  id:          string;
  name:        string;
  description: string;
  method:      'POST' | 'GET';
  path:        string;              // relative to baseUrl
  inputSchema: Record<string, FieldSchema>;
  outputSchema: Record<string, FieldSchema>;
  example:     { input: Record<string, unknown>; output: Record<string, unknown> };
}

export interface FieldSchema {
  type:        'string' | 'number' | 'boolean' | 'array' | 'object';
  required:    boolean;
  description: string;
  example?:    unknown;
  enum?:       string[];
}

// ─── Hub request / response ───────────────────────────────────────────────────

export interface HubRequest {
  tool:    ToolId;
  action:  string;
  payload: Record<string, unknown>;
}

export interface HubResponse<T = unknown> {
  ok:        boolean;
  tool:      ToolId;
  action:    string;
  requestId: string;
  timestamp: string;
  duration:  number;   // ms
  data?:     T;
  error?:    string;
  code?:     string;
  meta?: {
    model?:    string;
    tokens?:   number;
    provider?: string;
  };
}

// ─── Logging ──────────────────────────────────────────────────────────────────

export interface HubLogEntry {
  requestId:  string;
  timestamp:  string;
  tool:       ToolId;
  action:     string;
  userId?:    string;
  apiKeyId?:  string;
  duration:   number;
  status:     'success' | 'error' | 'rate_limited';
  statusCode: number;
  errorMsg?:  string;
  inputSize:  number;   // bytes
  outputSize: number;   // bytes
}

// ─── Per-tool action inputs / outputs ────────────────────────────────────────

// — AURA —

export interface AnalyzeSongInput {
  title:       string;
  artist?:     string;
  genre?:      string;
  lyrics?:     string;       // full lyrics text
  audioUrl?:   string;       // URL to audio file (future: real audio analysis)
  bpm?:        number;
  key?:        string;       // e.g. "C major"
  mood?:       string;
}

export interface AnalyzeSongOutput {
  structure:      SongStructure;
  melody:         MelodyAnalysis;
  lyrics:         LyricsAnalysis;
  patterns:       string[];
  trends:         string[];
  overallScore:   number;    // 0-100
  summary:        string;
}

export interface SongStructure {
  sections:  string[];       // e.g. ["intro", "verse", "chorus", "bridge", "outro"]
  tempo:     'slow' | 'medium' | 'fast' | 'variable';
  timeSignature: string;
  estimatedDuration: string;
}

export interface MelodyAnalysis {
  range:        string;      // e.g. "G3 – D5"
  complexity:   'simple' | 'moderate' | 'complex';
  hooks:        string[];
  intervals:    string[];
  key:          string;
  mode:         string;
}

export interface LyricsAnalysis {
  themes:       string[];
  sentiment:    'positive' | 'negative' | 'neutral' | 'mixed';
  rhymeScheme:  string;
  vocabulary:   'simple' | 'moderate' | 'sophisticated';
  wordCount:    number;
  uniqueWords:  number;
  chorus:       string | null;
}

export interface GenerateRecommendationsInput {
  title:       string;
  artist?:     string;
  genre?:      string;
  lyrics?:     string;
  currentKey?: string;
  currentBpm?: number;
  targetMood?: string;
  targetAudience?: string;
  areas?:      Array<'melody' | 'chords' | 'lyrics' | 'structure' | 'production'>;
}

export interface GenerateRecommendationsOutput {
  recommendations: Recommendation[];
  chordProgressions: ChordProgression[];
  melodyIdeas:      string[];
  lyricsEdits:      LyricsEdit[];
  productionTips:   string[];
  summary:          string;
}

export interface Recommendation {
  area:        string;
  priority:    'high' | 'medium' | 'low';
  suggestion:  string;
  rationale:   string;
  example?:    string;
}

export interface ChordProgression {
  name:        string;
  chords:      string[];
  genre:       string;
  mood:        string;
  description: string;
}

export interface LyricsEdit {
  original:    string;
  suggested:   string;
  reason:      string;
}

export interface IdentifyHitPotentialInput {
  title:       string;
  artist?:     string;
  genre:       string;
  lyrics?:     string;
  targetMarket?: string;    // e.g. "US mainstream", "UK indie"
  releaseDate?: string;     // planned release
  similarArtists?: string[];
  streamingPlatforms?: string[];
}

export interface IdentifyHitPotentialOutput {
  hitScore:       number;   // 0–100
  verdict:        'high' | 'medium' | 'low';
  confidence:     number;   // 0–1
  marketAnalysis: MarketAnalysis;
  strengths:      string[];
  weaknesses:     string[];
  opportunities:  string[];
  comparables:    ComparableTrack[];
  recommendation: string;
}

export interface MarketAnalysis {
  genreTrend:     'rising' | 'stable' | 'declining';
  audienceMatch:  number;   // 0–100
  platformFit:    Record<string, number>;
  seasonality:    string;
  competitionLevel: 'low' | 'medium' | 'high';
}

export interface ComparableTrack {
  title:   string;
  artist:  string;
  reason:  string;
}

// — SENTINEL —

export interface AnalyzeCodeInput {
  code:        string;
  language:    string;       // e.g. "typescript", "python", "javascript"
  filename?:   string;
  context?:    string;       // what the code is supposed to do
  focusAreas?: Array<'errors' | 'performance' | 'security' | 'style' | 'all'>;
}

export interface AnalyzeCodeOutput {
  score:        number;      // 0–100 overall quality
  errors:       CodeIssue[];
  warnings:     CodeIssue[];
  suggestions:  CodeIssue[];
  performance:  PerformanceInsight[];
  security:     SecurityInsight[];
  metrics:      CodeMetrics;
  summary:      string;
  fixedCode?:   string;      // auto-corrected version if errors found
}

export interface CodeIssue {
  line?:       number;
  column?:     number;
  severity:    'error' | 'warning' | 'info';
  code:        string;       // e.g. "TS2345"
  message:     string;
  fix?:        string;
}

export interface PerformanceInsight {
  type:        string;
  description: string;
  impact:      'high' | 'medium' | 'low';
  suggestion:  string;
}

export interface SecurityInsight {
  type:        string;
  description: string;
  severity:    'critical' | 'high' | 'medium' | 'low';
  cwe?:        string;       // CWE identifier
  fix:         string;
}

export interface CodeMetrics {
  lines:           number;
  functions:       number;
  complexity:      number;   // cyclomatic complexity
  maintainability: number;   // 0–100
  testability:     number;   // 0–100
  duplicateLines:  number;
}

export interface GenerateCodeInput {
  description:  string;
  language:     string;
  framework?:   string;
  style?:       string;       // e.g. "functional", "OOP", "hooks"
  context?:     string;       // surrounding code / imports
  requirements?: string[];
  examples?:    string[];
}

export interface GenerateCodeOutput {
  code:         string;
  language:     string;
  explanation:  string;
  usage:        string;
  dependencies: string[];
  tests?:       string;       // generated unit tests
  notes:        string[];
}
