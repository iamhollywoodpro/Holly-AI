'use client';

import { useEffect, useState } from 'react';
import { Cloud, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export function DriveIndicator() {
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkDriveStatus();
  }, []);

  const checkDriveStatus = async () => {
    try {
      const response = await fetch('/api/google-drive/status');
      const data = await response.json();
      setIsConnected(data.connected || false);
    } catch (error) {
      console.error('Failed to check Drive status:', error);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!isConnected) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative group"
    >
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg">
        <Cloud className="w-4 h-4 text-green-400" />
        <Check className="w-3 h-3 text-green-400" />
        <span className="text-xs font-medium text-green-300">Drive</span>
      </div>

      {/* Tooltip */}
      <div className="absolute top-full right-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-gray-700 whitespace-nowrap">
          Google Drive Connected ✅
          <div className="text-gray-400 mt-1">
            Files auto-save to Drive
          </div>
        </div>
      </div>
    </motion.div>
  );
}
