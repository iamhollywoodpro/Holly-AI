/**
 * HOLLY AI Builder — Collaborative Editing Server
 *
 * WebSocket server for real-time multi-user collaboration in the Builder.
 * One room per builder session. Broadcasts file changes, cursor positions,
 * selections, and presence to all participants.
 *
 * Conflict resolution: last-write-wins with monotonic operation IDs for ordering.
 * Session state survives brief disconnections (30s grace period).
 * Max 8 participants per room.
 *
 * Wire protocol (JSON):
 *   Client → Server:
 *     { type: 'join', sessionId, userId, userName, color }
 *     { type: 'leave' }
 *     { type: 'file_change', filePath, content, opId }
 *     { type: 'cursor_move', filePath, line, column }
 *     { type: 'selection_change', filePath, startLine, startCol, endLine, endCol }
 *     { type: 'ping' }
 *
 *   Server → Client:
 *     { type: 'joined', participants, recentOps }
 *     { type: 'participant_joined', participant }
 *     { type: 'participant_left', userId }
 *     { type: 'file_change', userId, filePath, content, opId }
 *     { type: 'cursor_move', userId, filePath, line, column }
 *     { type: 'selection_change', userId, filePath, startLine, startCol, endLine, endCol }
 *     { type: 'pong' }
 *     { type: 'error', message }
 *     { type: 'room_full' }
 *     { type: 'state_recovery', fileChanges }
 */

import { WebSocketServer, WebSocket } from 'ws';
import type http from 'http';

const dev = process.env.NODE_ENV !== 'production';

let clerkVerify: ((token: string) => Promise<{ sub: string } | null>) | null = null;
let clerkLoaded = false;

async function loadClerk(): Promise<void> {
  if (clerkLoaded) return;
  clerkLoaded = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clerk = await import('@clerk/nextjs/server') as any;
    if (typeof clerk.verifyToken === 'function') {
      clerkVerify = clerk.verifyToken;
    }
  } catch {
    console.warn('[Collab] Clerk unavailable — token verification disabled');
  }
}

async function authenticate(token: string | null): Promise<string | null> {
  if (!token) return null;
  if (clerkVerify) {
    try {
      return (await clerkVerify(token))?.sub ?? null;
    } catch {
      return null;
    }
  }
  if (dev) {
    console.warn('[Collab] Clerk unavailable — accepting token in dev');
    return 'dev-user';
  }
  return null;
}

const MAX_PARTICIPANTS = 8;
const GRACE_PERIOD_MS = 30_000;
const COLLAB_WS_PATH = '/ws/collaborate';

export interface Participant {
  userId: string;
  userName: string;
  color: string;
  ws: WebSocket | null;
  connectedAt: number;
  lastSeen: number;
  cursor: CursorPosition | null;
  selection: SelectionRange | null;
}

export interface CursorPosition {
  filePath: string;
  line: number;
  column: number;
}

export interface SelectionRange {
  filePath: string;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
}

export interface FileOperation {
  opId: number;
  userId: string;
  filePath: string;
  content: string;
  timestamp: number;
}

interface Room {
  sessionId: string;
  participants: Map<string, Participant>;
  disconnected: Map<string, { participant: Omit<Participant, 'ws'>; disconnectedAt: number }>;
  fileOps: Map<string, FileOperation>;
  nextOpId: number;
  createdAt: number;
}

class CollaborativeServer {
  private wss: WebSocketServer | null = null;
  private rooms = new Map<string, Room>();
  private wsToRoom = new Map<WebSocket, { sessionId: string; userId: string }>();
  private sweepTimer: ReturnType<typeof setInterval> | null = null;

