'use client';

import { Star, TrendingUp, Music, FileText, Target, Award } from 'lucide-react';
import { AnalysisResult } from '@/types/aura';

interface ResultsDisplayProps {
  result: AnalysisResult;
}

export function ResultsDisplay({ result }: ResultsDisplayProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-amber-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-rose-500';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'low':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hit Factor Score */}
      <div className="p-6 bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Award className="w-8 h-8 text-purple-400" />
            <div>
              <h3 className="text-xl font-bold text-white">Hit Factor Score</h3>
              <p className="text-sm text-gray-400">Overall commercial potential</p>
            </div>
          </div>
          <div className={`text-5xl font-bold ${getScoreColor(result.hitFactor)}`}>
            {result.hitFactor}
          </div>
        </div>
        
        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getScoreGradient(result.hitFactor)} transition-all duration-1000`}
            style={{ width: `${result.hitFactor}%` }}
          />
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ScoreCard
          icon={<Music className="w-5 h-5" />}
          label="Audio Quality"
          score={result.scores.audio}
        />
        <ScoreCard
          icon={<FileText className="w-5 h-5" />}
          label="Lyrics"
          score={result.scores.lyrics}
        />
        <ScoreCard
          icon={<Star className="w-5 h-5" />}
          label="Brand Potential"
          score={result.scores.brand}
        />
        <ScoreCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Market Fit"
          score={result.scores.market}
        />
      </div>

      {/* Recommendations */}
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-6 h-6 text-purple-400" />
          <h3 className="text-lg font-bold text-white">Professional Recommendations</h3>
        </div>
        
        <div className="space-y-3">
          {result.recommendations.map((rec, index) => (
            <div
              key={index}
              className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <span className="text-sm font-semibold text-purple-400 uppercase tracking-wider">
                  {rec.type}
                </span>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${getPriorityColor(rec.priority)}`}>
                  {rec.priority}
                </span>
              </div>
              <p className="text-sm text-gray-300">{rec.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Similar Hits */}
      {result.similarHits.length > 0 && (
        <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Music className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-bold text-white">Similar Hits</h3>
          </div>
          
          <div className="grid gap-3">
            {result.similarHits.map((hit, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700 rounded-lg hover:border-purple-500/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-white">{hit.song}</p>
                  <p className="text-xs text-gray-400">{hit.artist} • {hit.year}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-purple-400">
                    {(hit.similarity * 100).toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-500">similarity</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Model: {result.modelVersion}</span>
          <span>Processing time: {(result.processingTime / 1000).toFixed(2)}s</span>
          <span>Completed: {new Date(result.completedAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function ScoreCard({ icon, label, score }: { icon: React.ReactNode; label: string; score: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  return (
    <div className="p-4 bg-gray-800 border border-gray-700 rounded-lg">
      <div className="flex items-center gap-2 mb-2 text-gray-400">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
        {score}
      </div>
      <div className="mt-2 w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}
