'use client';

import { useState } from 'react';

const HOLLY_VOICE_OPTIONS = [
  { name: 'Sulafat', description: 'Warm', reason: 'Perfect caring and emotional tone' },
  { name: 'Vindemiatrix', description: 'Gentle', reason: 'Soft and caring' },
  { name: 'Achird', description: 'Friendly', reason: 'Warm and approachable' },
  { name: 'Achernar', description: 'Soft', reason: 'Gentle and soothing' },
  { name: 'Aoede', description: 'Breezy', reason: 'Light and casual professional' },
];

const TEST_SCRIPT = "Hi! I'm Holly, your AI music industry assistant. I'm here to help you with everything from music production to A&R analysis. How can I assist you today?";

export default function TestHollyVoice() {
  const [loading, setLoading] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const testVoice = async (voiceName: string) => {
    setLoading(voiceName);
    setError(null);

    try {
      const res = await fetch('/api/speech/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: TEST_SCRIPT,
          voice: voiceName,
          style: 'professional, warm, and caring',
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate speech');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrls(prev => ({ ...prev, [voiceName]: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(null);
    }
  };

  const testAllVoices = async () => {
    for (const voice of HOLLY_VOICE_OPTIONS) {
      await testVoice(voice.name);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              🎤 Find Holly's Perfect Voice
            </h1>
            <p className="text-gray-600">
              Test different voices to find the best match for Holly
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Looking for: 20-30yr old woman, warm, emotional, professional, caring
            </p>
          </div>

          {/* Test Script */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-2">Test Script:</p>
            <p className="text-gray-600 italic">"{TEST_SCRIPT}"</p>
          </div>

          {/* Test All Button */}
          <button
            onClick={testAllVoices}
            disabled={loading !== null}
            className="w-full mb-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white font-semibold rounded-lg hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Testing...' : '🎵 Test All Voices'}
          </button>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">❌ {error}</p>
            </div>
          )}

          {/* Voice Options */}
          <div className="space-y-4">
            {HOLLY_VOICE_OPTIONS.map((voice, index) => (
              <div
                key={voice.name}
                className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border-2 border-purple-200 hover:border-purple-400 transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">
                        {index === 0 && '⭐ '}
                        {voice.name}
                      </h3>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm font-medium rounded-full">
                        {voice.description}
                      </span>
                      {index === 0 && (
                        <span className="px-3 py-1 bg-pink-100 text-pink-700 text-sm font-medium rounded-full">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">{voice.reason}</p>
                  </div>
                  <button
                    onClick={() => testVoice(voice.name)}
                    disabled={loading === voice.name}
                    className="ml-4 px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    {loading === voice.name ? 'Testing...' : 'Test Voice'}
                  </button>
                </div>

                {/* Audio Player */}
                {audioUrls[voice.name] && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-purple-200">
                    <audio controls src={audioUrls[voice.name]} className="w-full" />
                    <a
                      href={audioUrls[voice.name]}
                      download={`holly-voice-${voice.name.toLowerCase()}.wav`}
                      className="mt-2 inline-block text-sm text-purple-600 hover:underline"
                    >
                      Download sample
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Info Box */}
          <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-900 mb-2">💡 How to Choose:</h3>
            <ul className="text-blue-800 text-sm space-y-1">
              <li>• Listen to each voice with the test script</li>
              <li>• Consider which sounds most warm and caring</li>
              <li>• Think about which feels most professional yet approachable</li>
              <li>• Choose the voice that best represents Holly's personality</li>
            </ul>
            <p className="text-blue-700 text-sm mt-3">
              <strong>💰 Cost:</strong> $0.00 (FREE forever with Gemini TTS!)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
