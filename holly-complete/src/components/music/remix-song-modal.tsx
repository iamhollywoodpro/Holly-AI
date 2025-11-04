'use client'

import React, { useState } from 'react'
import { X, Wand2, Music2 } from 'lucide-react'

interface RemixSongModalProps {
  isOpen: boolean
  onClose: () => void
  song: {
    id: string
    title: string
    audio_url: string
    tags?: string
    image_url?: string
  }
  onRemix: (data: {
    audio_url: string
    prompt: string
    style: string
    title: string
    audio_weight: number
    style_weight: number
  }) => Promise<void>
}

export function RemixSongModal({ isOpen, onClose, song, onRemix }: RemixSongModalProps) {
  const [prompt, setPrompt] = useState('')
  const [style, setStyle] = useState(song.tags || '')
  const [title, setTitle] = useState(`${song.title} (Remix)`)
  const [audioWeight, setAudioWeight] = useState(0.65) // How much original influences
  const [styleWeight, setStyleWeight] = useState(0.65) // How much new style influences
  const [isRemixing, setIsRemixing] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsRemixing(true)
    try {
      await onRemix({
        audio_url: song.audio_url,
        prompt: prompt.trim(),
        style: style.trim(),
        title: title.trim(),
        audio_weight: audioWeight,
        style_weight: styleWeight,
      })
      onClose()
    } catch (error) {
      console.error('Remix failed:', error)
    } finally {
      setIsRemixing(false)
    }
  }

  const examplePrompts = [
    'Transform into an acoustic version with guitar and piano',
    'Add heavy electronic beats and synth layers',
    'Create a jazz interpretation with saxophone and upright bass',
    'Make it orchestral with strings and brass section',
    'Convert to lo-fi hip hop with vinyl crackle',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border border-purple-500/30 rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Wand2 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Remix Song</h2>
              <p className="text-sm text-gray-400 mt-1">
                Create a new variation of "{song.title}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Original Song Info */}
        <div className="mb-6 p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center gap-4">
            {song.image_url && (
              <img
                src={song.image_url}
                alt={song.title}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-white">{song.title}</h3>
              {song.tags && (
                <p className="text-sm text-gray-400 mt-1">Original style: {song.tags}</p>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Remix Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Remix Instructions *
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how you want to transform the song..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={4}
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              Be specific about the changes you want (genre, instruments, mood, tempo, etc.)
            </p>
          </div>

          {/* New Style */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Style/Genre
            </label>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="e.g., Jazz, Electronic, Orchestral"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* New Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Remix Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Name your remix"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Control Weights */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Original Influence: {Math.round(audioWeight * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={audioWeight}
                onChange={(e) => setAudioWeight(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher = more like original
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                New Style Influence: {Math.round(styleWeight * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={styleWeight}
                onChange={(e) => setStyleWeight(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Higher = more transformation
              </p>
            </div>
          </div>

          {/* Example Prompts */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Example Remix Ideas
            </label>
            <div className="space-y-2">
              {examplePrompts.map((example, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="w-full text-left px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-gray-300 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-colors"
              disabled={isRemixing}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isRemixing || !prompt.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isRemixing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Remixing...
                </>
              ) : (
                <>
                  <Music2 className="w-5 h-5" />
                  Create Remix
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
