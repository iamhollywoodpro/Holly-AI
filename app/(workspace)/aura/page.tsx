'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { Sparkles, History, ArrowLeft } from 'lucide-react';
import { UploadForm } from '@/components/aura/UploadForm';
import { ProgressTracker } from '@/components/aura/ProgressTracker';
import { ResultsDisplay } from '@/components/aura/ResultsDisplay';
import { TrackUploadRequest, AnalysisResult, AnalysisStatus } from '@/types/aura';
import { submitAnalysis, pollForCompletion } from '@/lib/aura-client';

type ViewMode = 'upload' | 'analyzing' | 'results' | 'history';

export default function AuraPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>('queued');
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>();
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number>();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (data: TrackUploadRequest) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Submit analysis
      const response = await submitAnalysis(data);
      
      setCurrentJobId(response.jobId);
      setViewMode('analyzing');
      setAnalysisStatus('processing');
      
      // Start polling for completion
      const result = await pollForCompletion(
        response.jobId,
        (status) => {
          // Update progress
          setProgress(status.progress);
          setCurrentStep(status.currentStep);
          setEstimatedTimeRemaining(status.estimatedTimeRemaining);
          setAnalysisStatus(status.status);
        }
      );

      // Analysis complete
      setResult(result);
      setViewMode('results');
      
    } catch (error) {
      console.error('Analysis failed:', error);
      setError(error instanceof Error ? error.message : 'Analysis failed');
      setAnalysisStatus('failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNewAnalysis = () => {
    setViewMode('upload');
    setCurrentJobId(null);
    setAnalysisStatus('queued');
    setProgress(0);
    setCurrentStep(undefined);
    setEstimatedTimeRemaining(undefined);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  AURA A&R
                </h1>
                <p className="text-sm text-gray-400">Professional Music Analysis</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {viewMode !== 'upload' && (
                <button
                  onClick={handleNewAnalysis}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  New Analysis
                </button>
              )}
              
              <button
                onClick={() => setViewMode('history')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                <History className="w-4 h-4" />
                History
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8">
        {viewMode === 'upload' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Upload Your Track</h2>
              <p className="text-gray-400">
                Get professional A&R analysis powered by AI. Upload your track and receive detailed
                feedback on commercial potential, production quality, and market fit.
              </p>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg">
                <p className="text-red-300">{error}</p>
              </div>
            )}
            
            <div className="p-6 bg-gray-900 border border-gray-800 rounded-lg">
              <UploadForm onSubmit={handleUpload} isSubmitting={isSubmitting} />
            </div>
          </div>
        )}

        {viewMode === 'analyzing' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Analyzing Your Track</h2>
              <p className="text-gray-400">
                Our AI is analyzing your track. This usually takes 30-60 seconds.
              </p>
            </div>
            
            {error ? (
              <div className="p-6 bg-red-900/20 border border-red-500/50 rounded-lg">
                <p className="text-red-300 mb-4">{error}</p>
                <button
                  onClick={handleNewAnalysis}
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <ProgressTracker
                status={analysisStatus}
                progress={progress}
                currentStep={currentStep}
                estimatedTimeRemaining={estimatedTimeRemaining}
              />
            )}
          </div>
        )}

        {viewMode === 'results' && result && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Analysis Results</h2>
              <p className="text-gray-400">
                {result.trackTitle} by {result.artistName}
              </p>
            </div>
            
            <ResultsDisplay result={result} />
          </div>
        )}

        {viewMode === 'history' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Analysis History</h2>
              <p className="text-gray-400">
                View your past track analyses
              </p>
            </div>
            
            <div className="p-12 bg-gray-900 border border-gray-800 rounded-lg text-center">
              <History className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No analysis history yet</p>
              <button
                onClick={() => setViewMode('upload')}
                className="mt-4 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
              >
                Analyze Your First Track
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
