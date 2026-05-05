'use client';

import { useState } from 'react';
import { ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { CommitDialog } from './CommitDialog';
import type { GitHubFile } from '@/lib/github-api';
import { generateCommitMessage, formatCommitMessage } from '@/lib/commit-message-generator';

interface CommitButtonProps {
  files: GitHubFile[];
  suggestedMessage?: string;
  className?: string;
}

export function CommitButton({ files, suggestedMessage, className = '' }: CommitButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  
  // Generate smart commit message if not provided
  const commitMessage = suggestedMessage || (() => {
    const result = generateCommitMessage(files);
    return formatCommitMessage(result);
  })();

  if (files.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className={`
          inline-flex items-center gap-2 px-4 py-2 
          bg-gradient-to-r from-purple-500 to-pink-500 
          hover:from-purple-600 hover:to-pink-600 
          text-white text-sm font-medium rounded-lg 
          transition-all duration-200 
          shadow-lg shadow-purple-500/20 
          hover:shadow-purple-500/40 
          hover:scale-105
          ${className}
        `}
      >
        <ArrowUpTrayIcon className="w-4 h-4" />
        <span>💾 Commit This Fix</span>
      </button>

      <CommitDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        files={files}
        suggestedMessage={commitMessage}
      />
    </>
  );
}
