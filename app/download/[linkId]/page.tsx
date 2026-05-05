'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { Download, Lock, AlertCircle, Loader2 } from 'lucide-react';

interface DownloadPageProps {
  params: Promise<{ linkId: string }>;
}

export default function DownloadPage({ params }: DownloadPageProps) {
  const { linkId } = use(params);
  const [loading, setLoading] = useState(true);
  const [linkInfo, setLinkInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Fetch link info on mount
  useEffect(() => {
    fetchLinkInfo();
  }, [linkId]);

  const fetchLinkInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/download-link/${linkId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Link not found');
        return;
      }

      setLinkInfo(data.link);
      setRequiresPassword(data.link.hasPassword);
    } catch (err: any) {
      setError('Failed to load download link');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setDownloading(true);
      setError(null);

      const res = await fetch(`/api/download-link/${linkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Download failed');
        if (data.requiresPassword) {
          setRequiresPassword(true);
        }
        return;
      }

      // Download the file
      const downloadInfo = data.download;
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = downloadInfo.storagePath;
      link.download = downloadInfo.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err: any) {
      setError('Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading download...</p>
        </div>
      </div>
    );
  }

  if (error && !linkInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Download Unavailable
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  const isExpired = linkInfo?.expiresAt && new Date() > new Date(linkInfo.expiresAt);
  const isLimitReached = linkInfo?.maxDownloads && linkInfo.downloadCount >= linkInfo.maxDownloads;
  const isUnavailable = isExpired || isLimitReached || linkInfo?.isRevoked;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">{getFileIcon(linkInfo.fileType)}</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {linkInfo.title || linkInfo.fileName}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {formatFileSize(linkInfo.fileSize)} • {linkInfo.fileType}
          </p>
          {linkInfo.description && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
              {linkInfo.description}
            </p>
          )}
        </div>

        {/* Status Messages */}
        {isUnavailable ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">
                  Download Unavailable
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {isExpired && 'This link has expired.'}
                  {isLimitReached && 'Download limit has been reached.'}
                  {linkInfo?.isRevoked && 'This link has been revoked.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleDownload} className="space-y-4">
            {/* Password Input */}
            {requiresPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Lock className="w-4 h-4 inline mr-1" />
                  Password Required
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  required={requiresPassword}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Download Button */}
            <button
              type="submit"
              disabled={downloading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Download File
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Info */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            {linkInfo?.expiresAt && !isExpired && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Expires:</span>
                <span>{new Date(linkInfo.expiresAt).toLocaleDateString()}</span>
              </div>
            )}
            {linkInfo?.maxDownloads && !isLimitReached && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Downloads:</span>
                <span>{linkInfo.downloadCount}/{linkInfo.maxDownloads}</span>
              </div>
            )}
          </div>
        </div>

        {/* Branding */}
        <div className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          Powered by HOLLY AI
        </div>
      </div>
    </div>
  );
}
