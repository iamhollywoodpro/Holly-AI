'use client';

import { useState } from 'react';
import { CodeBracketIcon } from '@heroicons/react/24/outline';
import { PullRequestDialog } from './PullRequestDialog';

interface PullRequestButtonProps {
  branch?: string;
  className?: string;
}

export function PullRequestButton({ branch, className = '' }: PullRequestButtonProps) {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className={`
          inline-flex items-center gap-2 px-4 py-2 
          bg-gradient-to-r from-purple-500 to-indigo-500 
          hover:from-purple-600 hover:to-indigo-600 
          text-white text-sm font-medium rounded-lg 
          transition-all duration-200 
          shadow-lg shadow-purple-500/20 
          hover:shadow-purple-500/40 
          hover:scale-105
          ${className}
        `}
      >
        <CodeBracketIcon className="w-4 h-4" />
        <span>🔀 Create Pull Request</span>
      </button>

      <PullRequestDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        defaultBranch={branch}
      />
    </>
  );
}
