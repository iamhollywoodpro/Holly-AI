'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, EyeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { Collaborator } from '@/types/collaboration';

interface ReviewRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  suggestedReviewer?: string;
}

export default function ReviewRequestDialog({
  isOpen,
  onClose,
  owner,
  repo,
  prNumber,
  prTitle,
  suggestedReviewer,
}: ReviewRequestDialogProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedReviewers, setSelectedReviewers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedReviewers(suggestedReviewer ? [suggestedReviewer] : []);
      setSearchQuery('');
      setError(null);
      setSuccess(false);
      fetchCollaborators();
    }
  }, [isOpen, suggestedReviewer]);

  const fetchCollaborators = async () => {
    try {
      const response = await fetch(
        `/api/github/collaborators?owner=${owner}&repo=${repo}&permission=push`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch collaborators');
      }

      const data = await response.json();
      // Filter out users who can review (push permission or higher)
      const reviewers = data.collaborators.filter((c: Collaborator) => 
        c.permissions?.push || c.permissions?.admin || c.permissions?.maintain
      );
      setCollaborators(reviewers);
    } catch (err: any) {
      console.error('Error fetching collaborators:', err);
    }
  };

  const handleSubmit = async () => {
    if (selectedReviewers.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/github/pull-requests/${prNumber}/reviews`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            owner,
            repo,
            reviewers: selectedReviewers,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request reviews');
      }

      setSuccess(true);
      
      // Auto-close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleReviewer = (username: string) => {
    if (selectedReviewers.includes(username)) {
      setSelectedReviewers(selectedReviewers.filter(r => r !== username));
    } else {
      setSelectedReviewers([...selectedReviewers, username]);
    }
  };

  const filteredCollaborators = collaborators.filter(collab =>
    collab.login.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
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
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      Request Review
                    </Dialog.Title>
                    <p className="text-sm text-gray-600 mt-1">#{prNumber} - {prTitle}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                {success ? (
                  <div className="py-8 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircleIcon className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Review Requested!
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedReviewers.length} reviewer{selectedReviewers.length !== 1 ? 's' : ''} notified
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Search */}
                    <div className="mb-4">
                      <input
                        type="text"
                        placeholder="Search reviewers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                      />
                    </div>

                    {/* Selected Count */}
                    {selectedReviewers.length > 0 && (
                      <div className="mb-3 p-2 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm text-purple-800">
                          {selectedReviewers.length} reviewer{selectedReviewers.length !== 1 ? 's' : ''} selected
                        </p>
                      </div>
                    )}

                    {/* Reviewers List */}
                    <div className="mb-4 max-h-96 overflow-y-auto space-y-2">
                      {filteredCollaborators.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p className="text-sm">No reviewers found</p>
                        </div>
                      ) : (
                        filteredCollaborators.map((collab) => {
                          const isSelected = selectedReviewers.includes(collab.login);
                          
                          return (
                            <button
                              key={collab.id}
                              onClick={() => toggleReviewer(collab.login)}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-50'
                                  : 'border-gray-200 hover:border-purple-300'
                              }`}
                            >
                              <img
                                src={collab.avatar_url}
                                alt={collab.login}
                                className="w-10 h-10 rounded-full"
                              />
                              <div className="flex-1 text-left">
                                <div className="font-medium text-gray-900">
                                  @{collab.login}
                                </div>
                                {collab.permissions && (
                                  <div className="text-xs text-gray-500">
                                    {collab.permissions.admin ? 'Admin' : 
                                     collab.permissions.maintain ? 'Maintainer' : 
                                     collab.permissions.push ? 'Write' : 'Read'}
                                  </div>
                                )}
                              </div>
                              {isSelected && (
                                <CheckCircleIcon className="w-6 h-6 text-purple-600" />
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>

                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">{error}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={loading || selectedReviewers.length === 0}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Requesting...
                          </>
                        ) : (
                          <>
                            <EyeIcon className="w-4 h-4" />
                            Request Review
                          </>
                        )}
                      </button>
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
