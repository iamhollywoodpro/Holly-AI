/**
 * HOLLY Perception Engine — Phase 9A
 *
 * Unified multimodal perception layer. HOLLY can now SEE, READ, and UNDERSTAND
 * any file type a user drops into the chat:
 *
 *   Images     → OpenRouter Qwen3 VL 30B (free vision model)
 *   PDFs       → pdf-parse text extraction → LLM analysis
 *   Word docs  → mammoth text extraction → LLM analysis
 *   Code files → syntax-aware direct injection
 *   Audio      → Whisper transcription + feature analysis
 *   Plain text → direct injection
 *   URLs       → web scrape → LLM analysis
 *
 * Every perception result is:
 *   1. Returned inline to the chat stream
 *   2. Stored as a PerceptionMemory so HOLLY can reference it later
 *   3. Injected as context into the next LLM call
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type PerceptionType =
  | 'image'
  | 'pdf'
  | 'word'
  | 'code'
  | 'audio'
  | 'video'
  | 'text'
  | 'url'
  | 'spreadsheet'
  | 'unknown';

export interface PerceivedFile {
  type:        PerceptionType;
  name:        string;
  sizeBytes:   number;
  mimeType:    string;
  // Extracted content
  textContent?: string;       // for PDFs, docs, code, text
  imageUrl?:    string;       // for images (base64 data URL or blob URL)
  audioUrl?:    string;       // for audio files
}

export interface PerceptionResult {
  fileType:    PerceptionType;
  fileName:    string;
  summary:     string;         // HOLLY's natural language understanding
  rawContent?: string;         // extracted text if applicable
  metadata?:   Record<string, unknown>;
  contextBlock: string;        // ready to inject into system prompt
}

// ─── MIME → PerceptionType mapper ─────────────────────────────────────────────

export function detectPerceptionType(mimeType: string, fileName: string): PerceptionType {
  if (mimeType.startsWith('image/'))                       return 'image';
  if (mimeType === 'application/pdf')                      return 'pdf';
  if (mimeType.includes('wordprocessingml') ||
      mimeType.includes('msword'))                         return 'word';
  if (mimeType.startsWith('video/') ||
      fileName.match(/\.(mp4|mkv|avi|mov|webm|flv|wmv|m4v)$/i))
                                                           return 'video';
  if (mimeType.startsWith('audio/') ||
      fileName.match(/\.(mp3|wav|ogg|m4a|aac|flac|opus|wma)$/i))
                                                           return 'audio';
  if (mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      fileName.match(/\.(xlsx?|csv)$/i))                   return 'spreadsheet';
  if (fileName.match(
      /\.(ts|tsx|js|jsx|py|go|rs|java|cpp|c|h|css|html|json|yaml|yml|sh|sql|md)$/i
    ))                                                      return 'code';
  if (mimeType.startsWith('text/'))                        return 'text';
  return 'unknown';
}

// ─── PDF extraction ───────────────────────────────────────────────────────────

export async function extractPdfText(buffer: Buffer): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
  const data = await pdfParse(buffer);
  return data.text.trim();
}

// ─── Word doc extraction ──────────────────────────────────────────────────────

export async function extractWordText(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

// ─── Code summariser ──────────────────────────────────────────────────────────

export function summariseCodeFile(content: string, fileName: string): string {
  const lines = content.split('\n');
  const lineCount = lines.length;
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';

  // Extract top-level identifiers
  const functions  = (content.match(/(?:function\s+\w+|(?:const|let|var)\s+\w+\s*=\s*(?:async\s+)?(?:function|\())/g) ?? []).length;
  const classes    = (content.match(/\bclass\s+\w+/g) ?? []).length;
  const imports    = (content.match(/^import\s+/gm) ?? []).length;
  const exports    = (content.match(/^export\s+/gm) ?? []).length;
  const comments   = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('#')).length;

  return `${ext.toUpperCase()} file (${lineCount} lines) · ${imports} imports · ${exports} exports · ${functions} functions · ${classes} classes · ${comments} comment lines`;
}

// ─── Main perception dispatcher ───────────────────────────────────────────────

export async function perceive(file: PerceivedFile): Promise<PerceptionResult> {
  switch (file.type) {

    case 'image': {
      // Image: return structured info for LLM to process with vision
      const contextBlock = file.imageUrl
        ? `[Image attached: "${file.name}" (${formatBytes(file.sizeBytes)}). Analyze this image and describe what you see in detail, then answer the user's question about it.]`
        : `[Image: "${file.name}" — could not load image data]`;

      return {
        fileType:    'image',
        fileName:    file.name,
        summary:     `Image file: ${file.name}`,
        contextBlock,
        metadata: { size: file.sizeBytes, mimeType: file.mimeType },
      };
    }

    case 'pdf': {
      if (!file.textContent) {
        return stub(file, 'PDF could not be parsed');
      }
      const wordCount = file.textContent.split(/\s+/).filter(Boolean).length;
      const preview   = file.textContent.substring(0, 500);
      // Use 8000 chars to cover ~2000 words comfortably
      const MAX_PDF   = 8000;
      const body      = file.textContent.substring(0, MAX_PDF);
      const truncated = file.textContent.length > MAX_PDF;
      const contextBlock = [
        `[PDF Document: "${file.name}" · ${wordCount} words]`,
        '',
        body,
        truncated ? `\n[... PDF continues — ${file.textContent.length - MAX_PDF} more characters not shown ...]` : '',
      ].join('\n').trim();

      return {
        fileType:    'pdf',
        fileName:    file.name,
        summary:     `PDF: ${wordCount} words extracted from "${file.name}"`,
        rawContent:  file.textContent,
        contextBlock,
        metadata:    { wordCount, preview, truncated },
      };
    }

    case 'word': {
      if (!file.textContent) {
        return stub(file, 'Word document could not be parsed');
      }
      const wordCount = file.textContent.split(/\s+/).filter(Boolean).length;
      const MAX_WORD  = 8000;
      const body      = file.textContent.substring(0, MAX_WORD);
      const truncated = file.textContent.length > MAX_WORD;
      const contextBlock = [
        `[Word Document: "${file.name}" · ${wordCount} words]`,
        '',
        body,
        truncated ? `\n[... document continues — ${file.textContent.length - MAX_WORD} more characters ...]` : '',
      ].join('\n').trim();

      return {
        fileType:    'word',
        fileName:    file.name,
        summary:     `Word doc: ${wordCount} words from "${file.name}"`,
        rawContent:  file.textContent,
        contextBlock,
        metadata:    { wordCount, truncated },
      };
    }

    case 'code': {
      const content = file.textContent ?? '';
      const codeSummary = summariseCodeFile(content, file.name);
      const contextBlock = `[Code File: "${file.name}" — ${codeSummary}]\n\`\`\`\n${content.substring(0, 6000)}\n\`\`\`${content.length > 6000 ? '\n[... file truncated ...]' : ''}`;

      return {
        fileType:    'code',
        fileName:    file.name,
        summary:     codeSummary,
        rawContent:  content,
        contextBlock,
        metadata: { lineCount: content.split('\n').length },
      };
    }

    case 'text': {
      const content = file.textContent ?? '';
      const contextBlock = `[Text File: "${file.name}"]\n${content.substring(0, 4000)}`;

      return {
        fileType:    'text',
        fileName:    file.name,
        summary:     `Text file: ${content.split('\n').length} lines`,
        rawContent:  content,
        contextBlock,
      };
    }

    case 'spreadsheet': {
      const content = file.textContent ?? '';
      const rows = content.split('\n').length;
      const contextBlock = `[Spreadsheet: "${file.name}" · ${rows} rows]\n${content.substring(0, 3000)}`;

      return {
        fileType:    'spreadsheet',
        fileName:    file.name,
        summary:     `Spreadsheet: ${rows} rows`,
        rawContent:  content,
        contextBlock,
        metadata: { rows },
      };
    }

    case 'audio': {
      const hasTranscript = !!file.textContent?.trim();
      const transcript    = file.textContent?.substring(0, 3000) ?? '';
      const contextBlock  = [
        `[Audio File: "${file.name}" (${formatBytes(file.sizeBytes)}, ${file.mimeType})]`,
        hasTranscript
          ? `Transcript:\n${transcript}${(file.textContent?.length ?? 0) > 3000 ? '\n[... transcript continues ...]' : ''}`
          : 'Note: No transcript available — audio could not be transcribed. Please describe the content in your message.',
      ].join('\n');

      return {
        fileType:    'audio',
        fileName:    file.name,
        summary:     hasTranscript
          ? `Audio transcribed: "${transcript.substring(0, 80)}${transcript.length > 80 ? '…' : ''}"`
          : `Audio file: ${file.name} (${formatBytes(file.sizeBytes)})`,
        rawContent:  file.textContent,
        contextBlock,
        metadata:    { size: file.sizeBytes, mimeType: file.mimeType, hasTranscript },
      };
    }

    case 'video': {
      const hasTranscript = !!file.textContent?.trim();
      const transcript    = file.textContent?.substring(0, 3000) ?? '';
      const contextBlock  = [
        `[Video File: "${file.name}" (${formatBytes(file.sizeBytes)}, ${file.mimeType})]`,
        hasTranscript
          ? `Audio Transcript:\n${transcript}${(file.textContent?.length ?? 0) > 3000 ? '\n[... transcript continues ...]' : ''}`
          : 'Note: No audio transcript extracted from this video. Describe what you need help with, or ask specific questions about the video content.',
      ].join('\n');

      return {
        fileType:    'video',
        fileName:    file.name,
        summary:     hasTranscript
          ? `Video transcribed: "${transcript.substring(0, 80)}${transcript.length > 80 ? '…' : ''}"`
          : `Video file: ${file.name} (${formatBytes(file.sizeBytes)})`,
        rawContent:  file.textContent,
        contextBlock,
        metadata:    { size: file.sizeBytes, mimeType: file.mimeType, hasTranscript },
      };
    }

    default:
      return stub(file, 'Unknown file type');
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stub(file: PerceivedFile, reason: string): PerceptionResult {
  return {
    fileType:    file.type,
    fileName:    file.name,
    summary:     `${file.name} — ${reason}`,
    contextBlock: `[File: "${file.name}" — ${reason}]`,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024)         return `${bytes} B`;
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
