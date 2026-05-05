'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Command, Keyboard } from 'lucide-react';

interface KeyboardShortcutsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function KeyboardShortcuts({ isOpen, onClose }: KeyboardShortcutsProps) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const shortcuts = [
    { keys: ['Cmd/Ctrl', 'K'], description: 'Quick Actions' },
    { keys: ['Cmd/Ctrl', 'N'], description: 'New Chat' },
    { keys: ['Cmd/Ctrl', 'U'], description: 'Upload File' },
    { keys: ['Cmd/Ctrl', 'M'], description: 'Voice Input' },
    { keys: ['Cmd/Ctrl', '/'], description: 'Toggle History' },
    { keys: ['Cmd/Ctrl', 'B'], description: 'Toggle Consciousness' },
    { keys: ['?'], description: 'Show Shortcuts' },
    { keys: ['/'], description: 'Slash Commands' },
    { keys: ['Esc'], description: 'Close Modal' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50 px-4"
          >
            {/* Glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-3xl blur-xl" />

            {/* Content */}
            <div className="relative bg-gray-900/95 backdrop-blur-xl border border-gray-800/50 rounded-3xl shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                    <Keyboard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
                    <p className="text-xs text-gray-400">Boost your productivity</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-800/50 text-gray-400 hover:text-white transition-colors"
                  aria-label="Close shortcuts"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Shortcuts List */}
              <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                {shortcuts.map((shortcut, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center justify-between py-2"
                  >
                    {/* Keys */}
                    <div className="flex items-center gap-2">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          <kbd className="px-2.5 py-1.5 text-xs font-semibold text-gray-300 bg-gray-800/50 border border-gray-700/50 rounded-lg shadow-sm">
                            {key}
                          </kbd>
                          {i < shortcut.keys.length - 1 && (
                            <span className="mx-1 text-gray-500">+</span>
                          )}
                        </span>
                      ))}
                    </div>

                    {/* Description */}
                    <span className="text-sm text-gray-400">{shortcut.description}</span>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-3 border-t border-gray-800/50 bg-gray-800/30">
                <p className="text-xs text-center text-gray-500">
                  Press <kbd className="px-1.5 py-0.5 bg-gray-800/50 border border-gray-700/50 rounded text-gray-300">?</kbd> anytime to view shortcuts
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
