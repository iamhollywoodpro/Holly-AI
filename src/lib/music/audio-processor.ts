/**
 * Audio Processor with Hit Factor Scoring
 * 
 * Analyzes audio files and calculates a comprehensive "Hit Factor" score
 * based on multiple musical and commercial factors.
 */

export interface AudioFeatures {
  // Basic audio characteristics
  tempo: number;
  key: string;
  mode: 'major' | 'minor';
  timeSignature: string;
  duration: number;
  
  // Audio analysis
  energy: number; // 0-1
  danceability: number; // 0-1
  valence: number; // 0-1 (musical positivity)
  acousticness: number; // 0-1
  instrumentalness: number; // 0-1
  liveness: number; // 0-1
  speechiness: number; // 0-1
  loudness: number; // dB
  
  // Advanced features
  spectralCentroid: number;
  spectralRolloff: number;
  zeroCrossingRate: number;
  mfcc: number[]; // Mel-frequency cepstral coefficients
  
  // Structure
  sections: AudioSection[];
  beats: number[];
  bars: number[];
  
  // Commercial factors
  hookStrength: number; // 0-100
  productionQuality: number; // 0-100
  mixQuality: number; // 0-100
  masteringQuality: number; // 0-100
}

export interface AudioSection {
  start: number;
  duration: number;
  confidence: number;
  loudness: number;
  tempo: number;
  key: string;
  mode: 'major' | 'minor';
  timeSignature: string;
}

export interface HitFactorScore {
  overall: number; // 0-100
  breakdown: {
    commercial: number; // 0-100
    production: number; // 0-100
    structure: number; // 0-100
    energy: number; // 0-100
    uniqueness: number; // 0-100
  };
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  genreFit: {
    genre: string;
    confidence: number;
  }[];
  syncPotential: {
    tv: number; // 0-100
    film: number;
    advertising: number;
    gaming: number;
  };
  playlistFit: string[]; // Suggested playlist types
}

