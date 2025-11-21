'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DriveStatus {
  connected: boolean;
  email?: string;
}

export function DriveIndicator() {
  const [status, setStatus] = useState<DriveStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const checkDriveStatus = async () => {
      try {
        const response = await fetch('/api/google-drive/status');
        const data = await response.json();
        
        if (mounted) {
          setStatus(data);
          setLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setStatus({ connected: false });
          setLoading(false);
        }
      }
    };

    checkDriveStatus();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Memoize the render to prevent unnecessary re-renders
  const indicator = useMemo(() => {
    if (loading) {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-400">Checking Drive...</span>
        </div>
      );
    }

    if (!status?.connected) {
      return null;
    }

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 shadow-lg shadow-green-500/10"
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm">☁️</span>
            <span className="text-sm text-green-400">✓</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-green-300">Drive Connected</span>
            {status.email && (
              <span className="text-[10px] text-green-400/60">{status.email}</span>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }, [loading, status]);

  return indicator;
}
