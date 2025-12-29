'use client';

import { useState } from 'react';

export default function TestTTSPage() {
  const [text, setText] = useState('Hello! This is a test of the free Gemini TTS system.');
  const [voice, setVoice] = useState('Puck');
  const [style, setStyle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [audioUrl, setAudioUrl] = useState('');

  const voices = [
    'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda',
    'Orus', 'Aoede', 'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus'
  ];

  const testTTS = async () => {
    setLoading(true);
    setError('');
    setAudioUrl('');

    try {
      const response = await fetch('/api/speech/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, style })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'TTS generation failed');
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          <h1 className="text-4xl font-bold text-white mb-2">
            🎙️ Gemini TTS Test
          </h1>
          <p className="text-blue-200 mb-8">
            Testing FREE Google AI Studio Text-to-Speech
          </p>

          {/* Text Input */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Text to Speak
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full p-4 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              rows={4}
              placeholder="Enter text to convert to speech..."
            />
            <p className="text-sm text-blue-200 mt-1">
              {text.length} characters
            </p>
          </div>

          {/* Voice Selection */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Voice
            </label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full p-4 rounded-lg bg-white/20 text-white border border-white/30 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            >
              {voices.map((v) => (
                <option key={v} value={v} className="bg-gray-900">
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Style Input */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Style (Optional)
            </label>
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              className="w-full p-4 rounded-lg bg-white/20 text-white placeholder-white/50 border border-white/30 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              placeholder="e.g., excited and happy, calm and soothing"
            />
            <p className="text-sm text-blue-200 mt-1">
              Natural language description of how to speak
            </p>
          </div>

          {/* Generate Button */}
          <button
            onClick={testTTS}
            disabled={loading || !text.trim()}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 px-8 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
          >
            {loading ? '🔄 Generating...' : '🎤 Generate Speech'}
          </button>

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
              <p className="text-red-200 font-semibold">❌ Error:</p>
              <p className="text-red-100 mt-1">{error}</p>
            </div>
          )}

          {/* Audio Player */}
          {audioUrl && (
            <div className="mt-6 p-6 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-green-200 font-semibold mb-4">
                ✅ Speech Generated Successfully!
              </p>
              <audio
                src={audioUrl}
                controls
                autoPlay
                className="w-full"
              />
              <a
                href={audioUrl}
                download="gemini-tts-output.wav"
                className="mt-4 inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                💾 Download Audio
              </a>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-8 p-6 bg-blue-500/20 border border-blue-500/50 rounded-lg">
            <h3 className="text-white font-bold text-lg mb-2">
              ℹ️ About This Test
            </h3>
            <ul className="text-blue-100 space-y-2">
              <li>✅ <strong>Model:</strong> gemini-2.5-flash-preview-tts</li>
              <li>✅ <strong>Cost:</strong> $0.00 (FREE in Free Tier)</li>
              <li>✅ <strong>Voices:</strong> 30 available voices</li>
              <li>✅ <strong>Languages:</strong> 24 supported languages</li>
              <li>✅ <strong>Rate Limit:</strong> 15 RPM, 1,500 RPD (Free Tier)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
