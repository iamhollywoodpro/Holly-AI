"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import {
  MusicalNoteIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ChartBarIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

interface MusicTrack {
  id: string;
  artistName: string;
  trackTitle: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  status: string;
  uploadedAt: string;
  analyzedAt?: string;
}

interface MusicAnalysis {
  id: string;
  bpm?: number;
  key?: string;
  mode?: string;
  energy?: number;
  danceability?: number;
  valence?: number;
  hitScore?: number;
  primaryGenre?: string;
  subGenres?: string[];
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: string[];
  marketPotential?: string;
}

export default function ARDashboard() {
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<MusicTrack | null>(null);
  const [analysis, setAnalysis] = useState<MusicAnalysis | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Drag and drop handler
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("file", file);

      // Simple artist/title extraction from filename
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      const parts = fileName.split("-").map((p) => p.trim());
      const artistName = parts[0] || "Unknown Artist";
      const trackTitle = parts[1] || fileName;

      formData.append("artistName", artistName);
      formData.append("trackTitle", trackTitle);

      // Upload file
      const response = await fetch("/api/music/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setTracks((prev) => [data.track, ...prev]);
      setUploadProgress(100);

      // Auto-analyze after upload
      if (data.track?.id) {
        await analyzeTrack(data.track.id);
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload track. Please try again.");
    } finally {
      setUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/mpeg": [".mp3"],
      "audio/wav": [".wav"],
      "audio/x-m4a": [".m4a"],
      "audio/flac": [".flac"],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
  });

  const analyzeTrack = async (trackId: string) => {
    setAnalyzing(true);
    try {
      const response = await fetch("/api/music/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed");
      }

      const data = await response.json();
      setAnalysis(data.analysis);

      // Update track status in list
      setTracks((prev) =>
        prev.map((t) =>
          t.id === trackId
            ? { ...t, status: "analyzed", analyzedAt: new Date().toISOString() }
            : t
        )
      );
    } catch (error) {
      console.error("Analysis error:", error);
      alert("Failed to analyze track. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  };

  const loadTrackAnalysis = async (track: MusicTrack) => {
    setSelectedTrack(track);
    setAnalysis(null);

    if (track.status === "analyzed") {
      try {
        const response = await fetch(
          `/api/music/analyze?trackId=${track.id}`
        );
        const data = await response.json();
        setAnalysis(data.analysis);
      } catch (error) {
        console.error("Failed to load analysis:", error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "uploaded":
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case "analyzing":
        return <SparklesIcon className="w-5 h-5 text-blue-500 animate-pulse" />;
      case "analyzed":
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case "failed":
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getHitScoreColor = (score?: number) => {
    if (!score) return "text-gray-400";
    if (score >= 8) return "text-green-500";
    if (score >= 6) return "text-yellow-500";
    return "text-orange-500";
  };

  return (
    <div className="h-full flex flex-col bg-[#1a1b26]">
      {/* Header */}
      <div className="flex-none p-6 border-b border-[#2a2b3d]">
        <div className="flex items-center gap-3 mb-2">
          <MusicalNoteIcon className="w-8 h-8 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">A&R Analysis Suite</h2>
        </div>
        <p className="text-gray-400 text-sm">
          Professional music analysis powered by HOLLY AI
        </p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Upload & Track List */}
        <div className="w-1/3 border-r border-[#2a2b3d] flex flex-col">
          {/* Upload Area */}
          <div className="flex-none p-6">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
                isDragActive
                  ? "border-purple-500 bg-purple-500/10"
                  : "border-gray-600 hover:border-purple-400 hover:bg-[#2a2b3d]"
              }`}
            >
              <input {...getInputProps()} />
              <CloudArrowUpIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              {uploading ? (
                <div>
                  <p className="text-white mb-2">Uploading...</p>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-white mb-2">
                    Drop music file here or click to upload
                  </p>
                  <p className="text-gray-400 text-sm">
                    MP3, WAV, M4A, FLAC (max 50MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Track List */}
          <div className="flex-1 overflow-y-auto p-6 pt-0">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <ChartBarIcon className="w-5 h-5" />
              Your Tracks
            </h3>
            {tracks.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-8">
                No tracks uploaded yet
              </p>
            ) : (
              <div className="space-y-2">
                {tracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => loadTrackAnalysis(track)}
                    className={`w-full text-left p-4 rounded-lg transition-all ${
                      selectedTrack?.id === track.id
                        ? "bg-purple-500/20 border border-purple-500"
                        : "bg-[#2a2b3d] hover:bg-[#33344a] border border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {track.trackTitle}
                        </p>
                        <p className="text-gray-400 text-sm truncate">
                          {track.artistName}
                        </p>
                      </div>
                      {getStatusIcon(track.status)}
                    </div>
                    <p className="text-gray-500 text-xs">
                      {new Date(track.uploadedAt).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Analysis Results */}
        <div className="flex-1 overflow-y-auto p-6">
          {!selectedTrack ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MusicalNoteIcon className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">
                  Upload a track to get started with AI analysis
                </p>
              </div>
            </div>
          ) : analyzing ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <SparklesIcon className="w-16 h-16 mx-auto mb-4 text-purple-400 animate-pulse" />
                <p className="text-white text-lg font-semibold mb-2">
                  Analyzing Track...
                </p>
                <p className="text-gray-400 text-sm">
                  HOLLY is analyzing audio features, vocals, and market
                  potential
                </p>
              </div>
            </div>
          ) : analysis ? (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {selectedTrack.trackTitle}
                </h2>
                <p className="text-gray-400">{selectedTrack.artistName}</p>
              </div>

              {/* Hit Score */}
              <div className="bg-[#2a2b3d] rounded-lg p-6">
                <h3 className="text-white font-semibold mb-4">Hit Potential</h3>
                <div className="flex items-center gap-4">
                  <div
                    className={`text-6xl font-bold ${getHitScoreColor(
                      analysis.hitScore
                    )}`}
                  >
                    {analysis.hitScore?.toFixed(1) || "N/A"}
                  </div>
                  <div className="flex-1">
                    <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
                      <div
                        className="bg-purple-500 h-4 rounded-full transition-all"
                        style={{ width: `${(analysis.hitScore || 0) * 10}%` }}
                      />
                    </div>
                    <p className="text-gray-400 text-sm capitalize">
                      {analysis.marketPotential} Market Potential
                    </p>
                  </div>
                </div>
              </div>

              {/* Audio Features */}
              <div className="bg-[#2a2b3d] rounded-lg p-6">
                <h3 className="text-white font-semibold mb-4">
                  Audio Features
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "BPM", value: analysis.bpm },
                    {
                      label: "Key",
                      value: analysis.key
                        ? `${analysis.key} ${analysis.mode}`
                        : "N/A",
                    },
                    { label: "Genre", value: analysis.primaryGenre },
                    {
                      label: "Energy",
                      value: analysis.energy
                        ? `${(analysis.energy * 100).toFixed(0)}%`
                        : "N/A",
                    },
                    {
                      label: "Danceability",
                      value: analysis.danceability
                        ? `${(analysis.danceability * 100).toFixed(0)}%`
                        : "N/A",
                    },
                    {
                      label: "Valence",
                      value: analysis.valence
                        ? `${(analysis.valence * 100).toFixed(0)}%`
                        : "N/A",
                    },
                  ].map((feature) => (
                    <div key={feature.label}>
                      <p className="text-gray-400 text-sm mb-1">
                        {feature.label}
                      </p>
                      <p className="text-white font-semibold">
                        {feature.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strengths */}
              {analysis.strengths && analysis.strengths.length > 0 && (
                <div className="bg-[#2a2b3d] rounded-lg p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {analysis.strengths.map((strength, idx) => (
                      <li key={idx} className="text-gray-300 text-sm flex gap-2">
                        <span className="text-green-500">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weaknesses */}
              {analysis.weaknesses && analysis.weaknesses.length > 0 && (
                <div className="bg-[#2a2b3d] rounded-lg p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5 text-orange-500" />
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {analysis.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="text-gray-300 text-sm flex gap-2">
                        <span className="text-orange-500">•</span>
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="bg-[#2a2b3d] rounded-lg p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-400" />
                    HOLLY's Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-gray-300 text-sm flex gap-2">
                        <span className="text-purple-400">→</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400 mb-4">
                  No analysis available for this track yet
                </p>
                <button
                  onClick={() => selectedTrack && analyzeTrack(selectedTrack.id)}
                  className="px-6 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                >
                  Analyze Now
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
