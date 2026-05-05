'use client';

/**
 * HOLLY AI - Music Analysis Upload Component
 * 
 * Upload audio files for HOLLY to "hear" and analyze
 * Provides A&R-level insights including hit potential
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AudioAnalysis {
  bpm: number;
  key: string;
  mode: string;
  energy: number;
  danceability: number;
  primaryGenre: string;
  subGenres: string[];
  mood: string;
  hitScore: number;
  marketPotential: string;
  similarArtists: string[];
  strengths: string[];
  improvements: string[];
  releaseReadiness: number;
}

interface Props {
  onAnalysisComplete?: (analysis: AudioAnalysis) => void;
}

export const MusicAnalysisUpload: React.FC<Props> = ({ onAnalysisComplete }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const analyzeFile = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    setFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('report', 'true');

    try {
      const response = await fetch('/api/music/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setAnalysis(data.data.analysis);
      onAnalysisComplete?.(data.data.analysis);
    } catch (err) {
      setError('Failed to analyze audio. Please try again.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      analyzeFile(file);
    } else {
      setError('Please upload an audio file (MP3, WAV, M4A)');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      analyzeFile(file);
    }
  };

  const getHitScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-400';
    if (score >= 6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getReadinessColor = (readiness: number) => {
    if (readiness >= 80) return 'bg-green-500';
    if (readiness >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center transition-all
          ${isDragging ? 'border-purple-500 bg-purple-500/10' : 'border-gray-600 hover:border-gray-500'}
        `}
      >
        <input
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="text-5xl">🎵</div>
          <div className="text-xl font-semibold text-white">
            {isAnalyzing ? 'HOLLY is listening...' : 'Drop your music here'}
          </div>
          <div className="text-gray-400">
            Supports MP3, WAV, M4A, OGG (max 50MB)
          </div>
          
          {isAnalyzing && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="inline-block"
            >
              ⏳
            </motion.div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400"
        >
          {error}
        </motion.div>
      )}

      {/* Analysis Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 space-y-6"
          >
            {/* File Name */}
            <div className="text-center text-gray-400">
              Analyzing: <span className="text-white">{fileName}</span>
            </div>

            {/* Hit Score */}
            <div className="bg-gray-800 rounded-xl p-6 text-center">
              <div className="text-gray-400 mb-2">Hit Potential Score</div>
              <div className={`text-6xl font-bold ${getHitScoreColor(analysis.hitScore)}`}>
                {analysis.hitScore}/10
              </div>
              <div className="text-gray-500 mt-2">
                Market Potential: {analysis.marketPotential.toUpperCase()}
              </div>
            </div>

            {/* Basic Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-sm">BPM</div>
                <div className="text-2xl font-bold text-white">{analysis.bpm}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-sm">Key</div>
                <div className="text-2xl font-bold text-white">{analysis.key} {analysis.mode}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-sm">Energy</div>
                <div className="text-2xl font-bold text-white">{(analysis.energy * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-sm">Danceability</div>
                <div className="text-2xl font-bold text-white">{(analysis.danceability * 100).toFixed(0)}%</div>
              </div>
            </div>

            {/* Genre & Mood */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-2">Genre</div>
                <div className="text-xl font-semibold text-white">{analysis.primaryGenre}</div>
                <div className="text-gray-500 text-sm mt-1">
                  {analysis.subGenres.join(', ')}
                </div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-2">Mood</div>
                <div className="text-xl font-semibold text-white">{analysis.mood}</div>
              </div>
            </div>

            {/* Similar Artists */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-2">Similar Artists</div>
              <div className="flex flex-wrap gap-2">
                {analysis.similarArtists.map((artist, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
                  >
                    {artist}
                  </span>
                ))}
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-green-400 text-sm mb-2">✅ Strengths</div>
                <ul className="space-y-1">
                  {analysis.strengths.map((strength, i) => (
                    <li key={i} className="text-gray-300 text-sm">• {strength}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-yellow-400 text-sm mb-2">📈 Areas for Improvement</div>
                <ul className="space-y-1">
                  {analysis.improvements.map((improvement, i) => (
                    <li key={i} className="text-gray-300 text-sm">• {improvement}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Release Readiness */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Release Readiness</span>
                <span className="text-white font-semibold">{analysis.releaseReadiness}%</span>
              </div>
              <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${analysis.releaseReadiness}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full ${getReadinessColor(analysis.releaseReadiness)}`}
                />
              </div>
              <div className="text-center mt-2 text-sm">
                {analysis.releaseReadiness >= 80 ? (
                  <span className="text-green-400">✅ Ready for release!</span>
                ) : analysis.releaseReadiness >= 60 ? (
                  <span className="text-yellow-400">⚠️ Needs minor polish</span>
                ) : (
                  <span className="text-red-400">❌ Needs significant work</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MusicAnalysisUpload;
