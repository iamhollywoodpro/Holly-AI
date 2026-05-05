'use client';

import { useState, useEffect } from 'react';
import { reviewCode, getSeverityColor, getCategoryIcon } from '@/lib/code-reviewer';
import type { CodeReviewResult, CodeIssue } from '@/lib/code-reviewer';
import type { GitHubFile } from '@/lib/github-api';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon 
} from '@heroicons/react/24/outline';

interface CodeReviewPanelProps {
  files: GitHubFile[];
  onReviewComplete?: (result: CodeReviewResult) => void;
}

export function CodeReviewPanel({ files, onReviewComplete }: CodeReviewPanelProps) {
  const [reviewing, setReviewing] = useState(false);
  const [result, setResult] = useState<CodeReviewResult | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (files.length > 0) {
      performReview();
    }
  }, [files]);

  const performReview = async () => {
    setReviewing(true);
    
    // Simulate AI analysis delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const reviewResult = await reviewCode(files);
    setResult(reviewResult);
    setReviewing(false);
    onReviewComplete?.(reviewResult);
  };

  const toggleIssue = (issueId: string) => {
    setExpandedIssues(prev => {
      const next = new Set(prev);
      if (next.has(issueId)) {
        next.delete(issueId);
      } else {
        next.add(issueId);
      }
      return next;
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 50) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-gray-700 bg-gray-900/50">
      {reviewing ? (
        <div className="p-4 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-gray-400">Analyzing code...</span>
        </div>
      ) : result ? (
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-lg">🤖</span>
              <div>
                <div className="text-sm font-semibold text-white">Code Review</div>
                <div className="text-xs text-gray-500">
                  {result.files.length} file{result.files.length > 1 ? 's' : ''} analyzed • {result.estimatedReviewTime} read
                </div>
              </div>
            </div>
            
            {/* Quality Score */}
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor(result.summary.score)}`}>
                {getScoreGrade(result.summary.score)}
              </div>
              <div className="text-xs text-gray-500">
                {result.summary.score}/100
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                <span className="text-xs font-semibold text-red-400">Errors</span>
              </div>
              <div className="text-2xl font-bold text-white">{result.summary.errors}</div>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />
                <span className="text-xs font-semibold text-yellow-400">Warnings</span>
              </div>
              <div className="text-2xl font-bold text-white">{result.summary.warnings}</div>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <InformationCircleIcon className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-blue-400">Suggestions</span>
              </div>
              <div className="text-2xl font-bold text-white">{result.summary.suggestions}</div>
            </div>
          </div>

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <div className="text-xs font-semibold text-purple-400 mb-2">
                💡 Recommendations
              </div>
              <ul className="space-y-1">
                {result.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-gray-300 flex items-start gap-2">
                    <span className="text-purple-500 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Issues List */}
          {result.issues.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-400">
                Issues Found ({result.issues.length})
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.issues.map((issue) => {
                  const isExpanded = expandedIssues.has(issue.id);
                  return (
                    <div
                      key={issue.id}
                      className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden"
                    >
                      <button
                        onClick={() => toggleIssue(issue.id)}
                        className="w-full p-3 flex items-start gap-3 hover:bg-gray-800/80 transition-colors text-left"
                      >
                        <span className="text-lg flex-shrink-0">
                          {getCategoryIcon(issue.category)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold ${getSeverityColor(issue.severity)}`}>
                              {issue.severity.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {issue.category}
                            </span>
                            {issue.autoFixable && (
                              <span className="text-xs px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded">
                                Auto-fixable
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-white font-medium">
                            {issue.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {issue.file}
                            {issue.line && `:${issue.line}`}
                            {issue.column && `:${issue.column}`}
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronDownIcon className="w-4 h-4 text-gray-500 flex-shrink-0 mt-1" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-gray-500 flex-shrink-0 mt-1" />
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2 border-t border-gray-700/50">
                          <div className="text-xs text-gray-400 mt-2">
                            {issue.description}
                          </div>
                          {issue.suggestion && (
                            <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2">
                              <div className="text-xs font-semibold text-blue-400 mb-1">
                                💡 Suggestion
                              </div>
                              <div className="text-xs text-gray-300">
                                {issue.suggestion}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Clear Message */}
          {result.issues.length === 0 && (
            <div className="text-center py-6">
              <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <div className="text-sm font-semibold text-white mb-1">
                Code Looks Great!
              </div>
              <div className="text-xs text-gray-500">
                No issues found. Ready to commit.
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
