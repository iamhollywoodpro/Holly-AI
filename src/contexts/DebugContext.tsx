'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface DebugLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'api' | 'tool' | 'token' | 'timing' | 'system';
  message: string;
  details?: any;
  duration?: number;
}

interface DebugContextType {
  isEnabled: boolean;
  logs: DebugLog[];
  toggleDebug: () => void;
  addLog: (log: Omit<DebugLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  exportLogs: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);

  // Load debug preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('holly_debug_mode');
    if (saved === 'true') {
      setIsEnabled(true);
    }
  }, []);

  // Save debug preference to localStorage
  const toggleDebug = useCallback(() => {
    setIsEnabled(prev => {
      const newValue = !prev;
      localStorage.setItem('holly_debug_mode', String(newValue));
      
      // Add log about toggle
      if (newValue) {
        addLog({
          level: 'success',
          category: 'system',
          message: 'Debug mode enabled',
        });
      }
      
      return newValue;
    });
  }, []);

  const addLog = useCallback((log: Omit<DebugLog, 'id' | 'timestamp'>) => {
    const newLog: DebugLog = {
      ...log,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };
    
    setLogs(prev => [...prev, newLog]);
    
    // Keep only last 100 logs
    setLogs(prev => prev.slice(-100));
    
    // Console log for development
    const emoji = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      success: '✅',
    }[log.level];
    
    console.log(`${emoji} [${log.category}] ${log.message}`, log.details || '');
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    addLog({
      level: 'info',
      category: 'system',
      message: 'Logs cleared',
    });
  }, [addLog]);

  const exportLogs = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      debugMode: isEnabled,
      totalLogs: logs.length,
      logs: logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
      })),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `holly-debug-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    addLog({
      level: 'success',
      category: 'system',
      message: `Exported ${logs.length} logs`,
    });
  }, [logs, isEnabled, addLog]);

  return (
    <DebugContext.Provider
      value={{
        isEnabled,
        logs,
        toggleDebug,
        addLog,
        clearLogs,
        exportLogs,
      }}
    >
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (!context) {
    throw new Error('useDebug must be used within DebugProvider');
  }
  return context;
}
