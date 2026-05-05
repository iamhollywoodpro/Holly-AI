'use client';

import { useState } from 'react';
import { Copy, Download, Lock, Clock, AlertCircle, Check } from 'lucide-react';

interface DownloadLinkCardProps {
  linkId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  shareUrl: string;
  expiresAt?: Date;
  maxDownloads?: number;
  downloadCount: number;
  hasPassword: boolean;
  title?: string;
  description?: string;
}

export function DownloadLinkCard({
  linkId,
  fileName,
  fileType,
  fileSize,
  shareUrl,
  expiresAt,
  maxDownloads,
  downloadCount,
  hasPassword,
  title,
  description,
}: DownloadLinkCardProps) {
  const [copied, setCopied] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatExpiration = (date: Date): string => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return 'Expired';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return 'Expires soon';
  };

  const getFileIcon = (type: string): string => {
    switch (type) {
      case 'image': return '🖼️';
      case 'audio': return '🎵';
      case 'video': return '🎬';
      case 'document': return '📄';
      case 'code': return '💻';
      default: return '📦';
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const isExpired = expiresAt && new Date() > expiresAt;
  const isLimitReached = maxDownloads && downloadCount >= maxDownloads;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4 my-3 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl">{getFileIcon(fileType)}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
            {title || fileName}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatFileSize(fileSize)} • {fileType}
          </p>
          {description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex flex-wrap gap-2 mb-3">
        {hasPassword && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full">
            <Lock size={12} />
            Password protected
          </span>
        )}
        
        {expiresAt && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
            isExpired 
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
          }`}>
            <Clock size={12} />
            {isExpired ? 'Expired' : formatExpiration(expiresAt)}
          </span>
        )}
        
        {maxDownloads && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full ${
            isLimitReached
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          }`}>
            <Download size={12} />
            {downloadCount}/{maxDownloads} downloads
          </span>
        )}
        
        {(isExpired || isLimitReached) && (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded-full">
            <AlertCircle size={12} />
            Unavailable
          </span>
        )}
      </div>

      {/* Share URL */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
            {shareUrl}
          </code>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md transition-colors"
            disabled={copied}
          >
            {copied ? (
              <>
                <Check size={14} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        Link ID: {linkId}
        {!maxDownloads && !expiresAt && ' • No limits'}
        {!expiresAt && maxDownloads && ' • Never expires'}
      </div>
    </div>
  );
}

export default DownloadLinkCard;
