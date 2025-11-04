'use client'

import React, { useState } from 'react'
import { X, Plus, Clock } from 'lucide-react'

interface ExtendSongModalProps {
  isOpen: boolean
  onClose: () => void
  song: {
    id: string
    title: string
    audio_url: string
    tags?: string
    image_url?: string
    duration?: number
  }
  onExtend: (data: {
    continue_clip_id: string
    prompt: string
    continue_at?: number
  }) => Promise<void>
}

export function ExtendSongModal({ isOpen, onClose, song, onExtend }: ExtendSongModalProps) {
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState<30 | 60 | 90>(30)
  const [isExtending, setIsExtending] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim()) return

    setIsExtending(true)
    try {
      await onExtend({
        continue_clip_id: song.id,
        prompt: prompt.trim(),
        continue_at: song.duration, // Continue from end of song
      })
      onClose()
    } catch (error) {
      console.error('Extend failed:', error)
    } finally {
      setIsExtending(false)
    }
  }

  const examplePrompts = [
    'Add a dramatic outro with orchestra and choir',
    'Continue with an energetic guitar solo',
    'Fade out with ambient synth pads',
    'Build to an epic climax with drums and brass',
    'Add a gentle piano ending',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border border-purple-500/30 rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Plus className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Extend Song</h2>
              <p className="text-sm text-gray-400 mt-1">
                Add more music to "{song.title}"
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
              <div className="flex items-center gap-4 mt-1">
                {song.tags && (
                  <p className="text-sm text-gray-400">Style: {song.tags}</p>
                )}
                {song.duration && (
                  <p className="text-sm text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.floor(song.duration / 60)}:{(song.duration % 60).toString().padStart(2, '0')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Continuation Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Continuation Instructions *
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how you want the song to continue..."
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={4}
              required
            />
            <p className="text-xs text-gray-500 mt-2">
              The AI will continue from where the song ends, following your instructions
            </p>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Extension Duration
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[30, 60, 90].map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => setDuration(dur as 30 | 60 | 90)}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    duration === dur
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300'
                  }`}
                >
                  {dur}s
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Estimated generation time: {duration <= 30 ? '30-60s' : duration <= 60 ? '60-90s' : '90-120s'}
            </p>
          </div>

          {/* Example Prompts */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Example Continuation Ideas
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
              disabled={isExtending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isExtending || !prompt.trim()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isExtending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Extending...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Extend Song
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
