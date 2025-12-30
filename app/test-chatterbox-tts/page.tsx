"use client";

import { useState } from "react";

export default function TestChatterboxTTSPage() {
  const [text, setText] = useState(
    "Hello! I'm Holly, your AI assistant. [chuckle] Let's create something amazing together!"
  );
  const [expressive, setExpressive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [serviceInfo, setServiceInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadServiceInfo = async () => {
    try {
      const response = await fetch("/api/voice/chatterbox/info");
      const data = await response.json();
      
      if (data.success) {
        setServiceInfo(data);
      } else {
        setError(data.error || "Failed to load service info");
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const synthesizeSpeech = async () => {
    setLoading(true);
    setError(null);
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }

    try {
      const response = await fetch("/api/voice/chatterbox", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          expressive,
          temperature: 0.7,
          exaggeration: 0.5,
          cfgWeight: 0.5,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to synthesize speech");
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            🎵 Chatterbox TTS Test
          </h1>
          <p className="text-gray-600">
            Test Holly's voice powered by ResembleAI Chatterbox-Turbo
          </p>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
          <h3 className="font-semibold text-lg mb-4">Service Information</h3>
          {!serviceInfo ? (
            <button 
              onClick={loadServiceInfo}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Load Service Info
            </button>
          ) : (
            <div className="space-y-2 text-sm">
              <p><strong>Model:</strong> {serviceInfo.service.model}</p>
              <p><strong>Status:</strong> {serviceInfo.service.available ? "✅ Available" : "❌ Unavailable"}</p>
              <p><strong>Features:</strong> {serviceInfo.service.features.join(", ")}</p>
            </div>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
          <h3 className="font-semibold text-lg mb-4">Text to Synthesize</h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text..."
            className="w-full min-h-[150px] p-3 border rounded mb-4"
          />
          
          <div className="flex items-center gap-4 mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={expressive}
                onChange={(e) => setExpressive(e.target.checked)}
              />
              <span className="text-sm">Auto-add expressive tags</span>
            </label>
          </div>

          <button
            onClick={synthesizeSpeech}
            disabled={loading || !text}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Synthesizing..." : "Generate Speech"}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
              {error}
            </div>
          )}
        </div>

        {audioUrl && (
          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-6 shadow-lg">
            <h3 className="font-semibold text-lg mb-4">🎧 Generated Audio</h3>
            <audio controls src={audioUrl} className="w-full" autoPlay />
          </div>
        )}

        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
          <h3 className="font-semibold text-lg mb-3">💡 Available Tags</h3>
          <div className="text-sm text-gray-700 space-y-1">
            <p>• [chuckle] - Light humor</p>
            <p>• [laugh] - Genuine amusement</p>
            <p>• [sigh] - Thoughtful pause</p>
            <p>• [gasp] - Surprise</p>
            <p>• [cough] - Interruption</p>
          </div>
        </div>
      </div>
    </div>
  );
}