  attach(httpServer: http.Server): void {
    if (this.wss) return;

    this.wss = new WebSocketServer({ noServer: true });

    loadClerk().catch(() => {});

    httpServer.on('upgrade', async (req: http.IncomingMessage, socket, head) => {
      const url = req.url ?? '/';
      if (!url.startsWith(COLLAB_WS_PATH)) return;

      const parsedUrl = new URL(url, `http://${req.headers.host ?? 'localhost'}`);
      const sessionId = parsedUrl.searchParams.get('sessionId');
      const token = parsedUrl.searchParams.get('token');

      if (!sessionId || !token) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
        socket.destroy();
        return;
      }

      await loadClerk();
      const userId = await authenticate(token);

      if (!userId) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      if (!this.wss) {
        socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.wss!.emit('connection', ws, req);
        this.handleConnection(ws, sessionId, userId);
      });
    });

    this.wss.on('connection', () => {});

    this.sweepTimer = setInterval(() => this.sweepGracePeriod(), 10_000);
    if (this.sweepTimer.unref) this.sweepTimer.unref();

    console.log(`[Collab] WebSocket server attached on ${COLLAB_WS_PATH}`);
  }

  private handleConnection(ws: WebSocket, sessionId: string, userId: string): void {
    this.wsToRoom.set(ws, { sessionId, userId });

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        this.handleMessage(ws, sessionId, userId, msg);
      } catch {}
    });

    ws.on('close', () => {
      this.handleDisconnect(ws, sessionId, userId);
    });

    ws.on('error', () => {
      this.handleDisconnect(ws, sessionId, userId);
    });

    const send = (obj: object) => {
      try {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
      } catch {}
    };

    const existingRoom = this.rooms.get(sessionId);
    if (existingRoom) {
      const existing = existingRoom.participants.get(userId);
      if (existing) {
        if (existing.ws && existing.ws.readyState === WebSocket.OPEN) {
          existing.ws.close();
        }
        existing.ws = ws;
        existing.lastSeen = Date.now();
        const recentOps = this.getRecentOps(existingRoom, 50);
        send({ type: 'joined', participants: this.serializeParticipants(existingRoom), recentOps });
        this.broadcast(existingRoom, { type: 'participant_joined', participant: this.serializeParticipant(existing) }, userId);
        return;
      }

      const graceEntry = existingRoom.disconnected.get(userId);
      if (graceEntry) {
        existingRoom.disconnected.delete(userId);
        const participant: Participant = {
          ...graceEntry.participant,
          ws,
          connectedAt: Date.now(),
          lastSeen: Date.now(),
          cursor: graceEntry.participant.cursor,
          selection: graceEntry.participant.selection,
        };
        existingRoom.participants.set(userId, participant);
        const recentOps = this.getRecentOps(existingRoom, 50);
        send({ type: 'joined', participants: this.serializeParticipants(existingRoom), recentOps });
        this.broadcast(existingRoom, { type: 'participant_joined', participant: this.serializeParticipant(participant) }, userId);
        return;
      }

      if (existingRoom.participants.size >= MAX_PARTICIPANTS) {
        send({ type: 'room_full', message: `Max ${MAX_PARTICIPANTS} participants` });
        ws.close();
        return;
      }
    }

    const msg = {
      type: 'join' as const,
      sessionId,
      userId,
      userName: userId,
      color: this.assignColor(sessionId, userId),
    };
    this.handleMessage(ws, sessionId, userId, msg);
  }

  private handleMessage(ws: WebSocket, sessionId: string, userId: string, msg: Record<string, unknown>): void {
    const room = this.rooms.get(sessionId);
    const type = msg.type as string;

    if (type === 'ping') {
      this.sendTo(ws, { type: 'pong' });
      const participant = room?.participants.get(userId);
      if (participant) participant.lastSeen = Date.now();
      return;
    }

    if (type === 'join') {
      this.handleJoin(ws, sessionId, userId, msg);
      return;
    }

    if (!room) {
      this.sendTo(ws, { type: 'error', message: 'Room not found' });
      return;
    }

    const participant = room.participants.get(userId);
    if (!participant) {
      this.sendTo(ws, { type: 'error', message: 'Not joined' });
      return;
    }

    participant.lastSeen = Date.now();

    switch (type) {
      case 'file_change': {
        const filePath = msg.filePath as string;
        const content = msg.content as string;
        const clientOpId = msg.opId as number | undefined;

        const existing = room.fileOps.get(filePath);
        if (existing && clientOpId !== undefined && clientOpId <= existing.opId) {
          break;
        }

        const opId = room.nextOpId++;
        const op: FileOperation = {
          opId,
          userId,
          filePath,
          content,
          timestamp: Date.now(),
        };
        room.fileOps.set(filePath, op);

        if (room.fileOps.size > 200) {
          const keys = [...room.fileOps.keys()].slice(0, 50);
          keys.forEach(k => room.fileOps.delete(k));
        }

        this.broadcast(room, { type: 'file_change', userId, filePath, content, opId }, userId);
        break;
      }

      case 'cursor_move': {
        const cursor: CursorPosition = {
          filePath: msg.filePath as string,
          line: msg.line as number,
          column: msg.column as number,
        };
        participant.cursor = cursor;
        this.broadcast(room, { type: 'cursor_move', userId, ...cursor }, userId);
        break;
      }

      case 'selection_change': {
        const selection: SelectionRange = {
          filePath: msg.filePath as string,
          startLine: msg.startLine as number,
          startCol: msg.startCol as number,
          endLine: msg.endLine as number,
          endCol: msg.endCol as number,
        };
        participant.selection = selection;
        this.broadcast(room, { type: 'selection_change', userId, ...selection }, userId);
        break;
      }

      case 'leave': {
        this.removeParticipant(room, userId);
        break;
      }
    }
  }

  private handleJoin(ws: WebSocket, sessionId: string, userId: string, msg: Record<string, unknown>): void {
    let room = this.rooms.get(sessionId);
    if (!room) {
      room = {
        sessionId,
        participants: new Map(),
        disconnected: new Map(),
        fileOps: new Map(),
        nextOpId: 1,
        createdAt: Date.now(),
      };
      this.rooms.set(sessionId, room);
    }

    if (room.participants.has(userId)) {
      const existing = room.participants.get(userId)!;
      if (existing.ws && existing.ws.readyState === WebSocket.OPEN) {
        existing.ws.close();
      }
      existing.ws = ws;
      existing.lastSeen = Date.now();
      if (msg.userName) existing.userName = msg.userName as string;
      if (msg.color) existing.color = msg.color as string;

      const recentOps = this.getRecentOps(room, 50);
      this.sendTo(ws, { type: 'joined', participants: this.serializeParticipants(room), recentOps });
      this.broadcast(room, { type: 'participant_joined', participant: this.serializeParticipant(existing) }, userId);
      return;
    }

    if (room.participants.size >= MAX_PARTICIPANTS) {
      this.sendTo(ws, { type: 'room_full', message: `Max ${MAX_PARTICIPANTS} participants` });
      ws.close();
      return;
    }

    const participant: Participant = {
      userId,
      userName: (msg.userName as string) ?? userId,
      color: (msg.color as string) ?? this.assignColor(sessionId, userId),
      ws,
      connectedAt: Date.now(),
      lastSeen: Date.now(),
      cursor: null,
      selection: null,
    };

    room.participants.set(userId, participant);

    const recentOps = this.getRecentOps(room, 50);
    this.sendTo(ws, { type: 'joined', participants: this.serializeParticipants(room), recentOps });
    this.broadcast(room, { type: 'participant_joined', participant: this.serializeParticipant(participant) }, userId);
  }

  private handleDisconnect(ws: WebSocket, sessionId: string, userId: string): void {
    this.wsToRoom.delete(ws);

    const room = this.rooms.get(sessionId);
    if (!room) return;

    const participant = room.participants.get(userId);
    if (!participant) return;

    if (participant.ws === ws) {
      participant.ws = null;
      room.disconnected.set(userId, {
        participant: {
          userId: participant.userId,
          userName: participant.userName,
          color: participant.color,
          connectedAt: participant.connectedAt,
          lastSeen: participant.lastSeen,
          cursor: participant.cursor,
          selection: participant.selection,
        },
        disconnectedAt: Date.now(),
      });
      room.participants.delete(userId);

      this.broadcast(room, {
        type: 'participant_disconnected',
        userId,
        userName: participant.userName,
        gracePeriodMs: GRACE_PERIOD_MS,
      });
    }
  }

  private removeParticipant(room: Room, userId: string): void {
    const participant = room.participants.get(userId);
    if (!participant) return;

    if (participant.ws && participant.ws.readyState === WebSocket.OPEN) {
      participant.ws.close();
    }
    room.participants.delete(userId);
    room.disconnected.delete(userId);

    this.broadcast(room, { type: 'participant_left', userId });

    if (room.participants.size === 0 && room.disconnected.size === 0) {
      this.rooms.delete(room.sessionId);
    }
  }

  private sweepGracePeriod(): void {
    const now = Date.now();
    for (const [sessionId, room] of this.rooms) {
      for (const [userId, entry] of room.disconnected) {
        if (now - entry.disconnectedAt > GRACE_PERIOD_MS) {
          room.disconnected.delete(userId);
          this.broadcast(room, { type: 'participant_left', userId });
        }
      }
      if (room.participants.size === 0 && room.disconnected.size === 0) {
        this.rooms.delete(sessionId);
      }
    }
  }

  private broadcast(room: Room, message: object, excludeUserId?: string): void {
    const data = JSON.stringify(message);
    for (const [uid, participant] of room.participants) {
      if (uid === excludeUserId) continue;
      if (participant.ws && participant.ws.readyState === WebSocket.OPEN) {
        try {
          participant.ws.send(data);
        } catch {}
      }
    }
  }

  private sendTo(ws: WebSocket, message: object): void {
    try {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
    } catch {}
  }

  private getRecentOps(room: Room, limit: number): FileOperation[] {
    const ops = [...room.fileOps.values()].sort((a, b) => b.opId - a.opId);
    return ops.slice(0, limit);
  }

  private serializeParticipant(p: Participant): Record<string, unknown> {
    return {
      userId: p.userId,
      userName: p.userName,
      color: p.color,
      cursor: p.cursor,
      selection: p.selection,
    };
  }

  private serializeParticipants(room: Room): Record<string, unknown>[] {
    return [...room.participants.values()].map(p => this.serializeParticipant(p));
  }

  private assignColor(_sessionId: string, _userId: string): string {
    const palette = [
      '#e06c75', '#61afef', '#98c379', '#c678dd',
      '#e5c07b', '#56b6c2', '#d19a66', '#be5046',
    ];
    const index = (this.rooms.size + Math.floor(Math.random() * palette.length)) % palette.length;
    return palette[index];
  }

  getRoomInfo(sessionId: string): { participantCount: number; participants: Record<string, unknown>[] } | null {
    const room = this.rooms.get(sessionId);
    if (!room) return null;
    return {
      participantCount: room.participants.size,
      participants: this.serializeParticipants(room),
    };
  }

  getActiveSessions(): { sessionId: string; participantCount: number; createdAt: number }[] {
    return [...this.rooms.entries()].map(([sessionId, room]) => ({
      sessionId,
      participantCount: room.participants.size,
      createdAt: room.createdAt,
    }));
  }

  closeRoom(sessionId: string): boolean {
    const room = this.rooms.get(sessionId);
    if (!room) return false;

    for (const participant of room.participants.values()) {
      if (participant.ws && participant.ws.readyState === WebSocket.OPEN) {
        this.sendTo(participant.ws, { type: 'room_closed', message: 'Session ended' });
        participant.ws.close();
      }
    }

    room.participants.clear();
    room.disconnected.clear();
    this.rooms.delete(sessionId);
    return true;
  }
}

const globalKey = '__holly_collaborative_server__';

export const collaborativeServer: CollaborativeServer =
  (globalThis as Record<string, unknown>)[globalKey] as CollaborativeServer ??
  (() => {
    const s = new CollaborativeServer();
    (globalThis as Record<string, unknown>)[globalKey] = s;
    return s;
  })();

export function getCollabServer(): CollaborativeServer {
  return collaborativeServer;
}

export function attachCollabServer(httpServer: http.Server): void {
  collaborativeServer.attach(httpServer);
}
