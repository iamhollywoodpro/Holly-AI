'use client';

import { useState, useEffect } from 'react';
import { X, Cloud, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function GoogleDriveBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkDriveStatus();
  }, []);

  const checkDriveStatus = async () => {
    try {
      // Check if banner was dismissed
      const dismissed = localStorage.getItem('holly_drive_banner_dismissed');
      if (dismissed === 'true') {
        setIsChecking(false);
        return;
      }

      // Check if Google Drive is connected
      const response = await fetch('/api/google-drive/status');
      const data = await response.json();
      
      setIsDriveConnected(data.connected || false);
      
      // Show banner only if not connected
      if (!data.connected) {
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Failed to check Drive status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('holly_drive_banner_dismissed', 'true');
  };

  // Don't render anything while checking or if should not be visible
  if (isChecking || !isVisible || isDriveConnected) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg animate-in slide-in-from-top duration-300">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Icon + Message */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Cloud className="w-5 h-5" />
            </div>
            
            <div className="flex-1">
              <p className="font-semibold text-sm sm:text-base">
                💡 Connect Google Drive to auto-save your files
              </p>
              <p className="text-xs sm:text-sm text-blue-100 hidden sm:block">
                Never lose your generated code, images, or documents
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/settings/integrations"
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors text-sm flex items-center gap-1 whitespace-nowrap"
            >
              Connect Now
              <ArrowRight className="w-4 h-4" />
            </Link>
            
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