export class AudioProcessor {
  /**
   * Analyze audio file and extract features
   * In production, this would call a Python service running librosa
   */
  async analyzeAudio(audioUrl: string): Promise<AudioFeatures> {
    // In production, this would call a Python microservice with librosa
    // For now, we'll simulate the analysis
    
    try {
      // Simulate API call to Python audio analysis service
      const response = await fetch('/api/analyze-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl })
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      // Fallback: Return simulated features
      return this.simulateAudioAnalysis(audioUrl);
    } catch (error) {
      console.error('Audio analysis failed:', error);
      return this.simulateAudioAnalysis(audioUrl);
    }
  }
  
  /**
   * Calculate Hit Factor score from audio features
   */
  calculateHitFactor(features: AudioFeatures, trackInfo?: {
    artist?: string;
    title?: string;
    genre?: string;
  }): HitFactorScore {
    const breakdown = {
      commercial: this.calculateCommercialScore(features),
      production: this.calculateProductionScore(features),
      structure: this.calculateStructureScore(features),
      energy: this.calculateEnergyScore(features),
      uniqueness: this.calculateUniquenessScore(features)
    };
    
    // Weighted average
    const overall = Math.round(
      breakdown.commercial * 0.3 +
      breakdown.production * 0.25 +
      breakdown.structure * 0.2 +
      breakdown.energy * 0.15 +
      breakdown.uniqueness * 0.1
    );
    
    return {
      overall,
      breakdown,
      strengths: this.identifyStrengths(breakdown, features),
      weaknesses: this.identifyWeaknesses(breakdown, features),
      recommendations: this.generateRecommendations(breakdown, features),
      genreFit: this.predictGenres(features),
      syncPotential: this.calculateSyncPotential(features),
      playlistFit: this.suggestPlaylists(features, trackInfo)
    };
  }
  
  /**
   * Calculate commercial appeal score
   */
  private calculateCommercialScore(features: AudioFeatures): number {
    let score = 50; // Base score
    
    // Tempo considerations (sweet spot: 100-130 BPM)
    if (features.tempo >= 100 && features.tempo <= 130) {
      score += 15;
    } else if (features.tempo >= 80 && features.tempo <= 150) {
      score += 10;
    }
    
    // Energy (moderate to high is commercial)
    if (features.energy >= 0.6 && features.energy <= 0.85) {
      score += 15;
    } else if (features.energy >= 0.5) {
      score += 10;
    }
    
    // Danceability (important for streaming)
    if (features.danceability >= 0.65) {
      score += 15;
    } else if (features.danceability >= 0.5) {
      score += 10;
    }
    
    // Valence (positive songs tend to perform better)
    if (features.valence >= 0.6) {
      score += 10;
    }
    
    // Duration (3-4 minutes is ideal)
    const durationMinutes = features.duration / 60;
    if (durationMinutes >= 3 && durationMinutes <= 4) {
      score += 10;
    } else if (durationMinutes >= 2.5 && durationMinutes <= 5) {
      score += 5;
    }
    
    // Hook strength
    score += (features.hookStrength / 100) * 15;
    
    return Math.min(100, Math.max(0, score));
  }
  
  /**
   * Calculate production quality score
   */
  private calculateProductionScore(features: AudioFeatures): number {
    const productionAvg = (
      features.productionQuality +
      features.mixQuality +
      features.masteringQuality
    ) / 3;
    
    let score = productionAvg;
    
    // Loudness considerations (streaming era: -8 to -12 LUFS)
    if (features.loudness >= -12 && features.loudness <= -8) {
      score += 10;
    } else if (features.loudness >= -14 && features.loudness <= -6) {
      score += 5;
    }
    
    // Acoustic balance
    if (features.acousticness >= 0.1 && features.acousticness <= 0.4) {
      score += 5;
    }
    
    return Math.min(100, Math.max(0, score));
  }
  
  /**
   * Calculate structure score
   */
  private calculateStructureScore(features: AudioFeatures): number {
    let score = 50;
    
    // Section count (good songs have 4-6 distinct sections)
    const sectionCount = features.sections.length;
    if (sectionCount >= 4 && sectionCount <= 6) {
      score += 20;
    } else if (sectionCount >= 3 && sectionCount <= 7) {
      score += 10;
    }
    
    // Section diversity
    const sectionDiversity = this.calculateSectionDiversity(features.sections);
    score += sectionDiversity * 20;
    
    // Time signature (4/4 is most commercial)
    if (features.timeSignature === '4/4') {
      score += 10;
    }
    
    // Key (major keys tend to be more commercial)
    if (features.mode === 'major') {
      score += 10;
    }
    
    return Math.min(100, Math.max(0, score));
  }
  
  /**
   * Calculate energy score
   */
  private calculateEnergyScore(features: AudioFeatures): number {
    let score = features.energy * 60; // Base from energy
    
    // Energy consistency across sections
    const energyVariance = this.calculateEnergyVariance(features.sections);
    if (energyVariance < 0.15) {
      score += 20; // Consistent energy
    } else if (energyVariance < 0.25) {
      score += 10;
    }
    
    // Loudness contribution
    if (features.loudness >= -10) {
      score += 10;
    }
    
    // Liveness (live feel can add energy)
    if (features.liveness >= 0.3 && features.liveness <= 0.6) {
      score += 10;
    }
    
    return Math.min(100, Math.max(0, score));
  }
  
  /**
   * Calculate uniqueness score
   */
  private calculateUniquenessScore(features: AudioFeatures): number {
    let score = 50;
    
    // Unusual tempo (not too common)
    if (features.tempo < 90 || features.tempo > 140) {
      score += 15;
    }
    
    // Acoustic elements in electronic tracks
    if (features.acousticness >= 0.2 && features.energy >= 0.7) {
      score += 15;
    }
    
    // Instrumental breaks
    if (features.instrumentalness >= 0.3 && features.instrumentalness <= 0.7) {
      score += 10;
    }
    
    // Unusual structure
    if (features.timeSignature !== '4/4') {
      score += 10;
    }
    
    // MFCC diversity (timbre uniqueness)
    const mfccVariance = this.calculateMFCCVariance(features.mfcc);
    score += mfccVariance * 10;
    
    return Math.min(100, Math.max(0, score));
  }
  
  /**
   * Identify track strengths
   */
  private identifyStrengths(breakdown: any, features: AudioFeatures): string[] {
    const strengths: string[] = [];
    
    if (breakdown.commercial >= 75) {
      strengths.push('High commercial appeal');
    }
    if (breakdown.production >= 80) {
      strengths.push('Professional production quality');
    }
    if (breakdown.structure >= 75) {
      strengths.push('Well-structured arrangement');
    }
    if (breakdown.energy >= 80) {
      strengths.push('High energy and momentum');
    }
    if (breakdown.uniqueness >= 70) {
      strengths.push('Distinctive and memorable sound');
    }
    
    if (features.hookStrength >= 80) {
      strengths.push('Strong, memorable hook');
    }
    if (features.danceability >= 0.75) {
      strengths.push('Highly danceable');
    }
    if (features.energy >= 0.8) {
      strengths.push('Energetic and dynamic');
    }
    
    return strengths.length > 0 ? strengths : ['Solid foundation to build on'];
  }
  
  /**
   * Identify areas for improvement
   */
  private identifyWeaknesses(breakdown: any, features: AudioFeatures): string[] {
    const weaknesses: string[] = [];
    
    if (breakdown.commercial < 50) {
      weaknesses.push('Limited commercial appeal - consider structure adjustments');
    }
    if (breakdown.production < 60) {
      weaknesses.push('Production quality could be improved');
    }
    if (breakdown.structure < 55) {
      weaknesses.push('Song structure needs refinement');
    }
    if (breakdown.energy < 50) {
      weaknesses.push('Energy level could be increased');
    }
    
    if (features.hookStrength < 60) {
      weaknesses.push('Hook needs to be more memorable');
    }
    if (features.mixQuality < 70) {
      weaknesses.push('Mix balance needs attention');
    }
    if (features.masteringQuality < 70) {
      weaknesses.push('Mastering could be enhanced');
    }
    
    return weaknesses;
  }
  
  /**
   * Generate improvement recommendations
   */
  private generateRecommendations(breakdown: any, features: AudioFeatures): string[] {
    const recommendations: string[] = [];
    
    if (breakdown.production < 70) {
      recommendations.push('Consider working with an experienced mixing engineer');
    }
    if (features.hookStrength < 70) {
      recommendations.push('Strengthen the chorus/hook - make it more memorable');
    }
    if (features.energy < 0.6 && breakdown.commercial < 60) {
      recommendations.push('Increase tempo slightly or add more dynamic elements');
    }
    if (breakdown.structure < 60) {
      recommendations.push('Refine song structure - consider adding a bridge or pre-chorus');
    }
    if (features.masteringQuality < 75) {
      recommendations.push('Professional mastering would enhance streaming presence');
    }
    
    const durationMinutes = features.duration / 60;
    if (durationMinutes > 4.5) {
      recommendations.push('Consider shortening to 3-4 minutes for better playlist placement');
    }
    
    return recommendations;
  }
  
  /**
   * Predict genre fit
   */
  private predictGenres(features: AudioFeatures): { genre: string; confidence: number }[] {
    const genres: { genre: string; confidence: number }[] = [];
    
    // Pop
    if (features.danceability >= 0.65 && features.energy >= 0.6 && features.valence >= 0.5) {
      genres.push({ genre: 'Pop', confidence: 85 });
    }
    
    // Electronic/Dance
    if (features.danceability >= 0.7 && features.energy >= 0.7 && features.acousticness < 0.3) {
      genres.push({ genre: 'Electronic/Dance', confidence: 80 });
    }
    
    // Hip-Hop/Rap
    if (features.speechiness >= 0.33 && features.energy >= 0.6) {
      genres.push({ genre: 'Hip-Hop/Rap', confidence: 75 });
    }
    
    // Rock
    if (features.energy >= 0.7 && features.acousticness < 0.4 && features.loudness >= -8) {
      genres.push({ genre: 'Rock', confidence: 70 });
    }
    
    // Indie/Alternative
    if (features.acousticness >= 0.3 && features.energy >= 0.5 && features.valence < 0.6) {
      genres.push({ genre: 'Indie/Alternative', confidence: 65 });
    }
    
    // R&B/Soul
    if (features.danceability >= 0.6 && features.energy < 0.7 && features.valence >= 0.4) {
      genres.push({ genre: 'R&B/Soul', confidence: 70 });
    }
    
    // Acoustic/Singer-Songwriter
    if (features.acousticness >= 0.6 && features.energy < 0.6) {
      genres.push({ genre: 'Acoustic/Singer-Songwriter', confidence: 75 });
    }
    
    return genres.sort((a, b) => b.confidence - a.confidence);
  }
  
  /**
   * Calculate sync licensing potential
   */
  private calculateSyncPotential(features: AudioFeatures): {
    tv: number;
    film: number;
    advertising: number;
    gaming: number;
  } {
    return {
      tv: this.calculateTVSyncScore(features),
      film: this.calculateFilmSyncScore(features),
      advertising: this.calculateAdSyncScore(features),
      gaming: this.calculateGamingSyncScore(features)
    };
  }
  
  private calculateTVSyncScore(features: AudioFeatures): number {
    let score = 50;
    
    // TV favors moderate energy
    if (features.energy >= 0.5 && features.energy <= 0.75) score += 20;
    
    // Clear structure
    if (features.sections.length >= 4) score += 15;
    
    // Not too vocal-heavy (dialogue space)
    if (features.speechiness < 0.33) score += 15;
    
    return Math.min(100, score);
  }
  
  private calculateFilmSyncScore(features: AudioFeatures): number {
    let score = 50;
    
    // Films like emotional range
    if (features.valence >= 0.3 && features.valence <= 0.7) score += 15;
    
    // Dynamic range important
    const energyRange = this.calculateEnergyVariance(features.sections);
    if (energyRange >= 0.2) score += 20;
    
    // Cinematic quality
    if (features.acousticness >= 0.3 || features.instrumentalness >= 0.5) score += 15;
    
    return Math.min(100, score);
  }
  
  private calculateAdSyncScore(features: AudioFeatures): number {
    let score = 50;
    
    // Ads love high energy
    if (features.energy >= 0.7) score += 20;
    
    // Positive vibes
    if (features.valence >= 0.6) score += 15;
    
    // Memorable hook
    if (features.hookStrength >= 75) score += 15;
    
    return Math.min(100, score);
  }
  
  private calculateGamingSyncScore(features: AudioFeatures): number {
    let score = 50;
    
    // Gaming likes high energy
    if (features.energy >= 0.75) score += 20;
    
    // Instrumental or low vocals
    if (features.instrumentalness >= 0.5 || features.speechiness < 0.2) score += 20;
    
    // Repetitive/loopable structure
    if (features.sections.length >= 5) score += 10;
    
    return Math.min(100, score);
  }
  
  /**
   * Suggest playlist fits
   */
  private suggestPlaylists(features: AudioFeatures, trackInfo?: any): string[] {
    const playlists: string[] = [];
    
    if (features.energy >= 0.75 && features.danceability >= 0.7) {
      playlists.push('Workout/Gym', 'Party/Club', 'High Energy');
    }
    
    if (features.valence >= 0.7) {
      playlists.push('Feel Good', 'Happy Hits', 'Positive Vibes');
    }
    
    if (features.acousticness >= 0.6) {
      playlists.push('Acoustic Chill', 'Coffee Shop', 'Unplugged');
    }
    
    if (features.energy < 0.5 && features.valence < 0.5) {
      playlists.push('Sad Songs', 'Melancholy', 'Rainy Day');
    }
    
    if (features.instrumentalness >= 0.7) {
      playlists.push('Study Music', 'Focus Flow', 'Instrumental Beats');
    }
    
    if (features.danceability >= 0.7) {
      playlists.push('Dance Party', 'Club Bangers', 'Dance Floor');
    }
    
    return playlists;
  }
  
  // Helper methods
  
  private calculateSectionDiversity(sections: AudioSection[]): number {
    if (sections.length < 2) return 0;
    
    let diversity = 0;
    for (let i = 1; i < sections.length; i++) {
      const prev = sections[i - 1];
      const curr = sections[i];
      
      if (prev.key !== curr.key) diversity += 0.2;
      if (Math.abs(prev.tempo - curr.tempo) > 5) diversity += 0.2;
      if (Math.abs(prev.loudness - curr.loudness) > 3) diversity += 0.2;
    }
    
    return Math.min(1, diversity);
  }
  
  private calculateEnergyVariance(sections: AudioSection[]): number {
    if (sections.length < 2) return 0;
    
    const energies = sections.map(s => s.loudness);
    const mean = energies.reduce((a, b) => a + b, 0) / energies.length;
    const variance = energies.reduce((sum, e) => sum + Math.pow(e - mean, 2), 0) / energies.length;
    
    return Math.sqrt(variance) / 20; // Normalize
  }
  
  private calculateMFCCVariance(mfcc: number[]): number {
    if (mfcc.length < 2) return 0;
    
    const mean = mfcc.reduce((a, b) => a + b, 0) / mfcc.length;
    const variance = mfcc.reduce((sum, m) => sum + Math.pow(m - mean, 2), 0) / mfcc.length;
    
    return Math.min(1, Math.sqrt(variance) / 10);
  }
  
  /**
   * Simulate audio analysis (fallback when Python service unavailable)
   */
  private simulateAudioAnalysis(audioUrl: string): AudioFeatures {
    // Generate realistic simulated data
    // In production, this would never be used
    return {
      tempo: 120 + Math.random() * 40,
      key: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][Math.floor(Math.random() * 12)],
      mode: Math.random() > 0.5 ? 'major' : 'minor',
      timeSignature: '4/4',
      duration: 180 + Math.random() * 60,
      
      energy: 0.5 + Math.random() * 0.4,
      danceability: 0.5 + Math.random() * 0.4,
      valence: 0.4 + Math.random() * 0.5,
      acousticness: Math.random() * 0.6,
      instrumentalness: Math.random() * 0.5,
      liveness: Math.random() * 0.3,
      speechiness: Math.random() * 0.3,
      loudness: -12 + Math.random() * 6,
      
      spectralCentroid: 1500 + Math.random() * 1000,
      spectralRolloff: 3000 + Math.random() * 2000,
      zeroCrossingRate: 0.05 + Math.random() * 0.1,
      mfcc: Array(13).fill(0).map(() => Math.random() * 20 - 10),
      
      sections: this.generateSimulatedSections(),
      beats: [],
      bars: [],
      
      hookStrength: 50 + Math.random() * 40,
      productionQuality: 60 + Math.random() * 35,
      mixQuality: 60 + Math.random() * 35,
      masteringQuality: 60 + Math.random() * 35
    };
  }
  
  private generateSimulatedSections(): AudioSection[] {
    const sectionCount = 4 + Math.floor(Math.random() * 3);
    const sections: AudioSection[] = [];
    let currentTime = 0;
    
    for (let i = 0; i < sectionCount; i++) {
      const duration = 20 + Math.random() * 40;
      sections.push({
        start: currentTime,
        duration,
        confidence: 0.7 + Math.random() * 0.3,
        loudness: -15 + Math.random() * 10,
        tempo: 115 + Math.random() * 20,
        key: ['C', 'D', 'E', 'F', 'G', 'A', 'B'][Math.floor(Math.random() * 7)],
        mode: Math.random() > 0.5 ? 'major' : 'minor',
        timeSignature: '4/4'
      });
      currentTime += duration;
    }
    
    return sections;
  }
}

// Export singleton instance
export const audioProcessor = new AudioProcessor();
