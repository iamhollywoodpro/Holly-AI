'use client';

import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  CodeBracketIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { useActiveRepo } from '@/hooks/useActiveRepos';
import { generatePRTemplate } from '@/lib/github/pr-template-generator';
import type { PRCommit, PRFile } from '@/lib/github/pr-template-generator';

interface PullRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBranch?: string; // The branch to create PR from
}

interface PRFormData {
  title: string;
  body: string;
  head: string; // Source branch (your changes)
  base: string; // Target branch (usually main/master)
  draft: boolean;
  reviewers: string[];
}

export function PullRequestDialog({ isOpen, onClose, defaultBranch }: PullRequestDialogProps) {
  const { activeRepo } = useActiveRepo();
  const [status, setStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const [pullRequest, setPullRequest] = useState<any>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  
  const [formData, setFormData] = useState<PRFormData>({
    title: '',
    body: '',
    head: defaultBranch || activeRepo?.branch || '',
    base: activeRepo?.defaultBranch || 'main',
    draft: false,
    reviewers: [],
  });

  // Fetch branches when dialog opens
  useEffect(() => {
    if (isOpen && activeRepo) {
      fetchBranches();
      // Set default head branch
      setFormData(prev => ({
        ...prev,
        head: defaultBranch || activeRepo.branch || '',
        base: activeRepo.defaultBranch || 'main',
      }));
    }
  }, [isOpen, activeRepo, defaultBranch]);

  const fetchBranches = async () => {
    if (!activeRepo) return;

    try {
      setLoadingBranches(true);
      const response = await fetch(
        `/api/github/branches?owner=${activeRepo.owner}&repo=${activeRepo.repo}`
      );
      const data = await response.json();

      if (data.error) {
        console.error('Failed to fetch branches:', data.error);
        return;
      }

      setBranches(data.branches || []);
    } catch (err: any) {
      console.error('Failed to fetch branches:', err);
    } finally {
      setLoadingBranches(false);
    }
  };

  const handleAutoFill = async () => {
    if (!activeRepo || !formData.head || !formData.base) {
      setError('Please select both head and base branches first');
      return;
    }

    if (formData.head === formData.base) {
      setError('Head and base branches must be different');
      return;
    }

    try {
      setGeneratingTemplate(true);
      setError('');

      // Fetch comparison data
      const response = await fetch(
        `/api/github/compare?owner=${activeRepo.owner}&repo=${activeRepo.repo}&base=${formData.base}&head=${formData.head}`
      );
      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Failed to compare branches');
        return;
      }

      const { comparison } = data;

      // Generate PR template
      const template = generatePRTemplate(
        comparison.commits as PRCommit[],
        comparison.files as PRFile[],
        formData.head,
        formData.base
      );

      // Update form with generated template
      setFormData(prev => ({
        ...prev,
        title: template.title,
        body: template.body,
      }));
    } catch (err: any) {
      console.error('Failed to generate PR template:', err);
      setError('Failed to generate PR template');
    } finally {
      setGeneratingTemplate(false);
    }
  };

  const handleCreatePR = async () => {
    if (!activeRepo) {
      setError('No repository selected');
      return;
    }

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    if (formData.head === formData.base) {
      setError('Head and base branches must be different');
      return;
    }

    try {
      setStatus('creating');
      setError('');

      const response = await fetch('/api/github/pull-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: activeRepo.owner,
          repo: activeRepo.repo,
          title: formData.title,
          body: formData.body,
          head: formData.head,
          base: formData.base,
          draft: formData.draft,
          reviewers: formData.reviewers,
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setError(data.error || 'Failed to create pull request');
        setStatus('error');
        return;
      }

      setPullRequest(data.pullRequest);
      setStatus('success');
    } catch (err: any) {
      setError(err.message || 'Failed to create pull request');
      setStatus('error');
    }
  };

  const handleClose = () => {
    setStatus('idle');
    setError('');
    setPullRequest(null);
    setFormData({
      title: '',
      body: '',
      head: defaultBranch || activeRepo?.branch || '',
      base: activeRepo?.defaultBranch || 'main',
      draft: false,
      reviewers: [],
    });
    onClose();
  };

  if (!activeRepo) {
    return null;
  }

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={status === 'creating' ? () => {} : handleClose}>
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
                {status === 'success' ? (
                  // Success State
                  <div className="text-center py-8">
                    <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <Dialog.Title className="text-2xl font-bold text-white mb-2">
                      🎉 Pull Request Created!
                    </Dialog.Title>
                    <p className="text-gray-400 mb-4">
                      Your pull request has been created successfully
                    </p>
                    {pullRequest && (
                      <div className="bg-gray-800/50 rounded-lg p-4 mb-6 text-left">
                        <div className="text-sm text-gray-400 mb-2">
                          #{pullRequest.number} • {pullRequest.draft ? '📝 Draft' : '✅ Ready'}
                        </div>
                        <div className="text-lg font-semibold text-white mb-2">
                          {pullRequest.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {pullRequest.head} → {pullRequest.base}
                        </div>
                        <a
                          href={pullRequest.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 mt-3"
                        >
                          View on GitHub →
                        </a>
                      </div>
                    )}
                    <button
                      onClick={handleClose}
                      className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  // Create PR Form
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                        <CodeBracketIcon className="w-6 h-6" />
                        Create Pull Request
                      </Dialog.Title>
                      {status !== 'creating' && (
                        <button
                          onClick={handleClose}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          <XMarkIcon className="w-6 h-6" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Repository Info */}
                      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
                        <div className="text-sm text-gray-400">Repository</div>
                        <div className="text-white font-semibold mt-1">
                          {activeRepo.fullName}
                        </div>
                      </div>

                      {/* Branch Selection */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-400 mb-2">
                            Head Branch (Your Changes)
                          </label>
                          <select
                            value={formData.head}
                            onChange={(e) => setFormData({ ...formData, head: e.target.value })}
                            disabled={status === 'creating' || loadingBranches}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50"
                          >
                            <option value="">Select branch...</option>
                            {branches.map((branch) => (
                              <option key={branch} value={branch}>
                                {branch}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-400 mb-2">
                            Base Branch (Target)
                          </label>
                          <select
                            value={formData.base}
                            onChange={(e) => setFormData({ ...formData, base: e.target.value })}
                            disabled={status === 'creating' || loadingBranches}
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50"
                          >
                            <option value="">Select branch...</option>
                            {branches.map((branch) => (
                              <option key={branch} value={branch}>
                                {branch}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Auto-fill Button */}
                      {formData.head && formData.base && formData.head !== formData.base && (
                        <div className="flex justify-center">
                          <button
                            onClick={handleAutoFill}
                            disabled={status === 'creating' || generatingTemplate}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 text-purple-300 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {generatingTemplate ? (
                              <>
                                <div className="w-4 h-4 border-2 border-purple-300 border-t-transparent rounded-full animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <SparklesIcon className="w-4 h-4" />
                                ✨ Auto-fill from commits
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Title */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">
                          Title *
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          placeholder="Brief description of changes"
                          disabled={status === 'creating'}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2">
                          Description (optional)
                        </label>
                        <textarea
                          value={formData.body}
                          onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                          placeholder="What changes does this PR make? Why?"
                          disabled={status === 'creating'}
                          rows={4}
                          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50 resize-none"
                        />
                      </div>

                      {/* Draft Option */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="draft"
                          checked={formData.draft}
                          onChange={(e) => setFormData({ ...formData, draft: e.target.checked })}
                          disabled={status === 'creating'}
                          className="w-4 h-4 text-purple-500 bg-gray-800 border-gray-700 rounded focus:ring-purple-500"
                        />
                        <label htmlFor="draft" className="text-sm text-gray-300">
                          Create as draft PR (not ready for review)
                        </label>
                      </div>

                      {/* Error Message */}
                      {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                          <ExclamationCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-red-400">{error}</div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-3 pt-2">
                        {status === 'idle' || status === 'error' ? (
                          <>
                            <button
                              onClick={handleClose}
                              className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleCreatePR}
                              disabled={!formData.title.trim() || !formData.head || !formData.base}
                              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {formData.draft ? '📝 Create Draft PR' : '🚀 Create Pull Request'}
                            </button>
                          </>
                        ) : (
                          <div className="flex-1 px-4 py-2 bg-gray-800 text-white rounded-lg flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Creating pull request...
                          </div>
                        )}
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
