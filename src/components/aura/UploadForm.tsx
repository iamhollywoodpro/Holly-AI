'use client';

import { useState } from 'react';
import { Upload, Music, FileText, Image as ImageIcon, X } from 'lucide-react';
import { TrackUploadRequest } from '@/types/aura';

interface UploadFormProps {
  onSubmit: (data: TrackUploadRequest) => Promise<void>;
  isSubmitting?: boolean;
}

export function UploadForm({ onSubmit, isSubmitting = false }: UploadFormProps) {
  const [trackTitle, setTrackTitle] = useState('');
  const [artistName, setArtistName] = useState('');
  const [genre, setGenre] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [lyricsText, setLyricsText] = useState('');
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [referenceTrack, setReferenceTrack] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!audioFile) {
      alert('Please upload an audio file');
      return;
    }

    const data: TrackUploadRequest = {
      trackTitle,
      artistName,
      genre: genre || undefined,
      audioFile,
      lyricsText: lyricsText || undefined,
      artworkFile: artworkFile || undefined,
      referenceTrack: referenceTrack || undefined,
    };

    await onSubmit(data);
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        alert('Please upload an audio file');
        return;
      }
      setAudioFile(file);
    }
  };

  const handleArtworkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }
      setArtworkFile(file);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Track Info */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Track Information</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Track Title *
          </label>
          <input
            type="text"
            value={trackTitle}
            onChange={(e) => setTrackTitle(e.target.value)}
            required
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter track title"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Artist Name *
          </label>
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            required
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Enter artist name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Genre (Optional)
          </label>
          <input
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="e.g., Pop, Hip-Hop, R&B"
          />
        </div>
      </div>

      {/* Audio File */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Audio File *
        </label>
        
        {!audioFile ? (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
            <Music className="w-8 h-8 text-gray-500 mb-2" />
            <span className="text-sm text-gray-400">Click to upload audio file</span>
            <span className="text-xs text-gray-500 mt-1">MP3, WAV, or FLAC</span>
            <input
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              disabled={isSubmitting}
              className="hidden"
            />
          </label>
        ) : (
          <div className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <Music className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-white">{audioFile.name}</p>
                <p className="text-xs text-gray-400">
                  {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAudioFile(null)}
              disabled={isSubmitting}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Lyrics (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Lyrics (Optional)
        </label>
        <textarea
          value={lyricsText}
          onChange={(e) => setLyricsText(e.target.value)}
          disabled={isSubmitting}
          rows={6}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          placeholder="Paste lyrics here for deeper analysis..."
        />
      </div>

      {/* Artwork (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Artwork (Optional)
        </label>
        
        {!artworkFile ? (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-purple-500 transition-colors">
            <ImageIcon className="w-8 h-8 text-gray-500 mb-2" />
            <span className="text-sm text-gray-400">Click to upload artwork</span>
            <span className="text-xs text-gray-500 mt-1">JPG, PNG, or WEBP</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleArtworkChange}
              disabled={isSubmitting}
              className="hidden"
            />
          </label>
        ) : (
          <div className="flex items-center justify-between p-4 bg-gray-800 border border-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              <ImageIcon className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-sm font-medium text-white">{artworkFile.name}</p>
                <p className="text-xs text-gray-400">
                  {(artworkFile.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setArtworkFile(null)}
              disabled={isSubmitting}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Reference Track (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Reference Track (Optional)
        </label>
        <input
          type="text"
          value={referenceTrack}
          onChange={(e) => setReferenceTrack(e.target.value)}
          disabled={isSubmitting}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="Spotify URL or track name for comparison"
        />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting || !audioFile || !trackTitle || !artistName}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <Upload className="w-5 h-5" />
        {isSubmitting ? 'Analyzing...' : 'Analyze Track'}
      </button>
    </form>
  );
}
