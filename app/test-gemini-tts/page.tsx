'use client';

import { useState } from 'react';

export default function TestGeminiTTS() {
  const [text, setText] = useState('Hello! This is a test of the free Gemini TTS.');
  const [voice, setVoice] = useState('Kore');
  const [style, setStyle] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<string[]>([]);

  const loadVoices = async () => {
    try {
      const res = await fetch('/api/speech/gemini');
      const data = await res.json();
      setVoices(data.voices);
    } catch (err) {
      console.error('Failed to load voices:', err);
    }
  };

  const generateSpeech = async () => {
    setLoading(true);
    setError(null);
    setAudioUrl(null);

    try {
      const res = await fetch('/api/speech/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, voice, style: style || undefined }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            🎙️ Gemini TTS Test
          </h1>
          <p className="text-gray-600 mb-6">
            Test the FREE Gemini Text-to-Speech API ($0.00 cost!)
          </p>

          <div className="space-y-4">
            {/* Text Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text to speak:
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows={3}
                placeholder="Enter text to convert to speech..."
              />
            </div>

            {/* Voice Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice:
              </label>
              <div className="flex gap-2">
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="Kore">Kore (Default)</option>
                  <option value="Puck">Puck</option>
                  <option value="Charon">Charon</option>
                  <option value="Fenrir">Fenrir</option>
                  <option value="Aoede">Aoede</option>
                  <option value="Enceladus">Enceladus</option>
                  <option value="Algenib">Algenib</option>
                  <option value="Arcas">Arcas</option>
                  <option value="Bellatrix">Bellatrix</option>
                  <option value="Capella">Capella</option>
                </select>
                <button
                  onClick={loadVoices}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Load Voices
                </button>
              </div>
            </div>

            {/* Style Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Style (optional):
              </label>
              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="e.g., cheerful, spooky whisper, excited"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use natural language to describe how the text should be spoken
              </p>
            </div>

            {/* Generate Button */}
            <button
              onClick={generateSpeech}
              disabled={loading || !text}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Generating...' : '🎵 Generate Speech'}
            </button>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">❌ {error}</p>
              </div>
            )}

            {/* Audio Player */}
            {audioUrl && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm font-medium mb-2">
                  ✅ Speech generated successfully!
                </p>
                <audio controls src={audioUrl} className="w-full" />
                <a
                  href={audioUrl}
                  download="gemini-tts-output.wav"
                  className="mt-2 inline-block text-sm text-blue-600 hover:underline"
                >
                  Download audio file
                </a>
              </div>
            )}

            {/* Info Box */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                <strong>💰 Cost:</strong> $0.00 (FREE forever!)
                <br />
                <strong>🎤 Model:</strong> gemini-2.5-flash-preview-tts
                <br />
                <strong>🌍 Voices:</strong> 30+ voices in 24+ languages
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
