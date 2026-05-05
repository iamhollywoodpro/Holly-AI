'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SuccessToastProps {
  message: string;
  show: boolean;
  onClose: () => void;
  duration?: number;
}

export function SuccessToast({ message, show, onClose, duration = 5000 }: SuccessToastProps) {
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-4 right-4 z-[9999] max-w-md"
        >
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-2xl border border-green-400/50 p-4 pr-12">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-white">{message}</p>
              </div>
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1 rounded-lg hover:bg-white/20 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Progress bar */}
            {duration > 0 && (
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: duration / 1000, ease: 'linear' }}
                className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-xl"
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
