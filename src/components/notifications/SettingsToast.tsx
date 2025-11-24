'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface ToastEvent {
  message: string;
  type: 'success' | 'error' | 'info';
}

export function SettingsToast() {
  const [toast, setToast] = useState<ToastEvent | null>(null);

  useEffect(() => {
    const handleToast = (event: Event) => {
      const customEvent = event as CustomEvent<ToastEvent>;
      setToast(customEvent.detail);
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        setToast(null);
      }, 3000);
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border max-w-sm"
          style={{
            backgroundColor: toast.type === 'success' ? '#065f46' : toast.type === 'error' ? '#7f1d1d' : '#1e3a8a',
            borderColor: toast.type === 'success' ? '#10b981' : toast.type === 'error' ? '#ef4444' : '#3b82f6',
          }}
        >
          {toast.type === 'success' && <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />}
          {toast.type === 'error' && <XCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />}
          {toast.type === 'info' && <InformationCircleIcon className="w-5 h-5 text-blue-400 flex-shrink-0" />}
          <span className="text-sm text-white">{toast.message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
