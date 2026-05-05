'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Menu } from '@headlessui/react';
import { CodeBracketIcon, FolderIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface GitHubStatusIconProps {
  isConnected: boolean;
  username?: string;
  repoCount?: number;
  onConnect?: () => void;
  onOpenRepos?: () => void;
  onOpenIssues?: () => void;
}

export function GitHubStatusIcon({
  isConnected,
  username,
  repoCount = 0,
  onConnect,
  onOpenRepos,
  onOpenIssues
}: GitHubStatusIconProps) {
  const [isHovered, setIsHovered] = useState(false);

  if (!isConnected) {
    // Red/Grey disconnected state
    return (
      <motion.button
        onClick={onConnect}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="relative p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 transition-colors group"
        title="Connect GitHub"
      >
        {/* GitHub Icon */}
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>

        {/* Status Indicator */}
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-gray-900" />

        {/* Hover Tooltip */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg shadow-xl whitespace-nowrap z-50"
          >
            <p className="text-xs text-red-400 font-medium">GitHub Not Connected</p>
            <p className="text-xs text-gray-500 mt-0.5">Click to connect</p>
          </motion.div>
        )}
      </motion.button>
    );
  }

  // Green connected state with dropdown
  return (
    <Menu as="div" className="relative">
      <Menu.Button
        as={motion.button}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="relative p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 transition-colors"
      >
        {/* GitHub Icon */}
        <svg className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>

        {/* Green Status Indicator */}
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-900 animate-pulse" />

        {/* Hover Tooltip */}
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded-lg shadow-xl whitespace-nowrap z-50"
          >
            <p className="text-xs text-green-400 font-medium">✓ GitHub Connected</p>
            <p className="text-xs text-gray-400 mt-0.5">@{username}</p>
            <p className="text-xs text-gray-500">{repoCount} repositories</p>
          </motion.div>
        )}
      </Menu.Button>

      {/* Dropdown Menu */}
      <Menu.Items className="absolute right-0 mt-2 w-56 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <p className="text-sm font-semibold text-white">@{username}</p>
          <p className="text-xs text-gray-400 mt-0.5">{repoCount} repositories</p>
        </div>

        <div className="py-1">
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={onOpenRepos}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                  active ? 'bg-gray-800 text-white' : 'text-gray-300'
                }`}
              >
                <FolderIcon className="w-4 h-4" />
                Browse Repositories
              </button>
            )}
          </Menu.Item>

          <Menu.Item>
            {({ active }) => (
              <button
                onClick={onOpenIssues}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2 ${
                  active ? 'bg-gray-800 text-white' : 'text-gray-300'
                }`}
              >
                <ExclamationTriangleIcon className="w-4 h-4" />
                View Issues
              </button>
            )}
          </Menu.Item>

          <Menu.Item>
            {({ active }) => (
              <a
                href={`https://github.com/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`block px-4 py-2 text-sm flex items-center gap-2 ${
                  active ? 'bg-gray-800 text-white' : 'text-gray-300'
                }`}
              >
                <CodeBracketIcon className="w-4 h-4" />
                View on GitHub
              </a>
            )}
          </Menu.Item>
        </div>

        <div className="px-4 py-2 border-t border-gray-800 bg-gray-800/50">
          <a
            href="/settings/integrations"
            className="text-xs text-gray-400 hover:text-white transition-colors"
          >
            Manage Connection →
          </a>
        </div>
      </Menu.Items>
    </Menu>
  );
}
