/**
 * POST /api/perception — Phase 9A: HOLLY's Unified Perception Gateway
 *
 * Accepts any file type (multipart/form-data) and returns structured
 * perception results that get injected into the chat context.
 *
 * Supported inputs:
 *   images     → base64 data URL returned for vision LLM
 *   PDFs       → text extracted, returned as contextBlock
 *   Word docs  → text extracted via mammoth
 *   code files → syntax-aware context block
 *   audio      → transcription via Whisper + audio URL
 *   text files → raw content
 *   CSV/xlsx   → row content
 *
 * Response:
 *   { ok: true, perception: PerceptionResult, imageDataUrl?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  perceive,
  detectPerceptionType,
  extractPdfText,
  extractWordText,
  type PerceivedFile,
} from '@/lib/perception/holly-perception';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 50 MB max file size
const MAX_SIZE = 50 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    // Auth
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large (max ${MAX_SIZE / 1024 / 1024}MB)` },
        { status: 413 }
      );
    }

    const mimeType  = file.type || 'application/octet-stream';
    const fileName  = file.name || 'unnamed';
    const type      = detectPerceptionType(mimeType, fileName);
    const arrayBuf  = await file.arrayBuffer();
    const buffer    = Buffer.from(arrayBuf);

    const perceivedFile: PerceivedFile = {
      type,
      name:      fileName,
      sizeBytes: file.size,
      mimeType,
    };

    // ── Extract content by type ────────────────────────────────────────────────

    let imageDataUrl: string | undefined;

    if (type === 'image') {
      // Convert to base64 data URL for vision LLM
      const base64   = buffer.toString('base64');
      imageDataUrl   = `data:${mimeType};base64,${base64}`;
      perceivedFile.imageUrl = imageDataUrl;

    } else if (type === 'pdf') {
      perceivedFile.textContent = await extractPdfText(buffer);

    } else if (type === 'word') {
      perceivedFile.textContent = await extractWordText(buffer);

    } else if (type === 'audio' || type === 'video') {
      // Transcribe audio/video via Groq Whisper (large-v3-turbo — fastest free option)
      // Video files: Whisper accepts the container directly and extracts audio internally
      // Max size for Whisper: 25 MB. For larger files we skip transcription gracefully.
      const MAX_WHISPER = 25 * 1024 * 1024;
      if (buffer.length <= MAX_WHISPER) {
        try {
          const whisperFormData = new FormData();
          // Use 'audio/mpeg' for video containers — Groq Whisper is lenient on mime type
          const blobMime = mimeType.startsWith('video/') ? 'audio/mpeg' : mimeType;
          whisperFormData.append('file', new Blob([buffer], { type: blobMime }), fileName);
          whisperFormData.append('model', 'whisper-large-v3-turbo');

          const transcriptRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
            body: whisperFormData,
          });

          if (transcriptRes.ok) {
            const transcriptData = await transcriptRes.json();
            perceivedFile.textContent = transcriptData.text ?? '';
          } else {
            console.warn('[Perception] Whisper returned', transcriptRes.status, await transcriptRes.text());
          }
        } catch (whisperErr) {
          console.warn('[Perception] Whisper transcription failed:', whisperErr);
        }
      } else {
        console.log(`[Perception] File too large for Whisper (${Math.round(buffer.length / 1024 / 1024)}MB > 25MB) — skipping transcription`);
      }

    } else if (type === 'code' || type === 'text' || type === 'spreadsheet') {
      perceivedFile.textContent = buffer.toString('utf-8');
    }

    // ── Run perception engine ──────────────────────────────────────────────────
    const perception = await perceive(perceivedFile);

    return NextResponse.json({
      ok:          true,
      perception,
      imageDataUrl,  // only present for images — used by vision LLM
    });

  } catch (error: unknown) {
    console.error('[Perception] Error:', error);
    return NextResponse.json(
      { error: 'Perception failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
