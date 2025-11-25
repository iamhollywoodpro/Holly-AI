'use client';

import { useState, useEffect } from 'react';
import { useActiveRepo } from '@/hooks/useActiveRepos';
import {
  XMarkIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  BoltIcon,
  SparklesIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import type { CodeReviewResult, CodeIssue } from '@/lib/code-reviewer';
import { getSeverityColor, getCategoryIcon } from '@/lib/code-reviewer';

interface ReviewPanelProps {
  isOpen: boolean;
  onClose: () => void;
  prNumber?: number;
}

export function ReviewPanel({ isOpen, onClose, prNumber }: ReviewPanelProps) {
  const { activeRepo } = useActiveRepo();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<CodeReviewResult | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && activeRepo && prNumber) {
      performReview();
    }
  }, [isOpen, activeRepo, prNumber]);

  const performReview = async () => {
    if (!activeRepo || !prNumber) return;

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/github/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: activeRepo.owner,
          repo: activeRepo.repo,
          pr_number: prNumber,
          submit_review: false,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Failed to perform code review');
        return;
      }

      setResult(data.reviewResult);
    } catch (err: any) {
      console.error('Failed to perform code review:', err);
      setError('Failed to perform code review');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!activeRepo || !prNumber || !result) return;

    try {
      setSubmitting(true);

      const response = await fetch('/api/github/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: activeRepo.owner,
          repo: activeRepo.repo,
          pr_number: prNumber,
          submit_review: true,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Failed to submit review');
        return;
      }

      // Success - close panel
      onClose();
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setError('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
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

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'performance':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      case 'best-practice':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
      case 'style':
        return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500/20 to-blue-500/20 rounded-lg">
              <ShieldCheckIcon className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Code Review</h2>
              {activeRepo && prNumber && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {activeRepo.fullName} • PR #{prNumber}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {result && (
              <button
                onClick={handleSubmitReview}
                disabled={submitting}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Review to PR'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Analyzing code...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-red-500">{error}</p>
                <button
                  onClick={performReview}
                  className="mt-4 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : result ? (
            <div className="space-y-6">
              {/* Score Card */}
              <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Code Quality Score</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {result.files.length} file(s) analyzed in {result.estimatedReviewTime}
                    </p>
                  </div>
                  <div className={`text-5xl font-bold ${getScoreColor(result.summary.score)}`}>
                    {result.summary.score}
                    <span className="text-2xl">/100</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">Errors</div>
                    <div className="text-2xl font-bold text-red-400">{result.summary.errors}</div>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">Warnings</div>
                    <div className="text-2xl font-bold text-yellow-400">{result.summary.warnings}</div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                    <div className="text-sm text-gray-400 mb-1">Suggestions</div>
                    <div className="text-2xl font-bold text-blue-400">{result.summary.suggestions}</div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-blue-400" />
                    Recommendations
                  </h3>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-400 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Issues */}
              {result.issues.length > 0 ? (
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5" />
                    Issues Found ({result.issues.length})
                  </h3>
                  <div className="space-y-2">
                    {result.issues.map((issue) => (
                      <div
                        key={issue.id}
                        className={`border rounded-lg overflow-hidden ${getCategoryColor(issue.category)}`}
                      >
                        <button
                          onClick={() => toggleIssue(issue.id)}
                          className="w-full p-4 flex items-start gap-3 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex-shrink-0 mt-0.5">
                            {expandedIssues.has(issue.id) ? (
                              <ChevronDownIcon className="w-5 h-5" />
                            ) : (
                              <ChevronRightIcon className="w-5 h-5" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg">{getCategoryIcon(issue.category)}</span>
                              <span className="font-semibold">{issue.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(issue.severity)}`}>
                                {issue.severity}
                              </span>
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {issue.file}
                              {issue.line && ` • Line ${issue.line}`}
                            </div>
                          </div>
                        </button>

                        {expandedIssues.has(issue.id) && (
                          <div className="px-4 pb-4 pt-0 space-y-3 border-t border-current/20">
                            <div>
                              <div className="text-sm font-medium mb-1">Description:</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                {issue.description}
                              </div>
                            </div>

                            {issue.suggestion && (
                              <div>
                                <div className="text-sm font-medium mb-1 flex items-center gap-1">
                                  <SparklesIcon className="w-4 h-4" />
                                  Suggestion:
                                </div>
                                <div className="text-sm bg-white/5 rounded p-2">
                                  {issue.suggestion}
                                </div>
                              </div>
                            )}

                            {issue.autoFixable && (
                              <div className="flex items-center gap-2 text-xs text-green-400">
                                <CheckCircleIcon className="w-4 h-4" />
                                Auto-fixable
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircleIcon className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Perfect Code!</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    No issues found. Great work! 🎉
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <ShieldCheckIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No review data available</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
