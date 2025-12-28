'use client';

import { useState } from 'react';
import { generateVideoFromText, generateVideoFromImage, generateAndDownloadVideo, VIDEO_MODELS, VideoModel } from '@/lib/puter-video-generation';

export function VideoGenerator() {
  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [selectedModel, setSelectedModel] = useState<VideoModel>('Wan-AI/Wan2.2-T2V-A14B');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'text' | 'image'>('text');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (mode === 'image' && !imageUrl.trim()) {
      setError('Please enter an image URL for image-to-video generation');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedVideo(null);

    try {
      const video = mode === 'image'
        ? await generateVideoFromImage(prompt, imageUrl, { model: selectedModel })
        : await generateVideoFromText(prompt, { model: selectedModel });

      setGeneratedVideo(video);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate video');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!prompt.trim()) return;

    try {
      await generateAndDownloadVideo(prompt, 'holly-generated-video.mp4', {
        model: selectedModel,
        image_url: mode === 'image' ? imageUrl : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download video');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-gray-900 border border-purple-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">🎬 Free Video Generation</h2>
        <p className="text-gray-400 mb-6">
          Generate videos from text or animate images using Wan 2.2 AI - completely free!
        </p>

        {/* Mode Selection */}
        <div className="mb-4 flex gap-4">
          <button
            onClick={() => {
              setMode('text');
              setSelectedModel('Wan-AI/Wan2.2-T2V-A14B');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              mode === 'text'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Text-to-Video
          </button>
          <button
            onClick={() => {
              setMode('image');
              setSelectedModel('Wan-AI/Wan2.2-I2V-A14B');
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              mode === 'image'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Image-to-Video
          </button>
        </div>

        {/* Image URL Input (only for image-to-video) */}
        {mode === 'image' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Image URL
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/image.jpg"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        )}

        {/* Prompt Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            {mode === 'text' ? 'Video Description' : 'Animation Description'}
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={
              mode === 'text'
                ? 'Describe the video you want to generate...'
                : 'Describe how you want the image to be animated...'
            }
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]"
          />
        </div>

        {/* Model Info */}
        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-400">
            <strong className="text-white">Model:</strong>{' '}
            {VIDEO_MODELS[selectedModel].name} - {VIDEO_MODELS[selectedModel].description}
          </p>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim() || (mode === 'image' && !imageUrl.trim())}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          {isGenerating ? 'Generating Video...' : 'Generate Video'}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Generated Video Display */}
      {generatedVideo && (
        <div className="bg-gray-900 border border-purple-500/20 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Generated Video</h3>
            <button
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Download
            </button>
          </div>
          <div className="rounded-lg overflow-hidden bg-black">
            <video
              src={generatedVideo.src}
              controls
              autoPlay
              loop
              className="w-full h-auto"
            />
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-blue-300 text-sm">
          ℹ️ <strong>100% Free:</strong> Video generation is powered by Puter.js / Wan 2.2 AI and requires no API keys or costs.
        </p>
      </div>
    </div>
  );
}
