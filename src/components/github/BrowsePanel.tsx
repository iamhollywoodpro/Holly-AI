'use client';

import React, { useState } from 'react';
import FileBrowser from './FileBrowser';
import FileViewer from './FileViewer';
import { X, ArrowLeft } from 'lucide-react';

interface BrowsePanelProps {
  owner: string;
  repo: string;
  branch?: string;
  onClose?: () => void;
}

interface FileItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  sha?: string;
}

export default function BrowsePanel({
  owner,
  repo,
  branch = 'main',
  onClose,
}: BrowsePanelProps) {
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          {selectedFile && (
            <button
              onClick={() => setSelectedFile(null)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
              title="Back to file browser"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          )}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {selectedFile ? 'File Viewer' : 'Repository Browser'}
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Close browser"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {selectedFile ? (
          <FileViewer
            owner={owner}
            repo={repo}
            filePath={selectedFile.path}
            fileName={selectedFile.name}
            branch={branch}
            onClose={() => setSelectedFile(null)}
            className="h-full"
          />
        ) : (
          <FileBrowser
            owner={owner}
            repo={repo}
            branch={branch}
            onFileSelect={(file) => setSelectedFile(file)}
            className="h-full"
          />
        )}
      </div>
    </div>
  );
}
