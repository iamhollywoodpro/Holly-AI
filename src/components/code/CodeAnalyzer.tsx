'use client';

/**
 * HOLLY AI - Code Analyzer Component
 * 
 * Let HOLLY "touch" your code to find and fix errors
 * Provides security scanning, performance checks, and auto-fix
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CodeError {
  type: string;
  severity: string;
  message: string;
  line: number;
  autoFixable: boolean;
  suggestion?: string;
}

interface CodeAnalysis {
  score: number;
  summary: string;
  errors: CodeError[];
  warnings: CodeError[];
  suggestions: CodeError[];
  metrics: {
    linesOfCode: number;
    complexity: number;
    maintainability: number;
    securityScore: number;
    performanceScore: number;
  };
}

interface FixResult {
  success: boolean;
  changesCount: number;
  changes: Array<{
    line: number;
    description: string;
    type: string;
  }>;
  remainingIssues: number;
  summary: string;
}

interface Props {
  onAnalysisComplete?: (analysis: CodeAnalysis, fixResult?: FixResult) => void;
  initialCode?: string;
}

export const CodeAnalyzer: React.FC<Props> = ({ 
  onAnalysisComplete,
  initialCode = '' 
}) => {
  const [code, setCode] = useState(initialCode);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CodeAnalysis | null>(null);
  const [fixResult, setFixResult] = useState<FixResult | null>(null);
  const [fixedCode, setFixedCode] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [autoFix, setAutoFix] = useState(true);
  const [checkSecurity, setCheckSecurity] = useState(true);
  const [checkPerformance, setCheckPerformance] = useState(true);
  const [fileName, setFileName] = useState('untitled.ts');

  const analyzeCode = async () => {
    if (!code.trim()) {
      setError('Please enter some code to analyze');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysis(null);
    setFixResult(null);

    try {
      const response = await fetch('/api/code/analyze-fix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          filePath: fileName,
          autoFix,
          checkSecurity,
          checkPerformance,
          checkSyntax: true,
          checkImports: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      setAnalysis(data.data.analysis);
      
      if (data.data.fix) {
        setFixResult(data.data.fix);
        if (data.data.fixedCode) {
          setFixedCode(data.data.fixedCode);
        }
      }

      onAnalysisComplete?.(data.data.analysis, data.data.fix);
    } catch (err) {
      setError('Failed to analyze code. Please try again.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'error': return 'bg-red-400';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const applyFix = () => {
    if (fixedCode) {
      setCode(fixedCode);
      setFixedCode('');
      setFixResult(null);
      setAnalysis(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Editor */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-purple-500 outline-none"
              placeholder="filename.ts"
            />
            <button
              onClick={analyzeCode}
              disabled={isAnalyzing}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {isAnalyzing ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    ⏳
                  </motion.span>
                  Analyzing...
                </>
              ) : (
                <>🔍 Analyze Code</>
              )}
            </button>
          </div>

          {/* Options */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-gray-400 text-sm">
              <input
                type="checkbox"
                checked={autoFix}
                onChange={(e) => setAutoFix(e.target.checked)}
                className="rounded"
              />
              Auto-Fix Issues
            </label>
            <label className="flex items-center gap-2 text-gray-400 text-sm">
              <input
                type="checkbox"
                checked={checkSecurity}
                onChange={(e) => setCheckSecurity(e.target.checked)}
                className="rounded"
              />
              Security Check
            </label>
            <label className="flex items-center gap-2 text-gray-400 text-sm">
              <input
                type="checkbox"
                checked={checkPerformance}
                onChange={(e) => setCheckPerformance(e.target.checked)}
                className="rounded"
              />
              Performance Check
            </label>
          </div>

          {/* Code Input */}
          <div className="relative">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-96 bg-gray-900 text-gray-100 font-mono text-sm p-4 rounded-lg border border-gray-700 focus:border-purple-500 outline-none resize-none"
              placeholder="// Paste your code here for HOLLY to analyze..."
              spellCheck={false}
            />
            <div className="absolute bottom-2 right-2 text-gray-600 text-xs">
              {code.split('\n').length} lines
            </div>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400"
            >
              {error}
            </motion.div>
          )}
        </div>

        {/* Analysis Results */}
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {analysis ? (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Score */}
                <div className="bg-gray-800 rounded-xl p-6 text-center">
                  <div className="text-gray-400 mb-2">Code Quality Score</div>
                  <div className={`text-6xl font-bold ${getScoreColor(analysis.score)}`}>
                    {analysis.score}/100
                  </div>
                  <div className="text-gray-500 mt-2">{analysis.summary}</div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-gray-500 text-xs">Lines of Code</div>
                    <div className="text-xl font-bold text-white">{analysis.metrics.linesOfCode}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-gray-500 text-xs">Complexity</div>
                    <div className="text-xl font-bold text-white">{analysis.metrics.complexity}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-gray-500 text-xs">Maintainability</div>
                    <div className="text-xl font-bold text-white">{analysis.metrics.maintainability}%</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-3 text-center">
                    <div className="text-gray-500 text-xs">Security</div>
                    <div className="text-xl font-bold text-white">{analysis.metrics.securityScore}%</div>
                  </div>
                </div>

                {/* Errors */}
                {analysis.errors.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-red-400 font-semibold mb-3">
                      ❌ Errors ({analysis.errors.length})
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {analysis.errors.map((err, i) => (
                        <div key={i} className="bg-gray-900 rounded p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`${getSeverityColor(err.severity)} w-2 h-2 rounded-full`} />
                            <span className="text-white text-sm">{err.message}</span>
                          </div>
                          <div className="text-gray-500 text-xs">
                            Line {err.line} • {err.type}
                            {err.autoFixable && <span className="text-green-400 ml-2">(Auto-fixable)</span>}
                          </div>
                          {err.suggestion && (
                            <div className="text-blue-400 text-xs mt-1">
                              💡 {err.suggestion}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {analysis.warnings.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-yellow-400 font-semibold mb-3">
                      ⚠️ Warnings ({analysis.warnings.length})
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {analysis.warnings.map((warn, i) => (
                        <div key={i} className="bg-gray-900 rounded p-2 text-sm">
                          <span className="text-gray-300">{warn.message}</span>
                          <span className="text-gray-500 ml-2">Line {warn.line}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fix Result */}
                {fixResult && (
                  <div className={`rounded-lg p-4 ${fixResult.success ? 'bg-green-500/20 border border-green-500' : 'bg-gray-800'}`}>
                    <div className="font-semibold mb-2">
                      {fixResult.success ? '✅ Fixes Applied!' : 'ℹ️ Fix Results'}
                    </div>
                    <div className="text-sm text-gray-300 mb-3">{fixResult.summary}</div>
                    
                    {fixResult.changes.length > 0 && (
                      <div className="space-y-1 mb-3">
                        {fixResult.changes.map((change, i) => (
                          <div key={i} className="text-sm">
                            <span className="text-gray-500">Line {change.line}:</span>{' '}
                            <span className="text-white">{change.description}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {fixedCode && (
                      <button
                        onClick={applyFix}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                      >
                        Apply Fixed Code
                      </button>
                    )}
                  </div>
                )}

                {/* Suggestions */}
                {analysis.suggestions.length > 0 && (
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-blue-400 font-semibold mb-3">
                      💡 Suggestions ({analysis.suggestions.length})
                    </div>
                    <div className="space-y-1">
                      {analysis.suggestions.slice(0, 5).map((sug, i) => (
                        <div key={i} className="text-gray-400 text-sm">
                          • {sug.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gray-800 rounded-xl p-12 text-center"
              >
                <div className="text-5xl mb-4">✋</div>
                <div className="text-xl text-white mb-2">Let HOLLY Touch Your Code</div>
                <div className="text-gray-400">
                  Paste code on the left and click Analyze to find errors and get fixes
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default CodeAnalyzer;
