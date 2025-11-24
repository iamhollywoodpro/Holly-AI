'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CommandLineIcon, XMarkIcon } from '@heroicons/react/24/outline';

const HINT_STORAGE_KEY = 'holly-command-hint-shown';

export function CommandHintToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Check if hint has been shown before
    const hasShown = localStorage.getItem(HINT_STORAGE_KEY);
    
    if (!hasShown) {
      // Show hint after 3 seconds on first visit
      const timer = setTimeout(() => {
        setShow(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem(HINT_STORAGE_KEY, 'true');
  };

  const handleTryIt = () => {
    // Focus on chat input
    const chatInput = document.querySelector<HTMLTextAreaElement>('textarea[placeholder*="Type"]');
    if (chatInput) {
      chatInput.focus();
      chatInput.value = '/';
      // Trigger input event to show autocomplete
      chatInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
    handleDismiss();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 50, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 50, x: '-50%' }}
          className="fixed bottom-24 left-1/2 z-50 max-w-md"
        >
          <div className="bg-gradient-to-r from-purple-900/95 to-pink-900/95 backdrop-blur-xl border border-purple-500/30 rounded-xl shadow-2xl p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 p-2 bg-purple-500/20 rounded-lg">
                <CommandLineIcon className="w-6 h-6 text-purple-300" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white mb-1">
                  💡 Quick Tip: Command Shortcuts
                </h4>
                <p className="text-xs text-gray-300 mb-3">
                  Type <kbd className="px-2 py-1 bg-gray-800 rounded text-purple-300 font-mono">/</kbd> in the chat to see available commands like <span className="text-purple-300">/repos</span>, <span className="text-purple-300">/issues</span>, and more!
                </p>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTryIt}
                    className="text-xs px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-medium transition-colors"
                  >
                    Try it now
                  </button>
                  <button
                    onClick={handleDismiss}
                    className="text-xs px-3 py-1.5 text-gray-300 hover:text-white transition-colors"
                  >
                    Got it
                  </button>
                </div>
              </div>

              {/* Close button */}
              <button
                onClick={handleDismiss}
                className="flex-shrink-0 text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
