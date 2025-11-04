// ============================================
// HOLLY MUSIC STUDIO - TYPESCRIPT TYPES
// ============================================

export type GenerationStatus = 'pending' | 'processing' | 'complete' | 'failed';

export type Language = 
  | 'en'    // English
  | 'ml'    // Malayalam
  | 'hi'    // Hindi
  | 'pt'    // Portuguese EU
  | 'es'    // Spanish
  | 'it'    // Italian
  | 'pt-br' // Brazilian Portuguese
  | 'el'    // Greek
  | 'ja'    // Japanese
  | 'ko'    // Korean
  | 'ar'    // Arabic
  | 'fr'    // French
  | 'de';   // German

export interface Song {
  id: string;
  user_id: string;
  
  // Metadata
  title: string;
  artist_id?: string;
  artist?: Artist; // Populated via join
  
  // Content
  lyrics?: string;
  style: string;
  language: Language;
  
  // Audio
  audio_url?: string;
  artwork_url?: string;
  duration?: number; // seconds
  
  // Suno
  suno_song_id?: string;
  suno_metadata?: Record<string, any>;
  
  // Status
  generation_status: GenerationStatus;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Computed
  is_liked?: boolean;
}

export interface Artist {
  id: string;
  user_id: string;
  
  // Basic info
  name: string;
  bio?: string;
  avatar_url?: string;
  
  // Preferences
  style_preferences: string[];
  vocal_characteristics: {
    tone?: string;
    range?: string;
    style?: string;
    energy?: string;
  };
  language_preferences: Language[];
  
  // AI settings
  image_generation_prompt?: string;
  
  // Stats
  song_count: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  
  // Info
  name: string;
  description?: string;
  cover_url?: string;
  
  // Settings
  is_public: boolean;
  
  // Stats
  song_count: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Populated
  songs?: Song[];
}

export interface PlaylistSong {
  playlist_id: string;
  song_id: string;
  position: number;
  added_at: string;
  song?: Song;
}

export interface MusicVideo {
  id: string;
  song_id: string;
  user_id: string;
  
  // Video info
  title: string;
  video_url?: string;
  thumbnail_url?: string;
  duration?: number;
  
  // Generation
  style_prompt: string;
  video_generation_metadata?: Record<string, any>;
  
  // Status
  generation_status: GenerationStatus;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Populated
  song?: Song;
}

export interface SongLike {
  user_id: string;
  song_id: string;
  created_at: string;
}

// ============================================
// API TYPES
// ============================================

export interface GenerateSongRequest {
  lyrics?: string;
  style: string;
  language?: Language; // Optional - will auto-detect
  artist_id?: string;
  title?: string;
}

export interface GenerateSongResponse {
  song_id: string;
  status: GenerationStatus;
  message: string;
}

export interface GenerateLyricsRequest {
  theme?: string;
  style: string;
  language?: Language; // Optional - will auto-detect from theme
  artist_id?: string;
  length?: 'short' | 'medium' | 'long';
}

export interface GenerateLyricsResponse {
  lyrics: string;
  detected_language: Language;
  cultural_notes?: string[];
}

export interface DetectLanguageRequest {
  text: string;
}

export interface DetectLanguageResponse {
  language: Language;
  confidence: number;
  detected_languages: Array<{
    language: Language;
    confidence: number;
  }>;
}

export interface GenerateArtistImageRequest {
  artist_id: string;
  prompt?: string;
  use_artist_style?: boolean;
}

export interface GenerateArtistImageResponse {
  avatar_url: string;
  generation_metadata: Record<string, any>;
}

export interface CreateMusicVideoRequest {
  song_id: string;
  style_prompt: string;
  use_artist_likeness?: boolean;
}

export interface CreateMusicVideoResponse {
  video_id: string;
  status: GenerationStatus;
  estimated_completion: string;
}

// ============================================
// SUNO API TYPES
// ============================================

export interface SunoGenerateRequest {
  lyrics: string;
  style: string;
  title?: string;
  make_instrumental?: boolean;
}

