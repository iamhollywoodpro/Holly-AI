/**
 * SSE Connection Manager
 * 
 * Tracks active SSE connections per user to prevent memory leaks
 * Limits concurrent connections and provides cleanup
 * 
 * @author HOLLY AI System
 */

interface Connection {
  userId: string;
  conversationId?: string;
  createdAt: number;
  controller: ReadableStreamDefaultController;
}

const MAX_CONNECTIONS_PER_USER = 3;
const connections = new Map<string, Connection[]>();

/**
 * Register a new SSE connection
 */
export function registerConnection(
  userId: string,
  controller: ReadableStreamDefaultController,
  conversationId?: string
): { allowed: boolean; reason?: string } {
  const userConnections = connections.get(userId) || [];

  // Check connection limit
  if (userConnections.length >= MAX_CONNECTIONS_PER_USER) {
    // Close oldest connection
    const oldest = userConnections[0];
    try {
      oldest.controller.close();
    } catch (error) {
      // Already closed
    }
    userConnections.shift();
  }

  // Add new connection
  const connection: Connection = {
    userId,
    conversationId,
    createdAt: Date.now(),
    controller,
  };

  userConnections.push(connection);
  connections.set(userId, userConnections);

  console.log(`[ConnectionManager] User ${userId} now has ${userConnections.length} active connections`);

  return { allowed: true };
}

/**
 * Unregister a connection when closed
 */
export function unregisterConnection(
  userId: string,
  controller: ReadableStreamDefaultController
): void {
  const userConnections = connections.get(userId);
  if (!userConnections) return;

  const filtered = userConnections.filter((conn) => conn.controller !== controller);
  if (filtered.length === 0) {
    connections.delete(userId);
  } else {
    connections.set(userId, filtered);
  }

  console.log(`[ConnectionManager] User ${userId} now has ${filtered.length} active connections`);
}

/**
 * Get active connections for a user
 */
export function getActiveConnections(userId: string): number {
  return connections.get(userId)?.length || 0;
}

/**
 * Close all connections for a user
 */
export function closeUserConnections(userId: string): void {
  const userConnections = connections.get(userId);
  if (!userConnections) return;

  for (const conn of userConnections) {
    try {
      conn.controller.close();
    } catch (error) {
      // Already closed
    }
  }

  connections.delete(userId);
}

/**
 * Cleanup stale connections (older than 1 hour)
 */
export function cleanupStaleConnections(): void {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  const updates: Array<{ userId: string; active: Connection[] }> = [];
  const toDelete: string[] = [];

  connections.forEach((userConnections, userId) => {
    const active = userConnections.filter((conn) => {
      const age = now - conn.createdAt;
      if (age > oneHour) {
        try {
          conn.controller.close();
        } catch (error) {
          // Already closed
        }
        return false;
      }
      return true;
    });

    if (active.length === 0) {
      toDelete.push(userId);
    } else if (active.length !== userConnections.length) {
      updates.push({ userId, active });
    }
  });

  toDelete.forEach(userId => connections.delete(userId));
  updates.forEach(({ userId, active }) => connections.set(userId, active));
}

/**
 * Get system statistics
 */
export function getConnectionStats(): {
  totalConnections: number;
  totalUsers: number;
  averageConnectionsPerUser: number;
} {
  let totalConnections = 0;
  
  connections.forEach((userConnections) => {
    totalConnections += userConnections.length;
  });

  const totalUsers = connections.size;
  const averageConnectionsPerUser = totalUsers > 0 ? totalConnections / totalUsers : 0;

  return {
    totalConnections,
    totalUsers,
    averageConnectionsPerUser,
  };
}

// Auto-cleanup every 10 minutes
setInterval(cleanupStaleConnections, 600000);
