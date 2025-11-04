'use client'

import React, { useState } from 'react'
import { X, Music2, Loader2, Download, Play } from 'lucide-react'

interface StemSeparationModalProps {
  isOpen: boolean
  onClose: () => void
  song: {
    id: string
    title: string
    audio_url: string
    image_url?: string
  }
  onSeparate: (data: {
    audio_url: string
    song_id: string
    stems: string[]
  }) => Promise<any>
}

export function StemSeparationModal({ isOpen, onClose, song, onSeparate }: StemSeparationModalProps) {
  const [selectedStems, setSelectedStems] = useState<string[]>(['vocals', 'drums', 'bass', 'other'])
  const [isSeparating, setIsSeparating] = useState(false)
  const [separatedStems, setSeparatedStems] = useState<Record<string, string> | null>(null)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const stemOptions = [
    { id: 'vocals', label: 'Vocals', description: 'Lead and backing vocals', icon: '🎤' },
    { id: 'drums', label: 'Drums', description: 'Drum kit and percussion', icon: '🥁' },
    { id: 'bass', label: 'Bass', description: 'Bass guitar and low freq', icon: '🎸' },
    { id: 'other', label: 'Other', description: 'All other instruments', icon: '🎹' },
  ]

  const toggleStem = (stemId: string) => {
    setSelectedStems(prev =>
      prev.includes(stemId)
        ? prev.filter(id => id !== stemId)
        : [...prev, stemId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedStems.length === 0) {
      setError('Please select at least one stem')
      return
    }

    setIsSeparating(true)
    setError(null)
    
    try {
      const result = await onSeparate({
        audio_url: song.audio_url,
        song_id: song.id,
        stems: selectedStems,
      })
      
      setSeparatedStems(result.stems)
      setProcessingTime(result.processing_time_seconds)
    } catch (error) {
      console.error('Stem separation failed:', error)
      setError(error instanceof Error ? error.message : 'Separation failed')
    } finally {
      setIsSeparating(false)
    }
  }

  const handleDownloadAll = () => {
    if (!separatedStems) return
    
    Object.entries(separatedStems).forEach(([stem, url]) => {
      const link = document.createElement('a')
      link.href = url
      link.download = `${song.title}-${stem}.wav`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 border border-purple-500/30 rounded-2xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Music2 className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Separate Stems</h2>
              <p className="text-sm text-gray-400 mt-1">
                Extract individual instruments from "{song.title}"
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            disabled={isSeparating}
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
              <p className="text-sm text-gray-400 mt-1">Full track with all instruments</p>
            </div>
          </div>
        </div>

        {!separatedStems ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Stem Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Stems to Extract
              </label>
              <div className="grid grid-cols-2 gap-3">
                {stemOptions.map((stem) => (
                  <button
                    key={stem.id}
                    type="button"
                    onClick={() => toggleStem(stem.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedStems.includes(stem.id)
                        ? 'border-purple-500 bg-purple-500/20'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                    disabled={isSeparating}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{stem.icon}</span>
                      <div className="flex-1">
                        <p className="font-medium text-white">{stem.label}</p>
                        <p className="text-xs text-gray-400 mt-1">{stem.description}</p>
                      </div>
                      {selectedStems.includes(stem.id) && (
                        <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Processing Info */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              <p className="text-sm text-blue-300">
                <strong>Processing time:</strong> Typically 30-90 seconds depending on song length.
              </p>
              <p className="text-xs text-blue-300 mt-2">
                Uses Demucs AI model for high-quality separation. Requires Python and Demucs installed on server.
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-colors"
                disabled={isSeparating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSeparating || selectedStems.length === 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSeparating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Music2 className="w-5 h-5" />
                    Separate Stems
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          // Results View
          <div className="space-y-4">
            {/* Success Message */}
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <p className="text-sm text-green-300">
                ✅ Stems separated successfully in {processingTime?.toFixed(1)}s!
              </p>
            </div>

            {/* Separated Stems */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Your Separated Stems
              </label>
              {Object.entries(separatedStems).map(([stemName, url]) => {
                const stemInfo = stemOptions.find(s => s.id === stemName)
                return (
                  <div
                    key={stemName}
                    className="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{stemInfo?.icon || '🎵'}</span>
                      <div>
                        <p className="font-medium text-white capitalize">{stemName}</p>
                        <p className="text-xs text-gray-400">{stemInfo?.description || 'Audio track'}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const audio = new Audio(url)
                          audio.play()
                        }}
                        className="p-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
                        title="Play"
                      >
                        <Play className="w-4 h-4 text-purple-400" />
                      </button>
                      <a
                        href={url}
                        download={`${song.title}-${stemName}.wav`}
                        className="p-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-blue-400" />
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleDownloadAll}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                Download All Stems
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
