/**
 * HOLLY AI Builder — In-process Event Bus
 * Feeds SSE streams and persists events to DB.
 */

export type BuildEventType =
  | 'info' | 'plan' | 'file_write' | 'file_delete' | 'cmd_start' | 'cmd_done'
  | 'log' | 'error' | 'fix' | 'preview_ready' | 'done' | 'progress' | 'phase'
  | 'tree_invalidated';

export interface BuildEventPayload {
  type: BuildEventType;
  sessionId: string;
  phase?: string;
  title: string;
  body?: string;
  filePath?: string;
  command?: string;
  exitCode?: number;
  durationMs?: number;
  level?: 'info' | 'warn' | 'error' | 'success';
  progress?: number;
  previewUrl?: string;
  ts: number;
}

type Listener = (event: BuildEventPayload) => void;

class BuildEventBus {
  private listeners = new Map<string, Set<Listener>>();

  subscribe(sessionId: string, listener: Listener): () => void {
    if (!this.listeners.has(sessionId)) {
      this.listeners.set(sessionId, new Set());
    }
    this.listeners.get(sessionId)!.add(listener);
    return () => {
      this.listeners.get(sessionId)?.delete(listener);
      if (this.listeners.get(sessionId)?.size === 0) {
        this.listeners.delete(sessionId);
      }
    };
  }

  emit(event: BuildEventPayload): void {
    const subs = this.listeners.get(event.sessionId);
    if (subs) {
      subs.forEach(fn => {
        try { fn(event); } catch { /* never crash bus */ }
      });
    }
  }

  hasListeners(sessionId: string): boolean {
    return (this.listeners.get(sessionId)?.size ?? 0) > 0;
  }
}

// Singleton — survives hot reload in dev via globalThis
const key = '__holly_builder_event_bus__';
export const eventBus: BuildEventBus =
  (globalThis as Record<string, unknown>)[key] as BuildEventBus ??
  (() => {
    const b = new BuildEventBus();
    (globalThis as Record<string, unknown>)[key] = b;
    return b;
  })();

/** Convenience emitter used throughout the builder. */
export function emit(sessionId: string, event: Omit<BuildEventPayload, 'sessionId' | 'ts'> & { sessionId?: string; ts?: number }): void {
  eventBus.emit({ ...event, sessionId, ts: Date.now() });
}
