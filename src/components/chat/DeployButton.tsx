'use client';

import { useState } from 'react';
import { RocketLaunchIcon } from '@heroicons/react/24/outline';
import { DeployDialog } from './DeployDialog';

interface DeployButtonProps {
  className?: string;
  variant?: 'default' | 'success';
}

export function DeployButton({ className = '', variant = 'default' }: DeployButtonProps) {
  const [showDialog, setShowDialog] = useState(false);

  const styles = variant === 'success' 
    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600'
    : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600';

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className={`
          inline-flex items-center gap-2 px-4 py-2 
          ${styles}
          text-white text-sm font-medium rounded-lg 
          transition-all duration-200 
          shadow-lg shadow-blue-500/20 
          hover:shadow-blue-500/40 
          hover:scale-105
          ${className}
        `}
      >
        <RocketLaunchIcon className="w-4 h-4" />
        <span>🚀 Deploy to Vercel</span>
      </button>

      <DeployDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
      />
    </>
  );
}
