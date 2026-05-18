/**
 * Server-Sent Events (SSE) Manager
 * Phase 8.2 — Real-time event delivery via SSE
 *
 * Manages per-user SSE connections for real-time features:
 * - Typing indicators
 * - Proactive notifications
 * - Consciousness state changes
 * - Morning briefing delivery
 * - System health updates
 */

import type { RealtimeEvent } from './event-types';

interface SSEConnection {
  userId: string;
  controller: ReadableStreamDefaultController;
  connectedAt: Date;
  lastHeartbeat: Date;
}

class SSEManager {
  private connections: Map<string, SSEConnection[]> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Send heartbeat every 30 seconds to keep connections alive
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 30_000);
  }

  /**
   * Add a new SSE connection for a user
   */
  addConnection(userId: string, controller: ReadableStreamDefaultController): () => void {
    const connection: SSEConnection = {
      userId,
      controller,
      connectedAt: new Date(),
      lastHeartbeat: new Date(),
    };

    if (!this.connections.has(userId)) {
      this.connections.set(userId, []);
    }
    this.connections.get(userId)!.push(connection);

    // Send initial connection event
    this.sendEvent(controller, {
      type: 'heartbeat',
      timestamp: new Date().toISOString(),
      serverTime: new Date().toISOString(),
    });

    // Return cleanup function
    return () => {
      const userConns = this.connections.get(userId);
      if (userConns) {
        const idx = userConns.findIndex(c => c.controller === controller);
        if (idx !== -1) userConns.splice(idx, 1);
        if (userConns.length === 0) this.connections.delete(userId);
      }
    };
  }

  /**
   * Send an event to a specific user
   */
  sendToUser(userId: string, event: RealtimeEvent): number {
    const userConns = this.connections.get(userId);
    if (!userConns || userConns.length === 0) return 0;

    let sent = 0;
    for (const conn of userConns) {
      try {
        this.sendEvent(conn.controller, event);
        conn.lastHeartbeat = new Date();
        sent++;
      } catch {
        // Connection closed, remove it
        const idx = userConns.indexOf(conn);
        if (idx !== -1) userConns.splice(idx, 1);
      }
    }

    if (userConns.length === 0) {
      this.connections.delete(userId);
    }

    return sent;
  }

  /**
   * Broadcast an event to all connected users
   */
  broadcast(event: RealtimeEvent): number {
    let totalSent = 0;
    for (const [userId] of this.connections) {
      totalSent += this.sendToUser(userId, event);
    }
    return totalSent;
  }

  /**
   * Get count of connected users
   */
  getConnectedCount(): { users: number; connections: number } {
    let connections = 0;
    for (const conns of this.connections.values()) {
      connections += conns.length;
    }
    return { users: this.connections.size, connections };
  }

  /**
   * Check if a user is currently connected
   */
  isUserConnected(userId: string): boolean {
    const conns = this.connections.get(userId);
    return !!conns && conns.length > 0;
  }

  /**
   * Send a proactive notification to a user
   */
  sendNotification(userId: string, title: string, content: string, priority: 'low' | 'medium' | 'high' = 'medium'): number {
    return this.sendToUser(userId, {
      type: 'proactive_notification',
      timestamp: new Date().toISOString(),
      userId,
      title,
      content,
      priority,
    });
  }

  /**
   * Send morning briefing to a user
   */
  sendMorningBriefing(userId: string, content: string): number {
    return this.sendToUser(userId, {
      type: 'morning_briefing',
      timestamp: new Date().toISOString(),
      userId,
      title: 'Good morning! ☀️',
      content,
      priority: 'high',
    });
  }

  /**
   * Send consciousness state change to a user
   */
  sendConsciousnessUpdate(userId: string, emotionalState: string, mood: string, energy: number): number {
    return this.sendToUser(userId, {
      type: 'consciousness_state_change',
      timestamp: new Date().toISOString(),
      userId,
      emotionalState,
      mood,
      energy,
    });
  }

  // ── Private methods ──────────────────────────────────────────────────────

  private sendEvent(controller: ReadableStreamDefaultController, event: RealtimeEvent): void {
    const data = JSON.stringify(event);
    controller.enqueue(`event: ${event.type}\ndata: ${data}\n\n`);
  }

  private broadcastHeartbeat(): void {
    const heartbeat = {
      type: 'heartbeat' as const,
      timestamp: new Date().toISOString(),
      serverTime: new Date().toISOString(),
    };

    for (const [userId, conns] of this.connections) {
      const staleConns: SSEConnection[] = [];

      for (const conn of conns) {
        try {
          this.sendEvent(conn.controller, heartbeat);
          conn.lastHeartbeat = new Date();
        } catch {
          staleConns.push(conn);
        }
      }

      // Remove stale connections
      if (staleConns.length > 0) {
        const activeConns = conns.filter(c => !staleConns.includes(c));
        if (activeConns.length === 0) {
          this.connections.delete(userId);
        } else {
          this.connections.set(userId, activeConns);
        }
      }
    }
  }

  destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    // Close all connections
    for (const conns of this.connections.values()) {
      for (const conn of conns) {
        try { conn.controller.close(); } catch { /* already closed */ }
      }
    }
    this.connections.clear();
  }
}

// Singleton instance
export const sseManager = new SSEManager();
