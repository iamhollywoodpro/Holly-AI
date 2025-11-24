'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';

export default function AccountPage() {
  const { user } = useUser();
  const [usage, setUsage] = useState({ messages: 0, tokens: 0, conversations: 0 });

  useEffect(() => {
    // Fetch usage stats
    fetch('/api/usage')
      .then((res) => res.json())
      .then((data) => setUsage(data))
      .catch((err) => console.error('Failed to fetch usage:', err));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Account & Billing</h2>
        <p className="text-gray-400">Manage your account and subscription</p>
      </div>

      {/* Profile Info */}
      <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-lg p-6">
        <div className="flex items-center gap-4">
          {user?.imageUrl && (
            <img
              src={user.imageUrl}
              alt={user.fullName || 'User'}
              className="w-20 h-20 rounded-full border-2 border-purple-500/30"
            />
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white">{user?.fullName || 'User'}</h3>
            <p className="text-gray-400">{user?.primaryEmailAddress?.emailAddress}</p>
            <div className="flex gap-2 mt-2">
              <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                Free Plan
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Usage This Month</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-400">{usage.conversations}</div>
            <div className="text-sm text-gray-400 mt-1">Conversations</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-pink-400">{usage.messages}</div>
            <div className="text-sm text-gray-400 mt-1">Messages</div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-400">
              {(usage.tokens / 1000).toFixed(1)}K
            </div>
            <div className="text-sm text-gray-400 mt-1">Tokens</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-white">Quick Actions</h3>

        <a
          href="/profile"
          className="block w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">Edit Profile</div>
              <div className="text-xs text-gray-400">Update your name and avatar</div>
            </div>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </a>

        <button
          className="block w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors text-left"
          onClick={() => alert('Subscription management coming soon!')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">Upgrade Plan</div>
              <div className="text-xs text-gray-400">Get more features and higher limits</div>
            </div>
            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">Soon</span>
          </div>
        </button>

        <button
          className="block w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors text-left"
          onClick={() => {
            if (confirm('Export all your conversation data? This may take a moment.')) {
              window.location.href = '/api/export-data';
            }
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-white">Export Data</div>
              <div className="text-xs text-gray-400">Download all your conversations</div>
            </div>
            <svg
              className="w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          </div>
        </button>
      </div>

      {/* Danger Zone */}
      <div className="pt-6 border-t border-red-900/30">
        <h3 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>
        <button
          onClick={() => {
            if (
              confirm(
                'Delete all conversations? This will permanently delete all your chat history. This cannot be undone!'
              )
            ) {
              fetch('/api/conversations', { method: 'DELETE' })
                .then(() => window.location.reload())
                .catch((err) => alert('Failed to delete conversations'));
            }
          }}
          className="w-full px-4 py-3 bg-red-900/20 hover:bg-red-900/30 rounded-lg border border-red-800/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="text-left">
              <div className="text-sm font-medium text-red-300">Delete All Conversations</div>
              <div className="text-xs text-red-400/70">Permanently remove all chat history</div>
            </div>
            <svg
              className="w-5 h-5 text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}
