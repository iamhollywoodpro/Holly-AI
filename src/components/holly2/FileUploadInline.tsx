'use client';

import { X, FileText, Image as ImageIcon, Film, Music, File, Loader2 } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnail?: string;
  uploading?: boolean;
  progress?: number;
}

interface FileUploadInlineProps {
  files: UploadedFile[];
  onRemove: (id: string) => void;
}

export function FileUploadInline({ files, onRemove }: FileUploadInlineProps) {
  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('video/')) return Film;
    if (type.startsWith('audio/')) return Music;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {files.map((file) => {
        const Icon = getFileIcon(file.type);
        
        return (
          <div
            key={file.id}
            className="rounded-lg p-2 border flex items-center gap-2 max-w-xs group relative"
            style={{
              backgroundColor: cyberpunkTheme.colors.background.tertiary,
              borderColor: file.uploading 
                ? cyberpunkTheme.colors.primary.cyan
                : cyberpunkTheme.colors.border.primary,
            }}
          >
            {/* Thumbnail or Icon */}
            <div className="relative">
              {file.thumbnail ? (
                <img 
                  src={file.thumbnail} 
                  alt={file.name}
                  className="w-10 h-10 rounded object-cover"
                />
              ) : (
                <div 
                  className="w-10 h-10 rounded flex items-center justify-center"
                  style={{ backgroundColor: cyberpunkTheme.colors.background.elevated }}
                >
                  <Icon 
                    className="w-5 h-5" 
                    style={{ color: cyberpunkTheme.colors.primary.purple }}
                  />
                </div>
              )}
              
              {/* Upload Progress */}
              {file.uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                </div>
              )}
            </div>

            {/* File Info */}
            <div className="flex-1 min-w-0">
              <div 
                className="text-sm font-medium truncate"
                style={{ color: cyberpunkTheme.colors.text.primary }}
              >
                {file.name}
              </div>
              <div 
                className="text-xs"
                style={{ color: cyberpunkTheme.colors.text.tertiary }}
              >
                {file.uploading ? (
                  <span>Uploading... {file.progress || 0}%</span>
                ) : (
                  formatFileSize(file.size)
                )}
              </div>
            </div>

            {/* Remove Button */}
            <button
              onClick={() => onRemove(file.id)}
              className="p-1 rounded hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
              style={{ color: cyberpunkTheme.colors.accent.error }}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Progress Bar */}
            {file.uploading && file.progress !== undefined && (
              <div 
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-b overflow-hidden"
                style={{ backgroundColor: cyberpunkTheme.colors.background.elevated }}
              >
                <div 
                  className="h-full transition-all duration-300"
                  style={{ 
                    width: `${file.progress}%`,
                    background: cyberpunkTheme.colors.gradients.secondary,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
