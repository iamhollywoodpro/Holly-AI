'use client';

import { useState } from 'react';
import { generateImage, generateAndDownloadImage, IMAGE_MODELS, ImageModel } from '@/lib/puter-image-generation';

export function ImageGenerator() {
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<ImageModel>('black-forest-labs/FLUX.1-dev');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const image = await generateImage(prompt, {
        model: selectedModel,
        negative_prompt: negativePrompt || undefined,
        width: 1024,
        height: 1024,
      });

      setGeneratedImage(image);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!prompt.trim()) return;

    try {
      await generateAndDownloadImage(prompt, 'holly-generated-image.png', {
        model: selectedModel,
        negative_prompt: negativePrompt || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download image');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-gray-900 border border-purple-500/20 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-white mb-4">🎨 Free Image Generation</h2>
        <p className="text-gray-400 mb-6">
          Generate high-quality images using Stable Diffusion and FLUX models - completely free!
        </p>

        {/* Model Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Model
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value as ImageModel)}
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {Object.entries(IMAGE_MODELS).map(([id, info]) => (
              <option key={id} value={id}>
                {info.name} - {info.description}
              </option>
            ))}
          </select>
        </div>

        {/* Prompt Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the image you want to generate..."
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]"
          />
        </div>

        {/* Negative Prompt Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Negative Prompt (Optional)
          </label>
          <input
            type="text"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="What to avoid in the image..."
            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          {isGenerating ? 'Generating...' : 'Generate Image'}
        </button>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Generated Image Display */}
      {generatedImage && (
        <div className="bg-gray-900 border border-purple-500/20 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-white">Generated Image</h3>
            <button
              onClick={handleDownload}
              className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Download
            </button>
          </div>
          <div className="rounded-lg overflow-hidden">
            <img
              src={generatedImage.src}
              alt="Generated"
              className="w-full h-auto"
            />
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
        <p className="text-blue-300 text-sm">
          ℹ️ <strong>100% Free:</strong> Image generation is powered by Puter.js and requires no API keys or costs.
        </p>
      </div>
    </div>
  );
}
