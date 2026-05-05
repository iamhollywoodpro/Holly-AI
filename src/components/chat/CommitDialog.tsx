'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useActiveRepo } from '@/hooks/useActiveRepos';
import type { GitHubFile } from '@/lib/github-api';
import { CodeReviewPanel } from './CodeReviewPanel';
import type { CodeReviewResult } from '@/lib/code-reviewer';

interface CommitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  files: GitHubFile[];
  suggestedMessage?: string;
}

interface Branch {
  name: string;
  protected: boolean;
}

export function CommitDialog({ isOpen, onClose, files, suggestedMessage }: CommitDialogProps) {
  const { activeRepo } = useActiveRepo();
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [commitUrl, setCommitUrl] = useState('');
  const [showReview, setShowReview] = useState(true);
  const [reviewResult, setReviewResult] = useState<CodeReviewResult | null>(null);
  const [editableFiles, setEditableFiles] = useState<GitHubFile[]>([]);

  // Initialize editable files when dialog opens
  useEffect(() => {
    if (isOpen && files.length > 0) {
      setEditableFiles([...files]);
    }
  }, [isOpen, files]);

  const updateFilePath = (index: number, newPath: string) => {
    setEditableFiles(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], path: newPath };
      return updated;
    });
  };

  // Set suggested message when dialog opens
  useEffect(() => {
    if (isOpen && suggestedMessage) {
      setCommitMessage(suggestedMessage);
    }
  }, [isOpen, suggestedMessage]);

  // Fetch branches when repo changes
  useEffect(() => {
    if (isOpen && activeRepo) {
      fetchBranches();
      // Use the currently selected branch from the repo selector
      setSelectedBranch(activeRepo.branch || activeRepo.defaultBranch);
    }
  }, [isOpen, activeRepo]);

  const fetchBranches = async () => {
    if (!activeRepo) return;

    try {
      setLoadingBranches(true);
      const response = await fetch(
        `/api/github/branches?owner=${activeRepo.owner}&repo=${activeRepo.repo}`
      );
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      setBranches(data.branches || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch branches');
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleCommit = async () => {
    if (!activeRepo) {
      setError('No repository selected');
      return;
    }

    if (!commitMessage.trim()) {
      setError('Commit message is required');
      return;
    }

    if (!selectedBranch) {
      setError('Branch is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/github/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: activeRepo.owner,
          repo: activeRepo.repo,
          branch: selectedBranch,
          message: commitMessage,
          files: editableFiles,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Failed to create commit');
        return;
      }

      setSuccess(true);
      setCommitUrl(data.commit.url);

      // Auto-close after 3 seconds
      setTimeout(() => {
        handleClose();
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to create commit');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCommitMessage('');
    setError('');
    setSuccess(false);
    setCommitUrl('');
    setEditableFiles([]);
    onClose();
  };

  if (!activeRepo) {
    return (
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={handleClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                  <div className="text-center">
                    <ExclamationCircleIcon className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                    <Dialog.Title className="text-lg font-semibold text-white mb-2">
                      No Repository Selected
                    </Dialog.Title>
                    <p className="text-sm text-gray-400 mb-4">
                      Please select a repository first by using the <code className="px-2 py-1 bg-gray-800 rounded text-purple-400">/repos</code> command.
                    </p>
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                    >
                      Got it
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    );
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                {success ? (
                  // Success State
                  <div className="text-center py-8">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <Dialog.Title className="text-2xl font-bold text-white mb-2">
                      ✅ Committed Successfully!
                    </Dialog.Title>
                    <p className="text-gray-400 mb-4">
                      Your changes have been pushed to GitHub
                    </p>
                    {commitUrl && (
                      <a
                        href={commitUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300"
                      >
                        View commit on GitHub →
                      </a>
                    )}
                    <p className="text-sm text-gray-500 mt-4">
                      Closing automatically...
                    </p>
                  </div>
                ) : (
                  // Commit Form
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <Dialog.Title className="text-xl font-bold text-white">
                        💾 Commit to GitHub
                      </Dialog.Title>
                      <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        <XMarkIcon className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Repository Info */}
                      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                        <div className="text-sm text-gray-400">Repository</div>
                        <div className="text-white font-semibold mt-1">
                          {activeRepo.fullName}
                        </div>
                        {activeRepo.description && (
                          <div className="text-xs text-gray-500 mt-1">
                            {activeRepo.description}
                          </div>
                        )}
                      </div>

                      {/* Branch Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Branch
                        </label>
                        <select
                          value={selectedBranch}
                          onChange={(e) => setSelectedBranch(e.target.value)}
                          disabled={loadingBranches}
                          className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                        >
                          {loadingBranches ? (
                            <option>Loading branches...</option>
                          ) : (
                            branches.map((branch) => (
                              <option key={branch.name} value={branch.name}>
                                {branch.name} {branch.protected ? '🔒' : ''}
                              </option>
                            ))
                          )}
                        </select>
                      </div>

                      {/* Commit Message */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Commit Message
                        </label>
                        <textarea
                          value={commitMessage}
                          onChange={(e) => setCommitMessage(e.target.value)}
                          placeholder="Describe your changes..."
                          rows={4}
                          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                        />
                      </div>

                      {/* Files List - Editable */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Files ({editableFiles.length})
                          <span className="text-xs text-gray-500 ml-2">Click to edit paths</span>
                        </label>
                        <div className="bg-gray-800/50 rounded-lg border border-gray-700 max-h-64 overflow-y-auto">
                          {editableFiles.map((file, index) => (
                            <div
                              key={index}
                              className="px-3 py-3 border-b border-gray-700 last:border-b-0"
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-green-500 mt-2">✓</span>
                                <div className="flex-1">
                                  <input
                                    type="text"
                                    value={file.path}
                                    onChange={(e) => updateFilePath(index, e.target.value)}
                                    placeholder="path/to/file.tsx"
                                    className="w-full px-3 py-1.5 bg-gray-900 border border-gray-600 rounded text-sm text-white font-mono focus:outline-none focus:border-purple-500"
                                  />
                                  <div className="text-xs text-gray-500 mt-1">
                                    {file.content.split('\n').length} lines
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Code Review Panel */}
                      {showReview && files.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-gray-300">
                              🤖 AI Code Review
                            </label>
                            <button
                              onClick={() => setShowReview(!showReview)}
                              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                            >
                              {showReview ? 'Hide' : 'Show'}
                            </button>
                          </div>
                          <div className="bg-gray-800/50 rounded-lg border border-gray-700 overflow-hidden">
                            <CodeReviewPanel
                              files={files}
                              onReviewComplete={setReviewResult}
                            />
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                          <div className="text-sm text-red-400">{error}</div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={handleClose}
                          className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleCommit}
                          disabled={loading || !commitMessage.trim()}
                          className={`flex-1 px-4 py-2 bg-gradient-to-r ${
                            reviewResult && reviewResult.summary.errors > 0
                              ? 'from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                              : 'from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                          } text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {loading ? 'Committing...' : reviewResult && reviewResult.summary.errors > 0 ? '⚠️ Commit Anyway' : 'Commit & Push ✅'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
