'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bug, 
  ChevronDown, 
  ChevronUp, 
  Download, 
  Trash2, 
  X,
  Info,
  AlertTriangle,
  XCircle,
  CheckCircle,
  Activity,
  Zap,
  Clock,
  Code
} from 'lucide-react';
import { useDebug, DebugLog } from '@/contexts/DebugContext';

export default function DebugPanel() {
  const { isEnabled, logs, clearLogs, exportLogs, toggleDebug } = useDebug();
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedLog, setSelectedLog] = useState<DebugLog | null>(null);
  const [filter, setFilter] = useState<'all' | 'api' | 'tool' | 'token' | 'timing' | 'system'>('all');

  if (!isEnabled) return null;

  const filteredLogs = filter === 'all' 
    ? logs 
    : logs.filter(log => log.category === filter);

  const getIcon = (log: DebugLog) => {
    if (log.level === 'error') return <XCircle className="w-4 h-4 text-red-400" />;
    if (log.level === 'warn') return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    if (log.level === 'success') return <CheckCircle className="w-4 h-4 text-green-400" />;
    
    switch (log.category) {
      case 'api': return <Activity className="w-4 h-4 text-blue-400" />;
      case 'tool': return <Zap className="w-4 h-4 text-purple-400" />;
      case 'token': return <Code className="w-4 h-4 text-orange-400" />;
      case 'timing': return <Clock className="w-4 h-4 text-cyan-400" />;
      default: return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const getLevelColor = (level: DebugLog['level']) => {
    switch (level) {
      case 'error': return 'text-red-400 bg-red-950/50';
      case 'warn': return 'text-yellow-400 bg-yellow-950/50';
      case 'success': return 'text-green-400 bg-green-950/50';
      default: return 'text-gray-400 bg-gray-900/50';
    }
  };

  return (
    <motion.div
      initial={{ y: 300 }}
      animate={{ y: 0 }}
      exit={{ y: 300 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-gray-800 shadow-2xl"
      style={{ maxHeight: isExpanded ? '400px' : '48px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800/50">
        <div className="flex items-center gap-3">
          <Bug className="w-5 h-5 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">Debug Console</h3>
          <span className="text-xs text-gray-400">
            {filteredLogs.length} {filteredLogs.length === 1 ? 'log' : 'logs'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter Buttons */}
          <div className="flex items-center gap-1">
            {(['all', 'api', 'tool', 'token', 'timing'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  filter === f
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <button
            onClick={exportLogs}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Export logs"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={clearLogs}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title={isExpanded ? 'Minimize' : 'Expand'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleDebug}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Close debug panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Logs Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="overflow-y-auto p-2 space-y-1"
            style={{ maxHeight: '352px' }}
          >
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                No debug logs yet. Start chatting to see activity.
              </div>
            ) : (
              filteredLogs.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${getLevelColor(log.level)} hover:bg-opacity-80`}
                  onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                >
                  <div className="flex items-start gap-2">
                    {getIcon(log)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-gray-400">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 bg-black/30 rounded uppercase font-semibold">
                          {log.category}
                        </span>
                        {log.duration && (
                          <span className="text-xs text-gray-400">
                            {log.duration.toFixed(2)}ms
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm font-medium">{log.message}</p>
                      
                      {selectedLog?.id === log.id && log.details && (
                        <pre className="mt-2 p-2 bg-black/50 rounded text-xs overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
