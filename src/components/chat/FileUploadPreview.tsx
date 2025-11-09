'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, File, Image, FileText, Code, Music, Video } from 'lucide-react';

interface FileUploadPreviewProps {
  files: File[];
  onRemove: (index: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function FileUploadPreview({
  files,
  onRemove,
  onConfirm,
  onCancel
}: FileUploadPreviewProps) {
  if (files.length === 0) return null;

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type.startsWith('image/')) return <Image className="w-5 h-5 text-blue-400" />;
    if (type.startsWith('video/')) return <Video className="w-5 h-5 text-purple-400" />;
    if (type.startsWith('audio/')) return <Music className="w-5 h-5 text-pink-400" />;
    if (type.startsWith('text/') || type.includes('document')) return <FileText className="w-5 h-5 text-green-400" />;
    if (type.includes('javascript') || type.includes('typescript') || type.includes('python')) return <Code className="w-5 h-5 text-cyan-400" />;
    return <File className="w-5 h-5 text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const maxSize = 50 * 1024 * 1024; // 50MB
  const exceeds Limit = totalSize > maxSize;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-40"
      >
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-2xl blur-lg" />

        {/* Main container */}
        <div className="relative bg-gray-800/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-700/50 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">Ready to Upload</h3>
              <p className="text-xs text-gray-400">
                {files.length} file{files.length !== 1 ? 's' : ''} \u2022 {formatFileSize(totalSize)}
                {exceedsLimit && <span className="text-red-400 ml-2">Exceeds 50MB limit!</span>}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-1 hover:bg-gray-700/50 rounded-lg transition-colors"
              aria-label="Cancel upload"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* File list */}
          <div className="max-h-60 overflow-y-auto p-4 space-y-2">
            {files.map((file, index) => (
              <motion.div
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors group"
              >
                {/* File icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(file)}
                </div>

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => onRemove(index)}
                  className="flex-shrink-0 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-lg transition-all"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </motion.div>
            ))}
          </div>

          {/* Actions */}
          <div className="px-4 py-3 border-t border-gray-700/50 flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <motion.button
              onClick={onConfirm}
              disabled={exceedsLimit}
              whileHover={{ scale: exceedsLimit ? 1 : 1.05 }}
              whileTap={{ scale: exceedsLimit ? 1 : 0.95 }}
              className={`px-6 py-2 rounded-xl font-medium text-sm transition-all ${
                exceedsLimit
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/50'
              }`}
            >
              Upload {files.length} file{files.length !== 1 ? 's' : ''}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
