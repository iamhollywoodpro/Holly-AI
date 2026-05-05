/**
 * HOLLY AI Builder — File Sync Service
 *
 * Emits file events into the SSE stream and manages conflict detection.
 *
 * Event types:
 *   file_created  — new file written by HOLLY or terminal
 *   file_updated  — existing file modified
 *   file_deleted  — file removed
 *   file_renamed  — file moved/renamed
 *   file_conflict — HOLLY wants to write but client has dirty buffer
 *   tree_invalidated — bulk tree refresh needed
 *
 * Client-side rules:
 *   1. Always refresh file tree on file_created/deleted/renamed/tree_invalidated
 *   2. Auto-refresh Monaco content ONLY if buffer is clean (no unsaved changes)
 *   3. Show conflict banner if buffer is dirty and HOLLY wants to overwrite
 */

import { prisma } from '@/lib/db';
import { emit } from './event-bus';

export type FileSyncEventType =
  | 'file_created'
  | 'file_updated'
  | 'file_deleted'
  | 'file_renamed'
  | 'file_conflict'
  | 'tree_invalidated';

export interface FileSyncEvent {
  eventType: FileSyncEventType;
  sessionId: string;
  path: string;
  newPath?: string;        // for rename
  content?: string;        // for created/updated (truncated preview)
  source: 'holly' | 'terminal' | 'user' | 'git';
  conflictContent?: string; // what HOLLY wants to write (for conflict events)
}

/**
 * Emit a file sync event. Call this every time HOLLY writes, deletes, or
 * renames a file in the workspace.
 */
export async function emitFileSync(event: FileSyncEvent): Promise<void> {
  // Emit into SSE stream
  emit(event.sessionId, {
    type: event.eventType as Parameters<typeof emit>[1]['type'],
    title: formatTitle(event),
    body: event.content ? event.content.slice(0, 500) : undefined,
    filePath: event.path,
    level: event.eventType === 'file_conflict' ? 'warn' : 'info',
  });

  // Persist event to DB (non-critical)
  try {
    await prisma.buildEvent.create({
      data: {
        sessionId: event.sessionId,
        type: event.eventType,
        title: formatTitle(event),
        body: event.eventType === 'file_conflict'
          ? `HOLLY wants to update ${event.path} but you have unsaved changes.`
          : event.content?.slice(0, 2000),
        filePath: event.path,
        level: event.eventType === 'file_conflict' ? 'warn' : 'info',
      },
    });
  } catch { /* non-critical */ }
}

/**
 * Convenience: emit a tree_invalidated event (bulk refresh).
 * Use after bulk operations like git checkout, npm install etc.
 */
export async function invalidateTree(sessionId: string, reason?: string): Promise<void> {
  emit(sessionId, {
    type: 'tree_invalidated',
    title: 'File tree changed',
    body: reason,
    level: 'info',
  });
}

function formatTitle(event: FileSyncEvent): string {
  switch (event.eventType) {
    case 'file_created': return `[${event.source}] Created: ${event.path}`;
    case 'file_updated': return `[${event.source}] Updated: ${event.path}`;
    case 'file_deleted': return `[${event.source}] Deleted: ${event.path}`;
    case 'file_renamed': return `[${event.source}] Renamed: ${event.path} → ${event.newPath}`;
    case 'file_conflict': return `⚠ Conflict: ${event.path} (unsaved local changes)`;
    case 'tree_invalidated': return 'Tree invalidated';
  }
}
