'use client';

import { useState, useEffect } from 'react';
import { Cloud, Check, AlertCircle, Loader2, HardDrive, Upload } from 'lucide-react';

interface DriveStatus {
  connected: boolean;
  user?: {
    email: string;
    name?: string;
    picture?: string;
  };
  settings?: {
    autoUpload: boolean;
    syncEnabled: boolean;
  };
  quota?: {
    used: string;
    limit?: string;
  };
  lastSyncAt?: string;
}

export default function IntegrationsPage() {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDriveStatus();
  }, []);

  const fetchDriveStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/google-drive/status');
      const data = await res.json();
      
      if (data.success) {
        setDriveStatus(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch Drive status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      
      const res = await fetch('/api/google-drive/connect');
      const data = await res.json();
      
      if (data.success && data.authUrl) {
        // Redirect to Google OAuth
        window.location.href = data.authUrl;
      } else {
        setError('Failed to get authorization URL');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to Google Drive');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive?')) {
      return;
    }
    
    try {
      setDisconnecting(true);
      setError(null);
      
      const res = await fetch('/api/google-drive/disconnect', {
        method: 'POST',
      });
      
      const data = await res.json();
      
      if (data.success) {
        await fetchDriveStatus();
      } else {
        setError('Failed to disconnect Google Drive');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const formatBytes = (bytes: string): string => {
    const num = parseInt(bytes);
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(1)} MB`;
    return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Integrations
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect HOLLY to your favorite services
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 dark:text-red-100">Error</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Google Drive Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                <Cloud className="w-8 h-8 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Google Drive
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Automatically save generated files to your Google Drive
              </p>

              {/* Status */}
              {driveStatus?.connected ? (
                <div className="space-y-4">
                  {/* Connected Status */}
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <Check className="w-5 h-5" />
                    <span className="font-semibold">Connected</span>
                  </div>

                  {/* User Info */}
                  {driveStatus.user && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      {driveStatus.user.picture && (
                        <img
                          src={driveStatus.user.picture}
                          alt={driveStatus.user.name || 'User'}
                          className="w-10 h-10 rounded-full"
                        />
                      )}
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {driveStatus.user.name || 'Google User'}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {driveStatus.user.email}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Settings */}
                  {driveStatus.settings && (
                    <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <Upload className="w-4 h-4" />
                          Auto-Upload
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {driveStatus.settings.autoUpload ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                          <HardDrive className="w-4 h-4" />
                          Storage Used
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {driveStatus.quota ? formatBytes(driveStatus.quota.used) : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Last Sync */}
                  {driveStatus.lastSyncAt && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Last synced: {formatDate(driveStatus.lastSyncAt)}
                    </div>
                  )}

                  {/* Disconnect Button */}
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {disconnecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                        Disconnecting...
                      </>
                    ) : (
                      'Disconnect Drive'
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Not Connected */}
                  <div className="text-gray-600 dark:text-gray-400">
                    Not connected
                  </div>

                  {/* Features List */}
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Automatically save all generated files</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Access files from any device</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Organize files in folders</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Secure and private - only HOLLY files</span>
                    </li>
                  </ul>

                  {/* Connect Button */}
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {connecting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Cloud className="w-5 h-5 inline mr-2" />
                        Connect Google Drive
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* More Integrations Coming Soon */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 opacity-50">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            More Integrations
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            GitHub, Notion, Slack integrations coming soon...
          </p>
        </div>
      </div>
    </div>
  );
}
