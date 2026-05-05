'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X, Command, Search, Plus, Menu, Music, Mic2, Code } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface Shortcut {
  keys: string[];
  description: string;
  category: string;
}

const shortcuts: Shortcut[] = [
  // Navigation
  { keys: ['Ctrl/Cmd', 'N'], description: 'New chat', category: 'Navigation' },
  { keys: ['Ctrl/Cmd', 'K'], description: 'Quick search conversations', category: 'Navigation' },
  { keys: ['Ctrl/Cmd', 'M'], description: 'Toggle sidebar', category: 'Navigation' },
  { keys: ['Ctrl/Cmd', '1'], description: 'Go to Music Studio', category: 'Navigation' },
  { keys: ['Ctrl/Cmd', '2'], description: 'Go to AURA Lab', category: 'Navigation' },
  { keys: ['Ctrl/Cmd', '3'], description: 'Go to Code Workshop', category: 'Navigation' },
  { keys: ['Esc'], description: 'Close modals/sidebar', category: 'Navigation' },
  
  // Chat Actions
  { keys: ['Ctrl/Cmd', '/'], description: 'Focus message input', category: 'Chat' },
  { keys: ['Ctrl/Cmd', 'Enter'], description: 'Send message', category: 'Chat' },
  { keys: ['Ctrl/Cmd', 'E'], description: 'Export conversation', category: 'Chat' },
  { keys: ['Ctrl/Cmd', 'D'], description: 'Delete conversation', category: 'Chat' },
  { keys: ['Ctrl/Cmd', 'P'], description: 'Pin/Unpin conversation', category: 'Chat' },
  
  // Editing
  { keys: ['Ctrl/Cmd', 'C'], description: 'Copy message', category: 'Editing' },
  { keys: ['Ctrl/Cmd', 'R'], description: 'Regenerate response', category: 'Editing' },
  
  // View
  { keys: ['Ctrl/Cmd', 'B'], description: 'Toggle voice', category: 'View' },
  { keys: ['Ctrl/Cmd', ','], description: 'Open settings', category: 'View' },
  { keys: ['?'], description: 'Show keyboard shortcuts', category: 'View' },
];

const categories = Array.from(new Set(shortcuts.map(s => s.category)));

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
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
              <Dialog.Panel 
                className="w-full max-w-2xl transform overflow-hidden rounded-2xl p-6 text-left align-middle shadow-xl transition-all"
                style={{
                  backgroundColor: cyberpunkTheme.colors.background.secondary,
                  border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title
                    className="text-2xl font-bold"
                    style={{
                      background: cyberpunkTheme.colors.gradients.holographic,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    ⌨️ Keyboard Shortcuts
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                    style={{ color: cyberpunkTheme.colors.text.secondary }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Shortcuts by Category */}
                <div className="space-y-6">
                  {categories.map(category => (
                    <div key={category}>
                      <h3 
                        className="text-sm font-semibold mb-3 uppercase tracking-wider"
                        style={{ color: cyberpunkTheme.colors.primary.cyan }}
                      >
                        {category}
                      </h3>
                      <div className="space-y-2">
                        {shortcuts
                          .filter(s => s.category === category)
                          .map((shortcut, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg"
                              style={{ backgroundColor: cyberpunkTheme.colors.background.primary }}
                            >
                              <span 
                                className="text-sm"
                                style={{ color: cyberpunkTheme.colors.text.primary }}
                              >
                                {shortcut.description}
                              </span>
                              <div className="flex items-center gap-1">
                                {shortcut.keys.map((key, i) => (
                                  <Fragment key={i}>
                                    {i > 0 && (
                                      <span 
                                        className="text-xs mx-1"
                                        style={{ color: cyberpunkTheme.colors.text.tertiary }}
                                      >
                                        +
                                      </span>
                                    )}
                                    <kbd
                                      className="px-2 py-1 text-xs font-mono rounded"
                                      style={{
                                        backgroundColor: cyberpunkTheme.colors.background.secondary,
                                        border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                                        color: cyberpunkTheme.colors.text.secondary,
                                      }}
                                    >
                                      {key}
                                    </kbd>
                                  </Fragment>
                                ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div 
                  className="mt-6 pt-4 border-t text-center text-sm"
                  style={{ 
                    borderColor: cyberpunkTheme.colors.border.primary,
                    color: cyberpunkTheme.colors.text.tertiary,
                  }}
                >
                  Press <kbd className="px-2 py-1 mx-1 text-xs font-mono rounded" style={{
                    backgroundColor: cyberpunkTheme.colors.background.primary,
                    border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
                  }}>?</kbd> anytime to view shortcuts
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
