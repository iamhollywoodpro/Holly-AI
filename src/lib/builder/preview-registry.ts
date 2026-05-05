/**
 * HOLLY AI Builder — Preview Registry
 *
 * Maps sessionId → { host, port } for the reverse proxy.
 * Singleton on globalThis so it survives Next.js hot reloads.
 *
 * Security:
 *  - Only pre-registered targets can be proxied (no arbitrary proxy)
 *  - Sessions are cleaned up on destroy
 *  - TTL-based expiry
 */

const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

export interface PreviewTarget {
  sessionId: string;
  host: string;
  port: number;
  registeredAt: number;
  lastAccess: number;
}

class PreviewRegistry {
  private map = new Map<string, PreviewTarget>();

  register(sessionId: string, port: number, host = '127.0.0.1'): PreviewTarget {
    const target: PreviewTarget = {
      sessionId, host, port,
      registeredAt: Date.now(),
      lastAccess: Date.now(),
    };
    this.map.set(sessionId, target);
    return target;
  }

  get(sessionId: string): PreviewTarget | undefined {
    const t = this.map.get(sessionId);
    if (t) { t.lastAccess = Date.now(); }
    return t;
  }

  unregister(sessionId: string): void {
    this.map.delete(sessionId);
  }

  /** TTL sweep — call periodically */
  sweep(): void {
    const now = Date.now();
    for (const [id, t] of this.map) {
      if (now - t.lastAccess > TTL_MS) {
        this.map.delete(id);
      }
    }
  }

  all(): PreviewTarget[] {
    return [...this.map.values()];
  }
}

const KEY = '__holly_preview_registry__';
export const previewRegistry: PreviewRegistry =
  (globalThis as Record<string, unknown>)[KEY] as PreviewRegistry ??
  (() => {
    const r = new PreviewRegistry();
    (globalThis as Record<string, unknown>)[KEY] = r;
    setInterval(() => r.sweep(), 30 * 60 * 1000).unref?.();
    return r;
  })();
