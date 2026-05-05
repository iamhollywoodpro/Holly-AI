'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const shortcuts = [
    {
      category: 'Chat',
      items: [
        { keys: ['Ctrl', 'Enter'], mac: ['⌘', 'Enter'], description: 'Send message' },
        { keys: ['Shift', 'Enter'], mac: ['Shift', 'Enter'], description: 'New line' },
        { keys: ['Ctrl', '/'], mac: ['⌘', '/'], description: 'Show commands' },
        { keys: ['Esc'], mac: ['Esc'], description: 'Cancel current action' },
      ]
    },
    {
      category: 'Navigation',
      items: [
        { keys: ['Ctrl', 'K'], mac: ['⌘', 'K'], description: 'Quick command search' },
        { keys: ['Ctrl', 'N'], mac: ['⌘', 'N'], description: 'New chat' },
        { keys: ['Ctrl', 'H'], mac: ['⌘', 'H'], description: 'Toggle chat history' },
        { keys: ['Ctrl', '['], mac: ['⌘', '['], description: 'Previous conversation' },
        { keys: ['Ctrl', ']'], mac: ['⌘', ']'], description: 'Next conversation' },
      ]
    },
    {
      category: 'GitHub',
      items: [
        { keys: ['Ctrl', 'R'], mac: ['⌘', 'R'], description: 'Open repository selector' },
        { keys: ['Ctrl', 'D'], mac: ['⌘', 'D'], description: 'Deploy to Vercel' },
        { keys: ['Ctrl', 'P'], mac: ['⌘', 'P'], description: 'Create pull request' },
        { keys: ['Ctrl', 'Shift', 'R'], mac: ['⌘', 'Shift', 'R'], description: 'Browser refresh (hard)' },
      ]
    },
    {
      category: 'Editing',
      items: [
        { keys: ['Ctrl', 'Z'], mac: ['⌘', 'Z'], description: 'Undo' },
        { keys: ['Ctrl', 'Shift', 'Z'], mac: ['⌘', 'Shift', 'Z'], description: 'Redo' },
        { keys: ['Ctrl', 'A'], mac: ['⌘', 'A'], description: 'Select all' },
        { keys: ['Ctrl', 'C'], mac: ['⌘', 'C'], description: 'Copy' },
        { keys: ['Ctrl', 'V'], mac: ['⌘', 'V'], description: 'Paste' },
      ]
    }
  ];

  const isMac = typeof navigator !== 'undefined' && 
    navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        {/* Backdrop */}
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

        {/* Modal */}
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
              <Dialog.Panel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800">
                  <div>
                    <Dialog.Title className="text-xl font-bold text-white">
                      ⌨️ Keyboard Shortcuts
                    </Dialog.Title>
                    <p className="text-sm text-gray-400 mt-1">
                      Master HOLLY with these keyboard shortcuts
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <XMarkIcon className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {shortcuts.map((section) => (
                      <div key={section.category} className="space-y-3">
                        <h3 className="text-sm font-semibold text-purple-400 uppercase tracking-wide">
                          {section.category}
                        </h3>
                        <div className="space-y-2">
                          {section.items.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
                            >
                              <span className="text-sm text-gray-300">
                                {item.description}
                              </span>
                              <div className="flex items-center gap-1">
                                {(isMac ? item.mac : item.keys).map((key, keyIndex) => (
                                  <Fragment key={keyIndex}>
                                    {keyIndex > 0 && (
                                      <span className="text-gray-600 mx-0.5">+</span>
                                    )}
                                    <kbd className="px-2 py-1 text-xs font-semibold text-white bg-gray-700 rounded border border-gray-600 shadow-sm">
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
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-4 border-t border-gray-800 bg-gray-900/50">
                  <p className="text-xs text-gray-500">
                    💡 Tip: Press <kbd className="px-1.5 py-0.5 text-xs bg-gray-800 rounded">Ctrl+K</kbd> for quick command search
                  </p>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
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
