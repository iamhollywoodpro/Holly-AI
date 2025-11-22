'use client';

import { useState, useEffect } from 'react';
import { parseCommand, getCommandHelp, matchesShortcut } from '@/lib/chat-commands';
import { RepoSelector } from './RepoSelector';
import { DeployDialog } from './DeployDialog';
import { PullRequestDialog } from './PullRequestDialog';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface CommandHandlerProps {
  onCommandExecuted?: (command: string) => void;
}

export function CommandHandler({ onCommandExecuted }: CommandHandlerProps) {
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [showPRDialog, setShowPRDialog] = useState(false);
  const [prBranch, setPRBranch] = useState<string | undefined>();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input/textarea
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Check for shortcuts
      if (matchesShortcut(event, 'repos')) {
        event.preventDefault();
        setShowRepoSelector(true);
        onCommandExecuted?.('/repos');
      } else if (matchesShortcut(event, 'deploy')) {
        event.preventDefault();
        setShowDeployDialog(true);
        onCommandExecuted?.('/deploy');
      } else if (matchesShortcut(event, 'pr')) {
        event.preventDefault();
        setShowPRDialog(true);
        onCommandExecuted?.('/pr');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCommandExecuted]);

  return (
    <>
      {/* Repository Selector Dialog */}
      <Transition appear show={showRepoSelector} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setShowRepoSelector(false)}
        >
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
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-gray-900 border border-gray-800 shadow-xl transition-all">
                  <Dialog.Title className="px-6 py-4 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-bold text-white">
                        📂 Select Repository
                      </h2>
                      <button
                        onClick={() => setShowRepoSelector(false)}
                        className="text-gray-400 hover:text-white transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Choose a repository to work on with HOLLY
                    </p>
                  </Dialog.Title>
                  <RepoSelector />
                  <div className="px-6 py-3 border-t border-gray-800 bg-gray-900/50">
                    <div className="text-xs text-gray-500">
                      💡 Tip: Use <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400">Ctrl+R</kbd> to open this dialog anytime
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Deploy Dialog */}
      <DeployDialog
        isOpen={showDeployDialog}
        onClose={() => setShowDeployDialog(false)}
      />

      {/* Pull Request Dialog */}
      <PullRequestDialog
        isOpen={showPRDialog}
        onClose={() => {
          setShowPRDialog(false);
          setPRBranch(undefined);
        }}
        defaultBranch={prBranch}
      />
    </>
  );
}

/**
 * Hook to expose command execution to parent components
 */
export function useCommandHandler() {
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [showPRDialog, setShowPRDialog] = useState(false);
  const [prBranch, setPRBranch] = useState<string | undefined>();

  const executeCommand = (message: string) => {
    const command = parseCommand(message);
    
    if (!command) {
      return false; // Not a command
    }

    switch (command.type) {
      case 'repos':
        setShowRepoSelector(true);
        return true;
      
      case 'deploy':
        setShowDeployDialog(true);
        return true;
      
      case 'pr':
        // Extract branch from args if provided (/pr feature-branch)
        const branch = command.args[0];
        if (branch && branch !== 'review') {
          setPRBranch(branch);
        }
        setShowPRDialog(true);
        return true;
      
      case 'help':
        // Return help text to be displayed in chat
        return getCommandHelp();
      
      case 'clear':
        // Signal to parent to clear chat
        return 'CLEAR_CHAT';
      
      case 'unknown':
        return `Unknown command: ${command.rawCommand}\n\nType \`/help\` to see available commands.`;
      
      default:
        return false;
    }
  };

  return {
    showRepoSelector,
    setShowRepoSelector,
    showDeployDialog,
    setShowDeployDialog,
    showPRDialog,
    setShowPRDialog,
    executeCommand,
  };
}
