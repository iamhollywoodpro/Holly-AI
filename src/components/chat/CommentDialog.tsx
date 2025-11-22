'use client';

import { Fragment, useState, useEffect, useRef } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon, PaperAirplaneIcon, AtSymbolIcon } from '@heroicons/react/24/outline';
import { Collaborator } from '@/types/collaboration';

interface CommentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  prNumber: number;
  prTitle: string;
  mentionUser?: string;
}

export default function CommentDialog({
  isOpen,
  onClose,
  owner,
  repo,
  prNumber,
  prTitle,
  mentionUser,
}: CommentDialogProps) {
  const [comment, setComment] = useState('');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setComment(mentionUser ? `@${mentionUser} ` : '');
      setError(null);
      setSuccess(false);
      fetchCollaborators();
    }
  }, [isOpen, mentionUser]);

  useEffect(() => {
    // Detect @mentions in comment
    const lastAtSymbol = comment.lastIndexOf('@');
    if (lastAtSymbol !== -1 && lastAtSymbol === comment.length - 1) {
      setShowMentions(true);
      setMentionSearch('');
    } else if (lastAtSymbol !== -1) {
      const searchText = comment.substring(lastAtSymbol + 1);
      if (!searchText.includes(' ')) {
        setShowMentions(true);
        setMentionSearch(searchText);
      } else {
        setShowMentions(false);
      }
    } else {
      setShowMentions(false);
    }
  }, [comment]);

  const fetchCollaborators = async () => {
    try {
      const response = await fetch(
        `/api/github/collaborators?owner=${owner}&repo=${repo}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch collaborators');
      }

      const data = await response.json();
      setCollaborators(data.collaborators || []);
    } catch (err: any) {
      console.error('Error fetching collaborators:', err);
    }
  };

  const handleSubmit = async () => {
    if (!comment.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/github/pull-requests/${prNumber}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            owner,
            repo,
            body: comment,
            type: 'general',
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to post comment');
      }

      setSuccess(true);
      setComment('');
      
      // Auto-close after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const insertMention = (username: string) => {
    const lastAtSymbol = comment.lastIndexOf('@');
    const newComment = comment.substring(0, lastAtSymbol) + `@${username} `;
    setComment(newComment);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const filteredCollaborators = collaborators.filter(collab =>
    collab.login.toLowerCase().includes(mentionSearch.toLowerCase())
  ).slice(0, 5);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-visible rounded-2xl bg-white p-6 shadow-xl transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <Dialog.Title className="text-lg font-semibold text-gray-900">
                      Comment on Pull Request
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
                      <PaperAirplaneIcon className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Comment Posted!
                    </h3>
                    <p className="text-sm text-gray-600">
                      Your comment has been added to the pull request
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Comment Textarea */}
                    <div className="mb-4 relative">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Comment
                      </label>
                      <div className="relative">
                        <textarea
                          ref={textareaRef}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Leave a comment... Use @ to mention someone"
                          rows={6}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                        />
                        <button
                          onClick={() => setComment(comment + '@')}
                          className="absolute bottom-3 right-3 p-2 text-gray-400 hover:text-purple-600 transition-colors"
                          title="Insert mention"
                        >
                          <AtSymbolIcon className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Supports Markdown. Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">⌘</kbd> + <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs">Enter</kbd> to submit
                      </p>

                      {/* Mention Dropdown */}
                      {showMentions && filteredCollaborators.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          {filteredCollaborators.map((collab) => (
                            <button
                              key={collab.id}
                              onClick={() => insertMention(collab.login)}
                              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-purple-50 transition-colors text-left"
                            >
                              <img
                                src={collab.avatar_url}
                                alt={collab.login}
                                className="w-6 h-6 rounded-full"
                              />
                              <span className="text-sm font-medium text-gray-900">
                                @{collab.login}
                              </span>
                            </button>
                          ))}
                        </div>
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
                        disabled={loading || !comment.trim()}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {loading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Posting...
                          </>
                        ) : (
                          <>
                            <PaperAirplaneIcon className="w-4 h-4" />
                            Post Comment
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
