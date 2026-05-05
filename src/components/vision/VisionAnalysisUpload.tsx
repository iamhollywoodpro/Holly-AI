'use client';

/**
 * HOLLY AI - Vision Analysis Upload Component
 * 
 * Upload images/documents for HOLLY to "see" and analyze
 * Provides OCR, object detection, and document understanding
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VisionAnalysis {
  description: string;
  summary: string;
  mood: string;
  style: string;
  aesthetic: number;
  professionalism: number;
  tags: string[];
  objects?: Array<{ label: string; confidence: number }>;
  text?: Array<{ text: string; confidence: number }>;
  colors?: Array<{ hex: string; name: string; percentage: number }>;
  // Document-specific
  documentType?: string;
  keyPoints?: string[];
  entities?: {
    people: string[];
    organizations: string[];
    dates: string[];
    amounts: string[];
  };
}

interface Props {
  onAnalysisComplete?: (analysis: VisionAnalysis) => void;
  defaultType?: 'general' | 'document' | 'creative' | 'detailed';
}

export const VisionAnalysisUpload: React.FC<Props> = ({ 
  onAnalysisComplete,
  defaultType = 'general'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<VisionAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [analysisType, setAnalysisType] = useState(defaultType);
  const [extractOcr, setExtractOcr] = useState(false);
  const [extractColors, setExtractColors] = useState(false);

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

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setImageUrl(previewUrl);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', analysisType);
    if (extractOcr) formData.append('ocr', 'true');
    if (extractColors) formData.append('colors', 'true');

    try {
      const response = await fetch('/api/vision/analyze', {
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
      setError('Failed to analyze image. Please try again.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      analyzeFile(file);
    } else {
      setError('Please upload an image (JPEG, PNG, GIF, WEBP) or PDF');
    }
  }, [analysisType, extractOcr, extractColors]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      analyzeFile(file);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Analysis Type Selector */}
      <div className="flex gap-2 mb-4">
        {['general', 'document', 'creative', 'detailed'].map((type) => (
          <button
            key={type}
            onClick={() => setAnalysisType(type as any)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              analysisType === type
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Options */}
      <div className="flex gap-4 mb-4">
        <label className="flex items-center gap-2 text-gray-400 text-sm">
          <input
            type="checkbox"
            checked={extractOcr}
            onChange={(e) => setExtractOcr(e.target.checked)}
            className="rounded"
          />
          Extract Text (OCR)
        </label>
        <label className="flex items-center gap-2 text-gray-400 text-sm">
          <input
            type="checkbox"
            checked={extractColors}
            onChange={(e) => setExtractColors(e.target.checked)}
            className="rounded"
          />
          Extract Colors
        </label>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-12 text-center transition-all
          ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}
        `}
      >
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <div className="text-5xl">👁️</div>
          <div className="text-xl font-semibold text-white">
            {isAnalyzing ? 'HOLLY is looking...' : 'Drop your image or document here'}
          </div>
          <div className="text-gray-400">
            Supports JPEG, PNG, GIF, WEBP, PDF (max 20MB)
          </div>
          
          {isAnalyzing && (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="inline-block"
            >
              🔍
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
            {/* Image Preview */}
            {imageUrl && (
              <div className="bg-gray-800 rounded-xl overflow-hidden">
                <img 
                  src={imageUrl} 
                  alt="Analyzed" 
                  className="w-full max-h-96 object-contain"
                />
              </div>
            )}

            {/* Description */}
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="text-gray-400 text-sm mb-2">Description</div>
              <div className="text-white text-lg">{analysis.description}</div>
              {analysis.summary && (
                <div className="text-gray-400 mt-2">{analysis.summary}</div>
              )}
            </div>

            {/* Scores */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-sm">Aesthetic</div>
                <div className="text-3xl font-bold text-white">{analysis.aesthetic}/10</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-sm">Professionalism</div>
                <div className="text-3xl font-bold text-white">{analysis.professionalism}/10</div>
              </div>
            </div>

            {/* Mood & Style */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-2">Mood</div>
                <div className="text-white font-semibold">{analysis.mood}</div>
              </div>
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-2">Style</div>
                <div className="text-white font-semibold">{analysis.style}</div>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-sm mb-2">Tags</div>
              <div className="flex flex-wrap gap-2">
                {analysis.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Objects */}
            {analysis.objects && analysis.objects.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-2">Detected Objects</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {analysis.objects.map((obj, i) => (
                    <div key={i} className="flex justify-between bg-gray-700 rounded p-2">
                      <span className="text-white">{obj.label}</span>
                      <span className="text-gray-400">{(obj.confidence * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted Text */}
            {analysis.text && analysis.text.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-2">Extracted Text (OCR)</div>
                <div className="bg-gray-900 rounded p-3 font-mono text-sm text-gray-300 whitespace-pre-wrap">
                  {analysis.text.map(t => t.text).join('\n')}
                </div>
              </div>
            )}

            {/* Colors */}
            {analysis.colors && analysis.colors.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="text-gray-400 text-sm mb-2">Color Palette</div>
                <div className="flex gap-2">
                  {analysis.colors.map((color, i) => (
                    <div key={i} className="text-center">
                      <div
                        className="w-12 h-12 rounded-lg mb-1"
                        style={{ backgroundColor: color.hex }}
                      />
                      <div className="text-xs text-gray-400">{color.name}</div>
                      <div className="text-xs text-gray-500">{color.percentage}%</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document-specific */}
            {analysis.documentType && (
              <div className="space-y-4">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-sm mb-2">Document Type</div>
                  <div className="text-white font-semibold capitalize">{analysis.documentType}</div>
                </div>

                {analysis.keyPoints && analysis.keyPoints.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-2">Key Points</div>
                    <ul className="space-y-1">
                      {analysis.keyPoints.map((point, i) => (
                        <li key={i} className="text-gray-300">• {point}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysis.entities && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-gray-400 text-sm mb-2">Entities</div>
                    <div className="grid grid-cols-2 gap-4">
                      {analysis.entities.people.length > 0 && (
                        <div>
                          <div className="text-gray-500 text-xs">People</div>
                          <div className="text-white">{analysis.entities.people.join(', ')}</div>
                        </div>
                      )}
                      {analysis.entities.organizations.length > 0 && (
                        <div>
                          <div className="text-gray-500 text-xs">Organizations</div>
                          <div className="text-white">{analysis.entities.organizations.join(', ')}</div>
                        </div>
                      )}
                      {analysis.entities.dates.length > 0 && (
                        <div>
                          <div className="text-gray-500 text-xs">Dates</div>
                          <div className="text-white">{analysis.entities.dates.join(', ')}</div>
                        </div>
                      )}
                      {analysis.entities.amounts.length > 0 && (
                        <div>
                          <div className="text-gray-500 text-xs">Amounts</div>
                          <div className="text-white">{analysis.entities.amounts.join(', ')}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VisionAnalysisUpload;
