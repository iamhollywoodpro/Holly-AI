'use client';

import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { AnalysisStatus } from '@/types/aura';

interface ProgressTrackerProps {
  status: AnalysisStatus;
  progress: number; // 0-100
  currentStep?: string;
  estimatedTimeRemaining?: number; // seconds
}

export function ProgressTracker({
  status,
  progress,
  currentStep,
  estimatedTimeRemaining,
}: ProgressTrackerProps) {
  const getStatusIcon = () => {
    switch (status) {
      case 'queued':
        return <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />;
      case 'processing':
        return <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-8 h-8 text-green-400" />;
      case 'failed':
        return <XCircle className="w-8 h-8 text-red-400" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'queued':
        return 'Queued for analysis...';
      case 'processing':
        return currentStep || 'Analyzing track...';
      case 'completed':
        return 'Analysis complete!';
      case 'failed':
        return 'Analysis failed';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'queued':
        return 'text-gray-400';
      case 'processing':
        return 'text-purple-400';
      case 'completed':
        return 'text-green-400';
      case 'failed':
        return 'text-red-400';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  return (
    <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg">
      {/* Status Icon & Text */}
      <div className="flex items-center gap-4 mb-6">
        {getStatusIcon()}
        <div>
          <h3 className={`text-lg font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </h3>
          {estimatedTimeRemaining && status === 'processing' && (
            <p className="text-sm text-gray-400 mt-1">
              Estimated time remaining: {formatTime(estimatedTimeRemaining)}
            </p>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {(status === 'queued' || status === 'processing') && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Progress</span>
            <span className="text-sm font-semibold text-white">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Analysis Steps */}
      {status === 'processing' && (
        <div className="mt-6 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Analysis Steps
          </p>
          <div className="space-y-2">
            {[
              { label: 'Audio extraction', threshold: 0 },
              { label: 'Feature analysis', threshold: 20 },
              { label: 'Lyrics processing', threshold: 40 },
              { label: 'Hit factor calculation', threshold: 60 },
              { label: 'Similar tracks matching', threshold: 80 },
              { label: 'Generating report', threshold: 90 },
            ].map((step, index) => {
              const isComplete = progress > step.threshold;
              const isCurrent = progress >= step.threshold && progress < (index < 5 ? [20, 40, 60, 80, 90, 100][index + 1] : 100);
              
              return (
                <div key={step.label} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    isComplete ? 'bg-green-400' : 
                    isCurrent ? 'bg-purple-400 animate-pulse' : 
                    'bg-gray-600'
                  }`} />
                  <span className={`text-sm ${
                    isComplete ? 'text-green-400' : 
                    isCurrent ? 'text-white' : 
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
