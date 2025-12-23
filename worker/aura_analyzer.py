"""
AURA Music Analysis Engine
Analyzes tracks and generates Hit Factor scores
"""

import os
import logging
import requests
import tempfile
from typing import Dict, Any, Optional, Callable
import librosa
import numpy as np

logger = logging.getLogger(__name__)


def download_audio(url: str) -> str:
    """Download audio file to temporary location"""
    logger.info(f"Downloading audio from {url}")
    
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    # Save to temporary file
    suffix = os.path.splitext(url)[1] or '.mp3'
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
        return f.name


def extract_audio_features(audio_path: str, progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
    """Extract audio features using librosa"""
    logger.info("Extracting audio features...")
    
    if progress_callback:
        progress_callback(10)
    
    # Load audio
    y, sr = librosa.load(audio_path, sr=22050)
    
    if progress_callback:
        progress_callback(20)
    
    # Extract features
    features = {}
    
    # Tempo (BPM)
    tempo, _ = librosa.beat.beat_track(y=y, sr=sr)
    features['tempo'] = float(tempo)
    
    if progress_callback:
        progress_callback(30)
    
    # Spectral features
    spectral_centroids = librosa.feature.spectral_centroid(y=y, sr=sr)
    features['spectral_centroid_mean'] = float(np.mean(spectral_centroids))
    
    spectral_rolloff = librosa.feature.spectral_rolloff(y=y, sr=sr)
    features['spectral_rolloff_mean'] = float(np.mean(spectral_rolloff))
    
    if progress_callback:
        progress_callback(40)
    
    # Zero crossing rate
    zcr = librosa.feature.zero_crossing_rate(y)
    features['zcr_mean'] = float(np.mean(zcr))
    
    # MFCC
    mfccs = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
    for i, mfcc in enumerate(mfccs):
        features[f'mfcc_{i}_mean'] = float(np.mean(mfcc))
    
    if progress_callback:
        progress_callback(50)
    
    # RMS energy
    rms = librosa.feature.rms(y=y)
    features['rms_mean'] = float(np.mean(rms))
    
    logger.info(f"Extracted {len(features)} audio features")
    return features


def analyze_lyrics(lyrics_text: Optional[str], progress_callback: Optional[Callable] = None) -> Dict[str, Any]:
    """Analyze lyrics text"""
    if progress_callback:
        progress_callback(60)
    
    if not lyrics_text:
        return {
            'word_count': 0,
            'has_lyrics': False,
            'score': 50  # neutral score
        }
    
    words = lyrics_text.split()
    
    # Simple analysis (can be enhanced with NLP)
    analysis = {
        'word_count': len(words),
        'has_lyrics': True,
        'score': min(100, 50 + len(words) // 10)  # Simple scoring
    }
    
    logger.info(f"Analyzed lyrics: {analysis['word_count']} words")
    return analysis


def calculate_hit_factor(features: Dict[str, Any], lyrics_analysis: Dict[str, Any]) -> Dict[str, int]:
    """Calculate Hit Factor and sub-scores"""
    logger.info("Calculating Hit Factor...")
    
    # Audio score (based on audio features)
    audio_score = 70  # Base score
    
    # Tempo preference (90-130 BPM is commercial sweet spot)
    tempo = features.get('tempo', 120)
    if 90 <= tempo <= 130:
        audio_score += 15
    elif 80 <= tempo <= 140:
        audio_score += 10
    
    # Energy (RMS)
    rms = features.get('rms_mean', 0.1)
    if rms > 0.08:
        audio_score += 10
    
    audio_score = min(100, audio_score)
    
    # Lyrics score
    lyrics_score = lyrics_analysis.get('score', 50)
    
    # Brand score (simplified - would use more complex analysis)
    brand_score = 75  # Base brand potential
    
    # Market score (simplified - would use trend analysis)
    market_score = 70  # Base market fit
    
    # Overall hit factor (weighted average)
    hit_factor = int(
        audio_score * 0.35 +
        lyrics_score * 0.25 +
        brand_score * 0.20 +
        market_score * 0.20
    )
    
    return {
        'hit_factor': hit_factor,
        'audio': audio_score,
        'lyrics': lyrics_score,
        'brand': brand_score,
        'market': market_score
    }


def generate_recommendations(scores: Dict[str, int], features: Dict[str, Any]) -> list:
    """Generate A&R recommendations"""
    recommendations = []
    
    # Audio recommendations
    if scores['audio'] < 70:
        recommendations.append({
            'type': 'production',
            'note': 'Consider enhancing the production quality. Focus on clarity and balance in the mix.',
            'priority': 'high'
        })
    
    # Tempo recommendations
    tempo = features.get('tempo', 120)
    if tempo < 80:
        recommendations.append({
            'type': 'arrangement',
            'note': 'The tempo is quite slow. Consider increasing it slightly for better commercial appeal.',
            'priority': 'medium'
        })
    elif tempo > 140:
        recommendations.append({
            'type': 'arrangement',
            'note': 'The tempo is quite fast. Consider if this aligns with your target audience.',
            'priority': 'low'
        })
    
    # Lyrics recommendations
    if scores['lyrics'] < 60:
        recommendations.append({
            'type': 'lyrics',
            'note': 'Lyrics could be more developed. Consider adding more depth or storytelling elements.',
            'priority': 'medium'
        })
    
    # Marketing recommendations
    if scores['hit_factor'] >= 75:
        recommendations.append({
            'type': 'marketing',
            'note': 'Strong commercial potential! Consider pitching to major streaming playlists and radio.',
            'priority': 'high'
        })
    
    return recommendations


def find_similar_hits() -> list:
    """Find similar hit tracks (simplified - would use vector database)"""
    # Placeholder similar hits
    return [
        {
            'song': 'Blinding Lights',
            'artist': 'The Weeknd',
            'year': 2020,
            'similarity': 0.78
        },
        {
            'song': 'Levitating',
            'artist': 'Dua Lipa',
            'year': 2020,
            'similarity': 0.72
        },
        {
            'song': 'Save Your Tears',
            'artist': 'The Weeknd',
            'year': 2021,
            'similarity': 0.68
        }
    ]


def analyze_track(
    audio_url: str,
    lyrics_text: Optional[str] = None,
    reference_track: Optional[str] = None,
    progress_callback: Optional[Callable] = None
) -> Dict[str, Any]:
    """
    Main analysis function
    
    Args:
        audio_url: URL to audio file
        lyrics_text: Optional lyrics text
        reference_track: Optional reference track for comparison
        progress_callback: Optional callback for progress updates (0-100)
    
    Returns:
        Complete analysis result
    """
    try:
        # Download audio
        if progress_callback:
            progress_callback(5)
        
        audio_path = download_audio(audio_url)
        
        # Extract audio features
        features = extract_audio_features(audio_path, progress_callback)
        
        # Analyze lyrics
        lyrics_analysis = analyze_lyrics(lyrics_text, progress_callback)
        
        if progress_callback:
            progress_callback(70)
        
        # Calculate scores
        scores = calculate_hit_factor(features, lyrics_analysis)
        
        if progress_callback:
            progress_callback(80)
        
        # Generate recommendations
        recommendations = generate_recommendations(scores, features)
        
        if progress_callback:
            progress_callback(90)
        
        # Find similar hits
        similar_hits = find_similar_hits()
        
        if progress_callback:
            progress_callback(100)
        
        # Clean up
        os.unlink(audio_path)
        
        # Build result
        result = {
            'hit_factor': scores['hit_factor'],
            'scores': {
                'audio': scores['audio'],
                'lyrics': scores['lyrics'],
                'brand': scores['brand'],
                'market': scores['market']
            },
            'recommendations': recommendations,
            'similar_hits': similar_hits,
            'features': features,
            'model_version': 'AURA-v2.1'
        }
        
        logger.info(f"Analysis complete: Hit Factor = {scores['hit_factor']}")
        return result
        
    except Exception as e:
        logger.error(f"Analysis failed: {str(e)}", exc_info=True)
        raise
