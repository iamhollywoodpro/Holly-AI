'use client';

import React, { useState } from 'react';
import { parseCommand } from '@/lib/chat-commands';
import { useActiveRepo } from '@/hooks/useActiveRepo';
import CompareDialog from './CompareDialog';
import CommitDialog from './CommitDialog';
import BranchDialog from './BranchDialog';
import PullRequestDialog from './PullRequestDialog';
import WorkflowsPanel from './WorkflowsPanel';
import TeamCollaborationPanel from './TeamCollaborationPanel';
import IssueManagementPanel from './IssueManagementPanel';

export default function CommandHandler() {
  const [showCompare, setShowCompare] = useState(false);
  const [showCommit, setShowCommit] = useState(false);
  const [showBranch, setShowBranch] = useState(false);
  const [showPR, setShowPR] = useState(false);
  const [showWorkflowsPanel, setShowWorkflowsPanel] = useState(false);
  const [showTeamPanel, setShowTeamPanel] = useState(false);
  const [showIssuesPanel, setShowIssuesPanel] = useState(false);

  const [compareData, setCompareData] = useState<{
    base: string;
    compare: string;
  } | null>(null);

  const [commitData, setCommitData] = useState<{
    branch: string;
    message?: string;
  } | null>(null);

  const [branchData, setBranchData] = useState<{
    action: 'create' | 'switch' | 'delete';
    name?: string;
    from?: string;
  } | null>(null);

  const [prData, setPRData] = useState<{
    base: string;
    head: string;
    title?: string;
  } | null>(null);

  return (
    <>
      {showCompare && compareData && (
        <CompareDialog
          isOpen={showCompare}
          onClose={() => {
            setShowCompare(false);
            setCompareData(null);
          }}
          initialBase={compareData.base}
          initialCompare={compareData.compare}
        />
      )}

      {showCommit && commitData && (
        <CommitDialog
          isOpen={showCommit}
          onClose={() => {
            setShowCommit(false);
            setCommitData(null);
          }}
          initialBranch={commitData.branch}
          initialMessage={commitData.message}
        />
      )}

      {showBranch && branchData && (
        <BranchDialog
          isOpen={showBranch}
          onClose={() => {
            setShowBranch(false);
            setBranchData(null);
          }}
          initialAction={branchData.action}
          initialName={branchData.name}
          initialFrom={branchData.from}
        />
      )}

      {showPR && prData && (
        <PullRequestDialog
          isOpen={showPR}
          onClose={() => {
            setShowPR(false);
            setPRData(null);
          }}
          initialBase={prData.base}
          initialHead={prData.head}
          initialTitle={prData.title}
        />
      )}

      {showWorkflowsPanel && (
        <WorkflowsPanel
          isOpen={showWorkflowsPanel}
          onClose={() => setShowWorkflowsPanel(false)}
        />
      )}

      {showTeamPanel && (
        <TeamCollaborationPanel
          isOpen={showTeamPanel}
          onClose={() => setShowTeamPanel(false)}
        />
      )}

      {showIssuesPanel && (
        <IssueManagementPanel
          isOpen={showIssuesPanel}
          onClose={() => setShowIssuesPanel(false)}
        />
      )}
    </>
  );
}

// Hook for executing commands - accepts callbacks for state management
interface CommandCallbacks {
  onShowCompare: (data: { base: string; compare: string }) => void;
  onShowCommit: (data: { branch: string; message?: string }) => void;
  onShowBranch: (data: { action: 'create' | 'switch' | 'delete'; name?: string; from?: string }) => void;
  onShowPR: (data: { base: string; head: string; title?: string }) => void;
  onShowWorkflows: () => void;
  onShowTeam: () => void;
  onShowIssues: () => void;
}

export function useCommandHandler(callbacks?: CommandCallbacks) {
  const { activeRepo } = useActiveRepo();

  const executeCommand = async (input: string): Promise<boolean> => {
    const parsed = parseCommand(input);
    if (!parsed) return false;

    const { command, args } = parsed;

    // Check if we have an active repo for commands that need it
    const needsRepo = ['compare', 'commit', 'branch', 'pr', 'workflows', 'actions', 'team', 'collab', 'issues', 'bugs'];
    if (needsRepo.includes(command) && !activeRepo) {
      console.warn(`Command /${command} requires an active repository`);
      return false;
    }

    // Execute command based on type
    switch (command) {
      case 'compare':
        if (args.length >= 2 && callbacks?.onShowCompare) {
          callbacks.onShowCompare({
            base: args[0],
            compare: args[1]
          });
          return true;
        }
        break;

      case 'commit':
        if (args.length >= 1 && callbacks?.onShowCommit) {
          callbacks.onShowCommit({
            branch: args[0],
            message: args.slice(1).join(' ') || undefined
          });
          return true;
        }
        break;

      case 'branch':
        if (args.length >= 1 && callbacks?.onShowBranch) {
          const action = args[0] as 'create' | 'switch' | 'delete';
          callbacks.onShowBranch({
            action,
            name: args[1],
            from: args[2]
          });
          return true;
        }
        break;

      case 'pr':
        if (args.length >= 2 && callbacks?.onShowPR) {
          callbacks.onShowPR({
            base: args[0],
            head: args[1],
            title: args.slice(2).join(' ') || undefined
          });
          return true;
        }
        break;

      case 'workflows':
      case 'actions':
        if (callbacks?.onShowWorkflows) {
          callbacks.onShowWorkflows();
          return true;
        }
        break;

      case 'team':
      case 'collab':
        if (callbacks?.onShowTeam) {
          callbacks.onShowTeam();
          return true;
        }
        break;

      case 'issues':
      case 'bugs':
        if (callbacks?.onShowIssues) {
          callbacks.onShowIssues();
          return true;
        }
        break;

      case 'help':
        // Return command list
        console.log('Available commands:', [
          '/compare <base> <compare>',
          '/commit <branch> [message]',
          '/branch <create|switch|delete> <name> [from]',
          '/pr <base> <head> [title]',
          '/workflows or /actions',
          '/team or /collab',
          '/issues or /bugs',
          '/help'
        ]);
        return true;

      default:
        return false;
    }

    return false;
  };

  return { executeCommand };
}
