'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Target, Tag, Clock, Download, ExternalLink } from 'lucide-react';
import type { ConversationSummary } from '@/types/summary';

interface SummaryPanelProps {
  summary: ConversationSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onJumpToMessage?: (messageId: string) => void;
  onExport?: () => void;
}

export function SummaryPanel({
  summary,
  isOpen,
  onClose,
  onJumpToMessage,
  onExport,
}: SummaryPanelProps) {
  if (!isOpen || !summary) return null;

  const momentIcons = {
    decision: '🎯',
    code: '💻',
    solution: '✅',
    file: '📁',
    link: '🔗',
    milestone: '🏆',
  };

  const momentColors = {
    decision: 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    code: 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    solution: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    file: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
    link: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
    milestone: 'from-indigo-500/20 to-purple-500/20 border-indigo-500/30',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25 }}
          className="bg-gray-900 border border-gray-700/50 rounded-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                <FileText className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Conversation Summary</h2>
                <p className="text-sm text-gray-400">
                  {summary.messageCount} messages · Generated {new Date(summary.generatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onExport && (
                <button
                  onClick={onExport}
                  className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 transition-colors"
                  title="Export as Markdown"
                >
                  <Download className="w-4 h-4 text-gray-400" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 overflow-y-auto max-h-[calc(80vh-88px)] custom-scrollbar">
            {/* Main Summary */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                  Overview
                </h3>
              </div>
              <p className="text-base text-gray-100 leading-relaxed">
                {summary.summary}
              </p>
            </div>

            {/* Key Points */}
            {summary.keyPoints.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                    Key Points
                  </h3>
                </div>
                <ul className="space-y-2">
                  {summary.keyPoints.map((point, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-start gap-3 text-sm text-gray-300"
                    >
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <span className="text-xs font-medium text-blue-400">{i + 1}</span>
                      </div>
                      <span className="flex-1">{point}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            )}

            {/* Topics */}
            {summary.topics.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-pink-400" />
                  <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                    Topics Discussed
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary.topics.map((topic, i) => (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="px-3 py-1.5 bg-pink-500/20 text-pink-300 text-sm rounded-lg border border-pink-500/30"
                    >
                      {topic}
                    </motion.span>
                  ))}
                </div>
              </div>
            )}

            {/* Important Moments */}
            {summary.importantMoments.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-green-400" />
                  <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                    Important Moments
                  </h3>
                </div>
                <div className="space-y-2">
                  {summary.importantMoments.map((moment, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      onClick={() => onJumpToMessage?.(moment.messageId)}
                      className={`w-full text-left p-3 rounded-lg bg-gradient-to-r ${
                        momentColors[moment.type]
                      } border hover:scale-[1.02] transition-all group`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl flex-shrink-0">
                          {momentIcons[moment.type]}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-300 uppercase">
                              {moment.type}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(moment.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-200">{moment.description}</p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-gray-500 group-hover:text-gray-300 transition-colors flex-shrink-0" />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Outcome */}
            {summary.outcome && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                    Outcome
                  </h3>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                  {summary.outcome}
                </p>
              </div>
            )}

            {/* Progress (if applicable) */}
            {summary.progress !== null && summary.progress !== undefined && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-gray-200 uppercase tracking-wider">
                    Project Progress
                  </h3>
                </div>
                <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-300">Completion</span>
                    <span className="text-lg font-bold text-purple-300">
                      {Math.round(summary.progress * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${summary.progress * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.3 }}
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