export interface SunoSong {
  id: string;
  title: string;
  audio_url: string;
  image_url?: string;
  duration: number;
  status: 'queued' | 'processing' | 'complete' | 'error';
  metadata: {
    style: string;
    created_at: string;
  };
}

export interface SunoGenerateResponse {
  songs: SunoSong[];
  credits_remaining: number;
}

// ============================================
// UI STATE TYPES
// ============================================

export interface MusicPlayerState {
  currentSong?: Song;
  isPlaying: boolean;
  currentTime: number;
  volume: number;
  isMuted: boolean;
  isRepeat: boolean;
  isShuffle: boolean;
  queue: Song[];
  queuePosition: number;
}

export interface CreateTabState {
  lyrics: string;
  style: string;
  language?: Language;
  selectedArtistId?: string;
  isGenerating: boolean;
  error?: string;
}

export interface LibraryFilter {
  search?: string;
  language?: Language;
  artist_id?: string;
  sort_by?: 'created_at' | 'title' | 'duration';
  sort_order?: 'asc' | 'desc';
}

// ============================================
// CULTURAL SYSTEM TYPES
// ============================================

export interface MusicalTradition {
  name: string;
  description: string;
  characteristics: string[];
  instruments: string[];
  example_artists?: string[];
}

export interface PoeticDevice {
  name: string;
  description: string;
  example: string;
}

export interface SingingStyle {
  name: string;
  description: string;
  characteristics: string[];
}

export interface LanguageConfig {
  code: Language;
  name: string;
  native_name: string;
  
  // Cultural context
  cultural_context: string;
  untranslatable_concept?: {
    term: string;
    meaning: string;
    usage: string;
  };
  
  // Musical elements
  musical_traditions: MusicalTradition[];
  poetic_devices: PoeticDevice[];
  singing_styles: SingingStyle[];
  musical_scales: string[];
  
  // Writing guidance
  lyric_examples: {
    authentic: string[];
    avoid: string[];
  };
  
  // Cultural notes
  cultural_notes: string[];
  common_themes: string[];
}

// ============================================
// HOOK TYPES
// ============================================

export interface UseMusicGenerationOptions {
  onSuccess?: (song: Song) => void;
  onError?: (error: Error) => void;
}

export interface UseMusicGenerationReturn {
  generateSong: (request: GenerateSongRequest) => Promise<Song>;
  generateLyrics: (request: GenerateLyricsRequest) => Promise<string>;
  detectLanguage: (text: string) => Promise<Language>;
  isGenerating: boolean;
  error?: string;
}

export interface UseArtistsReturn {
  artists: Artist[];
  selectedArtist?: Artist;
  createArtist: (artist: Omit<Artist, 'id' | 'user_id' | 'song_count' | 'created_at' | 'updated_at'>) => Promise<Artist>;
  updateArtist: (id: string, updates: Partial<Artist>) => Promise<Artist>;
  deleteArtist: (id: string) => Promise<void>;
  selectArtist: (id: string) => void;
  generateAvatar: (artistId: string, prompt?: string) => Promise<string>;
  isLoading: boolean;
  error?: string;
}

export interface UsePlaylistsReturn {
  playlists: Playlist[];
  selectedPlaylist?: Playlist;
  createPlaylist: (playlist: Omit<Playlist, 'id' | 'user_id' | 'song_count' | 'created_at' | 'updated_at'>) => Promise<Playlist>;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<Playlist>;
  deletePlaylist: (id: string) => Promise<void>;
  addSongToPlaylist: (playlistId: string, songId: string) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songId: string) => Promise<void>;
  reorderPlaylist: (playlistId: string, songId: string, newPosition: number) => Promise<void>;
  isLoading: boolean;
  error?: string;
}

export interface UseAudioPlayerReturn {
  state: MusicPlayerState;
  play: (song?: Song) => void;
  pause: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  addToQueue: (song: Song) => void;
  clearQueue: () => void;
}
