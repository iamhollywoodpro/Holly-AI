'use client';

/**
 * HOLLY Perception Input — Phase 9A
 *
 * Enhanced chat input that lets users attach:
 *   🖼️  Images        → HOLLY sees and describes them
 *   📄  PDFs          → HOLLY reads and understands them
 *   📝  Word docs     → HOLLY extracts and discusses content
 *   💻  Code files    → HOLLY reviews and explains code
 *   🎵  Audio files   → HOLLY's audio brain analyzes mix/master
 *   📊  Spreadsheets  → HOLLY reads the data
 *   🔗  URLs          → HOLLY scrapes and understands the page
 *
 * Usage:
 *   <HollyPerceptionInput
 *     onPerceptionReady={(ctx, audioAnalysis) => { ... }}
 *     onFileSelected={(file) => { ... }}
 *   />
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Paperclip, X, Image as ImageIcon, FileText, Code, Music,
  File, Eye, Loader2, CheckCircle, AlertCircle,
  Volume2, BarChart3,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PerceptionResult {
  fileType:    string;
  fileName:    string;
  summary:     string;
  rawContent?: string;
  contextBlock: string;
  metadata?:   Record<string, unknown>;
}

interface AudioBrainResult {
  fileName:     string;
  analysisMode: string;
  summary:      string;
  actionItems:  string[];
  hollyOpinion: string;
  contextBlock: string;
}

type PerceptionStatus = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

interface AttachedFile {
  file:         File;
  status:       PerceptionStatus;
  perception?:  PerceptionResult;
  audioAnalysis?: AudioBrainResult;
  imageDataUrl?: string;
  error?:       string;
}

interface HollyPerceptionInputProps {
  onPerceptionReady: (
    perceptionContexts: PerceptionResult[],
    audioAnalysis:      AudioBrainResult | null,
    imageDataUrls:      string[],
  ) => void;
  onFileStatusChange?: (hasFiles: boolean) => void;
  disabled?:          boolean;
}

// ─── File type helpers ────────────────────────────────────────────────────────

function getFileIcon(file: File) {
  const t = file.type;
  if (t.startsWith('image/'))  return <ImageIcon className="w-4 h-4 text-blue-400" />;
  if (t.startsWith('audio/') || t.startsWith('video/')) return <Music className="w-4 h-4 text-purple-400" />;
  if (t === 'application/pdf') return <FileText className="w-4 h-4 text-red-400" />;
  if (t.includes('word') || t.includes('document')) return <FileText className="w-4 h-4 text-blue-500" />;
  if (t.startsWith('text/') || file.name.match(/\.(ts|tsx|js|jsx|py|go|rs|java|css|html|json|yaml)$/i))
    return <Code className="w-4 h-4 text-green-400" />;
  if (t.includes('spreadsheet') || file.name.match(/\.(xlsx?|csv)$/i))
    return <BarChart3 className="w-4 h-4 text-emerald-400" />;
  return <File className="w-4 h-4 text-gray-400" />;
}

function getStatusIcon(status: PerceptionStatus) {
  switch (status) {
    case 'uploading':
    case 'processing': return <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />;
    case 'done':       return <CheckCircle className="w-4 h-4 text-green-400" />;
    case 'error':      return <AlertCircle className="w-4 h-4 text-red-400" />;
    default:           return <Eye className="w-4 h-4 text-gray-400" />;
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024*1024)  return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/1024/1024).toFixed(1)} MB`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HollyPerceptionInput({
  onPerceptionReady,
  onFileStatusChange,
  disabled = false,
}: HollyPerceptionInputProps) {
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [isDragging,    setIsDragging]    = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Process file through perception API ──────────────────────────────────
  const processFile = useCallback(async (file: File, idx: number) => {
    // Update status
    const update = (patch: Partial<AttachedFile>) =>
      setAttachedFiles(prev =>
        prev.map((f, i) => i === idx ? { ...f, ...patch } : f)
      );

    update({ status: 'uploading' });

    try {
      // Send to /api/perception
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/perception', {
        method: 'POST',
        body:   formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        update({ status: 'error', error: err.error ?? 'Perception failed' });
        return;
      }

      update({ status: 'processing' });
      const data = await res.json();

      const perception: PerceptionResult = data.perception;
      const imageDataUrl: string | undefined = data.imageDataUrl;

      // For audio files, also run audio brain analysis
      let audioAnalysis: AudioBrainResult | undefined;
      if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
        try {
          const audioRes = await fetch('/api/audio/holly-analyze', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName:     file.name,
              userQuestion: 'Give me a complete professional analysis of this audio',
              analysisMode: 'full',
              transcript:   perception.rawContent,
            }),
          });
          if (audioRes.ok) {
            const audioData = await audioRes.json();
            audioAnalysis = audioData.analysis;
          }
        } catch { /* audio brain is optional */ }
      }

      update({ status: 'done', perception, imageDataUrl, audioAnalysis });

      // Notify parent with all ready perceptions
      setAttachedFiles(prev => {
        const updated = prev.map((f, i) =>
          i === idx ? { ...f, status: 'done' as PerceptionStatus, perception, imageDataUrl, audioAnalysis } : f
        );

        const readyPerceptions = updated
          .filter(f => f.perception)
          .map(f => f.perception!);

        const allImages = updated
          .filter(f => f.imageDataUrl)
          .map(f => f.imageDataUrl!);

        const audioResult = updated.find(f => f.audioAnalysis)?.audioAnalysis ?? null;

        onPerceptionReady(readyPerceptions, audioResult, allImages);
        onFileStatusChange?.(updated.length > 0);
        return updated;
      });

    } catch (err: unknown) {
      update({ status: 'error', error: (err as Error).message });
    }
  }, [onPerceptionReady, onFileStatusChange]);

  // ── Handle file selection ─────────────────────────────────────────────────
  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const MAX_SIZE  = 50 * 1024 * 1024;

    const valid = fileArray.filter(f => {
      if (f.size > MAX_SIZE) {
        alert(`${f.name} is too large (max 50 MB)`);
        return false;
      }
      return true;
    });

    if (valid.length === 0) return;

    setAttachedFiles(prev => {
      const startIdx = prev.length;
      const newFiles: AttachedFile[] = valid.map(file => ({
        file, status: 'idle' as PerceptionStatus,
      }));

      // Start processing each file
      valid.forEach((_, i) => {
        setTimeout(() => processFile(valid[i], startIdx + i), 50 * i);
      });

      const updated = [...prev, ...newFiles];
      onFileStatusChange?.(updated.length > 0);
      return updated;
    });
  }, [processFile, onFileStatusChange]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const removeFile = (idx: number) => {
    setAttachedFiles(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      const readyPerceptions = updated.filter(f => f.perception).map(f => f.perception!);
      const allImages        = updated.filter(f => f.imageDataUrl).map(f => f.imageDataUrl!);
      const audioResult      = updated.find(f => f.audioAnalysis)?.audioAnalysis ?? null;
      onPerceptionReady(readyPerceptions, audioResult, allImages);
      onFileStatusChange?.(updated.length > 0);
      return updated;
    });
  };

  if (attachedFiles.length === 0) {
    return (
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className={`p-2 rounded-lg transition-colors ${
            isDragging
              ? 'bg-purple-500/20 text-purple-300'
              : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
          } disabled:opacity-40`}
          title="Attach file — HOLLY can see images, read PDFs, analyze audio, review code"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.ts,.tsx,.js,.jsx,.py,.go,.rs,.java,.css,.html,.json,.yaml,.yml,.csv,.xlsx,.xls,.md"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>
    );
  }

  return (
    <div className="w-full">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-2 px-3 pt-2 pb-1 bg-white/5 border border-white/10 rounded-xl"
        >
          <div className="flex items-center gap-1 mb-2 flex-wrap">
            {attachedFiles.map((af, idx) => (
              <motion.div
                key={idx}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1,   opacity: 1 }}
                exit={{    scale: 0.8, opacity: 0 }}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                  af.status === 'done'       ? 'bg-green-500/10 border border-green-500/20 text-green-300' :
                  af.status === 'error'      ? 'bg-red-500/10 border border-red-500/20 text-red-300' :
                  af.status === 'processing' ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300' :
                                               'bg-white/5 border border-white/10 text-gray-400'
                }`}
              >
                {getFileIcon(af.file)}
                <span className="max-w-[120px] truncate">{af.file.name}</span>
                <span className="text-[10px] opacity-60">{formatBytes(af.file.size)}</span>
                {getStatusIcon(af.status)}
                {af.audioAnalysis && <Volume2 className="w-3 h-3 text-purple-400" aria-label="Audio analyzed" />}
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="ml-0.5 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}

            {/* Add more button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-dashed border-white/10 transition-colors"
            >
              <Paperclip className="w-3 h-3" />
              <span>Add more</span>
            </button>
          </div>

          {/* Status summaries */}
          {attachedFiles.some(f => f.status === 'done' && f.perception) && (
            <div className="text-[11px] text-gray-400 space-y-0.5">
              {attachedFiles
                .filter(f => f.perception)
                .map((f, i) => (
                  <div key={i} className="flex items-start gap-1">
                    <Eye className="w-3 h-3 mt-0.5 shrink-0 text-purple-400" />
                    <span className="line-clamp-1">
                      <span className="font-medium text-gray-300">{f.file.name}:</span>{' '}
                      {f.perception!.summary}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {attachedFiles.some(f => f.error) && (
            <div className="text-[11px] text-red-400 mt-1">
              {attachedFiles.filter(f => f.error).map((f, i) => (
                <div key={i}>{f.file.name}: {f.error}</div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.ts,.tsx,.js,.jsx,.py,.go,.rs,.java,.css,.html,.json,.yaml,.yml,.csv,.xlsx,.xls,.md"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  );
}

export default HollyPerceptionInput;
