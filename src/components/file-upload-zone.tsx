// HOLLY Phase 3: Universal File Upload Zone
// Supports: Audio, Video, Images, Code, Documents, Data

'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, X, File, Music, Video, Image as ImageIcon, Code, FileText, Database } from 'lucide-react';

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  type: 'audio' | 'video' | 'image' | 'code' | 'document' | 'data' | 'other';
  metadata?: {
    duration?: number;
    dimensions?: { width: number; height: number };
    size: number;
  };
}

interface FileUploadZoneProps {
  onFilesSelected: (files: UploadedFile[]) => void;
  onFileRemove: (fileId: string) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string;
}

const FILE_TYPE_CONFIG = {
  audio: {
    extensions: ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.wma'],
    icon: Music,
    color: 'text-purple-500',
    label: 'Audio',
  },
  video: {
    extensions: ['.mp4', '.mov', '.avi', '.webm', '.mkv', '.wmv'],
    icon: Video,
    color: 'text-red-500',
    label: 'Video',
  },
  image: {
    extensions: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'],
    icon: ImageIcon,
    color: 'text-green-500',
    label: 'Image',
  },
  code: {
    extensions: ['.js', '.ts', '.tsx', '.jsx', '.py', '.css', '.html', '.json', '.xml', '.yaml', '.sql', '.md'],
    icon: Code,
    color: 'text-blue-500',
    label: 'Code',
  },
  document: {
    extensions: ['.pdf', '.txt', '.doc', '.docx', '.rtf'],
    icon: FileText,
    color: 'text-amber-500',
    label: 'Document',
  },
  data: {
    extensions: ['.csv', '.xlsx', '.xls'],
    icon: Database,
    color: 'text-cyan-500',
    label: 'Data',
  },
};

export function FileUploadZone({
  onFilesSelected,
  onFileRemove,
  maxFiles = 10,
  maxSizeMB = 100,
}: FileUploadZoneProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileType = (file: File): UploadedFile['type'] => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    
    for (const [type, config] of Object.entries(FILE_TYPE_CONFIG)) {
      if (config.extensions.includes(ext)) {
        return type as UploadedFile['type'];
      }
    }
    return 'other';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileDuration = async (file: File): Promise<number | undefined> => {
    if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
      return new Promise((resolve) => {
        const media = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video');
        media.preload = 'metadata';
        media.onloadedmetadata = () => {
          resolve(media.duration);
        };
        media.onerror = () => resolve(undefined);
        media.src = URL.createObjectURL(file);
      });
    }
    return undefined;
  };

  const getImageDimensions = async (file: File): Promise<{ width: number; height: number } | undefined> => {
    if (file.type.startsWith('image/')) {
      return new Promise((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = () => resolve(undefined);
        img.src = URL.createObjectURL(file);
      });
    }
    return undefined;
  };

  const processFiles = async (files: File[]) => {
    if (uploadedFiles.length + files.length > maxFiles) {
      alert(`Maximum ${maxFiles} files allowed`);
      return;
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const validFiles = files.filter(file => {
      if (file.size > maxSizeBytes) {
        alert(`${file.name} is too large. Max size: ${maxSizeMB}MB`);
        return false;
      }
      return true;
    });

    const processedFiles: UploadedFile[] = await Promise.all(
      validFiles.map(async (file) => {
        const fileType = getFileType(file);
        const duration = await getFileDuration(file);
        const dimensions = await getImageDimensions(file);

        let preview: string | undefined;
        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file);
        }

        return {
          id: `${Date.now()}-${Math.random()}`,
          file,
          preview,
          status: 'pending' as const,
          progress: 0,
          type: fileType,
          metadata: {
            duration,
            dimensions,
            size: file.size,
          },
        };
      })
    );

    setUploadedFiles(prev => [...prev, ...processedFiles]);
    onFilesSelected(processedFiles);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  }, [uploadedFiles.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemove = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    onFileRemove(fileId);
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-600 bg-gray-50 dark:bg-gray-800/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept={Object.values(FILE_TYPE_CONFIG).flatMap(c => c.extensions).join(',')}
        />

        <Upload className={`w-12 h-12 mx-auto mb-3 ${isDragging ? 'text-blue-500' : 'text-gray-400'}`} />
        
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {isDragging ? 'Drop your files here' : 'Upload Files'}
        </h3>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Drag & drop or click to browse
        </p>

        <div className="flex flex-wrap gap-2 justify-center text-xs text-gray-500 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <Music className="w-3 h-3" /> Audio
          </span>
          <span className="flex items-center gap-1">
            <Video className="w-3 h-3" /> Video
          </span>
          <span className="flex items-center gap-1">
            <ImageIcon className="w-3 h-3" /> Images
          </span>
          <span className="flex items-center gap-1">
            <Code className="w-3 h-3" /> Code
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" /> Docs
          </span>
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3" /> Data
          </span>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Max {maxFiles} files • {maxSizeMB}MB each
        </p>
      </div>

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((uploadedFile) => {
            const TypeIcon = FILE_TYPE_CONFIG[uploadedFile.type]?.icon || File;
            const typeColor = FILE_TYPE_CONFIG[uploadedFile.type]?.color || 'text-gray-500';

            return (
              <div
                key={uploadedFile.id}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                {/* Preview or Icon */}
                {uploadedFile.preview ? (
                  <img
                    src={uploadedFile.preview}
                    alt={uploadedFile.file.name}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded">
                    <TypeIcon className={`w-6 h-6 ${typeColor}`} />
                  </div>
                )}

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {uploadedFile.file.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{formatFileSize(uploadedFile.metadata?.size || 0)}</span>
                    {uploadedFile.metadata?.duration && (
                      <>
                        <span>•</span>
                        <span>{formatDuration(uploadedFile.metadata.duration)}</span>
                      </>
                    )}
                    {uploadedFile.metadata?.dimensions && (
                      <>
                        <span>•</span>
                        <span>
                          {uploadedFile.metadata.dimensions.width}x{uploadedFile.metadata.dimensions.height}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {uploadedFile.status === 'uploading' && (
                    <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadedFile.progress}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  {uploadedFile.status === 'pending' && (
                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                      Ready
                    </span>
                  )}
                  {uploadedFile.status === 'uploading' && (
                    <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                      Uploading...
                    </span>
                  )}
                  {uploadedFile.status === 'processing' && (
                    <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
                      Processing...
                    </span>
                  )}
                  {uploadedFile.status === 'complete' && (
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded">
                      Ready
                    </span>
                  )}

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(uploadedFile.id)}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                    aria-label="Remove file"
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
