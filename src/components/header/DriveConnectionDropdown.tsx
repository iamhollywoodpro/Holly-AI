'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ArrowPathIcon,
  FolderOpenIcon,
  LinkIcon
} from '@heroicons/react/24/outline';

interface DriveStatus {
  connected: boolean;
  email?: string;
  storageUsed?: string;
  storageTotal?: string;
  lastSync?: string;
}

export function DriveConnectionDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<DriveStatus>({ connected: false });
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Drive status
  useEffect(() => {
    fetchDriveStatus();
  }, []);

  const fetchDriveStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/google-drive/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch Drive status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      // Direct redirect to OAuth endpoint (like GitHub does)
      window.location.href = '/api/google-drive/connect';
    } catch (error) {
      console.error('Failed to initiate Drive connection:', error);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Drive?')) return;

    try {
      const response = await fetch('/api/google-drive/disconnect', { method: 'POST' });
      if (response.ok) {
        setStatus({ connected: false });
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Failed to disconnect Drive:', error);
    }
  };

  const handleOpenDrive = () => {
    window.open('https://drive.google.com', '_blank');
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Drive Status Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded-lg transition-all ${
          status.connected
            ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
            : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
        }`}
        title={status.connected ? 'Google Drive Connected' : 'Google Drive Disconnected'}
      >
        {loading ? (
          <ArrowPathIcon className="h-5 w-5 animate-spin" />
        ) : (
          <CloudIcon className="h-5 w-5" />
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden z-50"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/50">
              <div className="flex items-center gap-2">
                <CloudIcon className="h-5 w-5 text-gray-400" />
                <h3 className="text-sm font-semibold text-white">Google Drive</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {status.connected ? (
                <div className="space-y-4">
                  {/* Connection Status */}
                  <div className="flex items-center gap-2 text-green-400">
                    <CheckCircleIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Connected</span>
                  </div>

                  {/* Account Info */}
                  {status.email && (
                    <div className="text-sm">
                      <p className="text-gray-400">Account</p>
                      <p className="text-white mt-1">{status.email}</p>
                    </div>
                  )}

                  {/* Storage Info */}
                  {status.storageUsed && status.storageTotal && (
                    <div className="text-sm">
                      <p className="text-gray-400">Storage</p>
                      <p className="text-white mt-1">
                        {status.storageUsed} of {status.storageTotal} used
                      </p>
                    </div>
                  )}

                  {/* Last Sync */}
                  {status.lastSync && (
                    <div className="text-sm">
                      <p className="text-gray-400">Last Sync</p>
                      <p className="text-white mt-1">{status.lastSync}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="space-y-2 pt-2 border-t border-gray-700">
                    <button
                      onClick={handleOpenDrive}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <FolderOpenIcon className="h-4 w-4" />
                      Open Google Drive
                    </button>

                    <button
                      onClick={fetchDriveStatus}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <ArrowPathIcon className="h-4 w-4" />
                      Refresh Status
                    </button>

                    <button
                      onClick={handleDisconnect}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <XCircleIcon className="h-4 w-4" />
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Disconnected Status */}
                  <div className="flex items-center gap-2 text-gray-400">
                    <XCircleIcon className="h-5 w-5" />
                    <span className="text-sm font-medium">Not Connected</span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-400">
                    Connect your Google Drive to automatically save conversations and files.
                  </p>

                  {/* Connect Button */}
                  <button
                    onClick={handleConnect}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Connect Google Drive
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
