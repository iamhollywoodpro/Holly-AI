'use client';

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { parseCommand, getCommandHelp, matchesShortcut } from '@/lib/chat-commands';
import { RepoSelector } from './RepoSelector';
import { DeployDialog } from './DeployDialog';
import { PullRequestDialog } from './PullRequestDialog';
import { RollbackDialog } from './RollbackDialog';
import WorkflowsPanel from './WorkflowsPanel';
import TeamCollaborationPanel from './TeamCollaborationPanel';
import IssueManagementPanel from './IssueManagementPanel';
import CreateIssueDialog from './CreateIssueDialog';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { useActiveRepo } from '@/hooks/useActiveRepo';

interface CommandHandlerProps {
  onCommandExecuted?: (command: string) => void;
}

export interface CommandHandlerRef {
  executeCommand: (message: string) => boolean | string;
}

export const CommandHandler = forwardRef<CommandHandlerRef, CommandHandlerProps>(function CommandHandler({ onCommandExecuted }, ref) {
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [showPRDialog, setShowPRDialog] = useState(false);
  const [prBranch, setPRBranch] = useState<string | undefined>();
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [showWorkflowsPanel, setShowWorkflowsPanel] = useState(false);
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const [showIssuesPanel, setShowIssuesPanel] = useState(false);
  const [showCreateIssueDialog, setShowCreateIssueDialog] = useState(false);
  
  const { activeRepo } = useActiveRepo();

  // Expose executeCommand method via ref
  useImperativeHandle(ref, () => ({
    executeCommand: (message: string) => {
      console.log('[CommandHandler] executeCommand called with:', message);
      const command = parseCommand(message);
      console.log('[CommandHandler] Parsed command:', command);
      
      if (!command) {
        return false;
      }

      switch (command.type) {
        case 'repos':
          setShowRepoSelector(true);
          return true;
        
        case 'deploy':
          setShowDeployDialog(true);
          return true;
        
        case 'pr':
          const branch = command.args[0];
          if (branch && branch !== 'review') {
            setPRBranch(branch);
          }
          setShowPRDialog(true);
          return true;
        
        case 'rollback':
          setShowRollbackDialog(true);
          return true;
        
        case 'workflows':
          console.log('[CommandHandler] Opening workflows panel');
          console.log('[CommandHandler] activeRepo:', activeRepo);
          setShowWorkflowsPanel(true);
          return true;
        
        case 'team':
          setShowTeamPanel(true);
          return true;
        
        case 'issues':
          setShowIssuesPanel(true);
          return true;
        
        case 'help':
          return getCommandHelp();
        
        case 'clear':
          return 'CLEAR_CHAT';
        
        case 'unknown':
          return `Unknown command: ${command.rawCommand}\n\nType \`/help\` to see available commands.`;
        
        default:
          return false;
      }
    }
  }));

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

      {/* Rollback Dialog */}
      <RollbackDialog
        isOpen={showRollbackDialog}
        onClose={() => setShowRollbackDialog(false)}
      />

      {/* Workflows Panel */}
      {console.log('[CommandHandler] Render check - showWorkflowsPanel:', showWorkflowsPanel, 'activeRepo:', activeRepo)}
      {showWorkflowsPanel && activeRepo && (
        <Dialog
          open={showWorkflowsPanel}
          onClose={() => setShowWorkflowsPanel(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-5xl max-h-[85vh] overflow-auto bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-xl font-bold">GitHub Actions Workflows</Dialog.Title>
                <button
                  onClick={() => setShowWorkflowsPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <WorkflowsPanel
                owner={activeRepo.owner}
                repo={activeRepo.repo}
              />
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* Team Collaboration Panel */}
      {showTeamPanel && activeRepo && (
        <Dialog
          open={showTeamPanel}
          onClose={() => setShowTeamPanel(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-3xl max-h-[80vh] overflow-auto bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-xl font-bold">Team Collaboration</Dialog.Title>
                <button
                  onClick={() => setShowTeamPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <TeamCollaborationPanel
                owner={activeRepo.owner}
                repo={activeRepo.repo}
              />
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* Issue Management Panel */}
      {showIssuesPanel && activeRepo && (
        <Dialog
          open={showIssuesPanel}
          onClose={() => setShowIssuesPanel(false)}
          className="relative z-50"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="w-full max-w-5xl max-h-[85vh] overflow-auto bg-white rounded-2xl shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-xl font-bold">Issue Management</Dialog.Title>
                <button
                  onClick={() => setShowIssuesPanel(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <IssueManagementPanel
                owner={activeRepo.owner}
                repo={activeRepo.repo}
                onCreateIssue={() => setShowCreateIssueDialog(true)}
              />
            </Dialog.Panel>
          </div>
        </Dialog>
      )}

      {/* Create Issue Dialog */}
      {showCreateIssueDialog && activeRepo && (
        <CreateIssueDialog
          isOpen={showCreateIssueDialog}
          onClose={() => {
            setShowCreateIssueDialog(false);
            // Refresh issues panel if it's open
          }}
          owner={activeRepo.owner}
          repo={activeRepo.repo}
        />
      )}
    </>
  );
});

/**
 * Hook to expose command execution to parent components
 * @deprecated Use CommandHandlerRef with forwardRef instead
 */
export function useCommandHandler() {
  const { activeRepo } = useActiveRepo();
  const [showRepoSelector, setShowRepoSelector] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [showPRDialog, setShowPRDialog] = useState(false);
  const [prBranch, setPRBranch] = useState<string | undefined>();
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [showWorkflowsPanel, setShowWorkflowsPanel] = useState(false);
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const [showIssuesPanel, setShowIssuesPanel] = useState(false);
  const [showCreateIssueDialog, setShowCreateIssueDialog] = useState(false);

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
      
      case 'rollback':
        setShowRollbackDialog(true);
        return true;
      
      case 'workflows':
        setShowWorkflowsPanel(true);
        return true;
      
      case 'team':
        setShowTeamPanel(true);
        return true;
      
      case 'issues':
        setShowIssuesPanel(true);
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
    showRollbackDialog,
    setShowRollbackDialog,
    showWorkflowsPanel,
    setShowWorkflowsPanel,
    showTeamPanel,
    setShowTeamPanel,
    showIssuesPanel,
    setShowIssuesPanel,
    showCreateIssueDialog,
    setShowCreateIssueDialog,
    activeRepo,
    executeCommand,
  };
}
