'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GitHubStatus {
  success: boolean;
  connected: boolean;
  user?: {
    username?: string;
    email?: string;
    name?: string;
    avatar?: string;
  };
  stats?: {
    publicRepos?: number;
    privateRepos?: number;
    followers?: number;
    following?: number;
  };
}

export function GitHubIndicator() {
  const [status, setStatus] = useState<GitHubStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const checkGitHubStatus = async () => {
      try {
        const response = await fetch('/api/github/status');
        const data = await response.json();
        
        if (mounted) {
          setStatus(data);
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setStatus({ success: false, connected: false });
          setLoading(false);
        }
      }
    };

    checkGitHubStatus();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Memoize the render to prevent unnecessary re-renders
  const indicator = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">Checking GitHub...</span>
        </div>
      );
    }

    // If connected, show purple badge with GitHub info
    if (status?.connected) {
      return (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 shadow-lg shadow-purple-500/10"
          >
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span className="text-sm text-purple-400">✓</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-purple-300">GitHub Connected</span>
              {status.user?.username && (
                <span className="text-[10px] text-purple-400/60">@{status.user.username}</span>
              )}
            </div>
            {status.stats && (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-purple-500/20">
                <span className="text-[10px] text-purple-400/60">
                  {status.stats.publicRepos + (status.stats.privateRepos || 0)} repos
                </span>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      );
    }

    // If not connected, show "Connect GitHub" button
    return (
      <AnimatePresence>
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={() => window.location.href = '/api/github/connect'}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/50 hover:bg-purple-500/10 transition-all duration-200"
        >
          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
          </svg>
          <span className="text-xs text-gray-400">Connect GitHub</span>
        </motion.button>
      </AnimatePresence>
    );
  }, [loading, status]);

  return indicator;
}
