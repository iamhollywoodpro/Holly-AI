/**
 * AURA A&R Analysis Types
 * Types for AURA music analysis and A&R features
 */

/**
 * Analysis status
 */
export type AnalysisStatus = 'queued' | 'processing' | 'completed' | 'failed';

/**
 * Recommendation priority
 */
export type RecommendationPriority = 'low' | 'medium' | 'high';

/**
 * Recommendation type
 */
export type RecommendationType = 
  | 'production'
  | 'mixing'
  | 'mastering'
  | 'arrangement'
  | 'lyrics'
  | 'vocals'
  | 'marketing'
  | 'branding';

/**
 * Track upload request
 */
export interface TrackUploadRequest {
  trackTitle: string;
  artistName: string;
  genre?: string;
  audioFile: File;
  lyricsText?: string;
  artworkFile?: File;
  referenceTrack?: string;
}

/**
 * Analysis job response
 */
export interface AnalysisJobResponse {
  jobId: string;
  status: AnalysisStatus;
  message: string;
}

/**
 * Analysis status response
 */
export interface AnalysisStatusResponse {
  jobId: string;
  status: AnalysisStatus;
  progress: number; // 0-100
  currentStep?: string;
  estimatedTimeRemaining?: number; // seconds
}

/**
 * Recommendation
 */
export interface Recommendation {
  type: RecommendationType;
  note: string;
  priority: RecommendationPriority;
}

/**
 * Similar hit
 */
export interface SimilarHit {
  song: string;
  artist: string;
  year: number;
  similarity: number; // 0-1
  spotifyUrl?: string;
  imageUrl?: string;
}

/**
 * Score breakdown
 */
export interface ScoreBreakdown {
  overall: number; // 0-100
  audio: number;
  lyrics: number;
  brand: number;
  market: number;
}

/**
 * Analysis result
 */
export interface AnalysisResult {
  jobId: string;
  status: AnalysisStatus;
  
  // Track info
  trackTitle: string;
  artistName: string;
  genre?: string;
  audioUrl: string;
  artworkUrl?: string;
  
  // Scores
  hitFactor: number; // 0-100
  scores: ScoreBreakdown;
  
  // Results
  recommendations: Recommendation[];
  similarHits: SimilarHit[];
  
  // Metadata
  modelVersion: string;
  processingTime: number; // milliseconds
  completedAt: Date;
}

/**
 * Analysis history item
 */
export interface AnalysisHistoryItem {
  id: string;
  jobId: string;
  trackTitle: string;
  artistName: string;
  hitFactor?: number;
  status: AnalysisStatus;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: Date;
  completedAt?: Date;
}
