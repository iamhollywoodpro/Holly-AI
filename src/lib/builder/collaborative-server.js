"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.collaborativeServer = void 0;
exports.getCollabServer = getCollabServer;
exports.attachCollabServer = attachCollabServer;
const ws_1 = require("ws");
const dev = process.env.NODE_ENV !== 'production';
let clerkVerify = null;
let clerkLoaded = false;
async function loadClerk() {
    if (clerkLoaded)
        return;
    clerkLoaded = true;
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const clerk = await Promise.resolve().then(() => __importStar(require('@clerk/nextjs/server')));
        if (typeof clerk.verifyToken === 'function') {
            clerkVerify = clerk.verifyToken;
        }
    }
    catch {
        console.warn('[Collab] Clerk unavailable — token verification disabled');
    }
}
async function authenticate(token) {
    if (!token)
        return null;
    if (clerkVerify) {
        try {
            return (await clerkVerify(token))?.sub ?? null;
        }
        catch {
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
const GRACE_PERIOD_MS = 30000;
const COLLAB_WS_PATH = '/ws/collaborate';
class CollaborativeServer {
    constructor() {
        this.wss = null;
        this.rooms = new Map();
        this.wsToRoom = new Map();
        this.sweepTimer = null;
    }
    attach(httpServer) {
        if (this.wss)
            return;
        this.wss = new ws_1.WebSocketServer({ noServer: true });
        loadClerk().catch(() => { });
        httpServer.on('upgrade', async (req, socket, head) => {
            const url = req.url ?? '/';
            if (!url.startsWith(COLLAB_WS_PATH))
                return;
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
                this.wss.emit('connection', ws, req);
                this.handleConnection(ws, sessionId, userId);
            });
        });
        this.wss.on('connection', () => { });
        this.sweepTimer = setInterval(() => this.sweepGracePeriod(), 10000);
        if (this.sweepTimer.unref)
            this.sweepTimer.unref();
        console.log(`[Collab] WebSocket server attached on ${COLLAB_WS_PATH}`);
    }
    handleConnection(ws, sessionId, userId) {
        this.wsToRoom.set(ws, { sessionId, userId });
        ws.on('message', (raw) => {
            try {
                const msg = JSON.parse(raw.toString());
                this.handleMessage(ws, sessionId, userId, msg);
            }
            catch { }
        });
        ws.on('close', () => {
            this.handleDisconnect(ws, sessionId, userId);
        });
        ws.on('error', () => {
            this.handleDisconnect(ws, sessionId, userId);
        });
        const send = (obj) => {
            try {
                if (ws.readyState === ws_1.WebSocket.OPEN)
                    ws.send(JSON.stringify(obj));
            }
            catch { }
        };
        const existingRoom = this.rooms.get(sessionId);
        if (existingRoom) {
            const existing = existingRoom.participants.get(userId);
            if (existing) {
                if (existing.ws && existing.ws.readyState === ws_1.WebSocket.OPEN) {
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
                const participant = {
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
            type: 'join',
            sessionId,
            userId,
            userName: userId,
            color: this.assignColor(sessionId, userId),
        };
        this.handleMessage(ws, sessionId, userId, msg);
    }
    handleMessage(ws, sessionId, userId, msg) {
        const room = this.rooms.get(sessionId);
        const type = msg.type;
        if (type === 'ping') {
            this.sendTo(ws, { type: 'pong' });
            const participant = room?.participants.get(userId);
            if (participant)
                participant.lastSeen = Date.now();
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
                const filePath = msg.filePath;
                const content = msg.content;
                const clientOpId = msg.opId;
                const existing = room.fileOps.get(filePath);
                if (existing && clientOpId !== undefined && clientOpId <= existing.opId) {
                    break;
                }
                const opId = room.nextOpId++;
                const op = {
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
                const cursor = {
                    filePath: msg.filePath,
                    line: msg.line,
                    column: msg.column,
                };
                participant.cursor = cursor;
                this.broadcast(room, { type: 'cursor_move', userId, ...cursor }, userId);
                break;
            }
            case 'selection_change': {
                const selection = {
                    filePath: msg.filePath,
                    startLine: msg.startLine,
                    startCol: msg.startCol,
                    endLine: msg.endLine,
                    endCol: msg.endCol,
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
    handleJoin(ws, sessionId, userId, msg) {
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
            const existing = room.participants.get(userId);
            if (existing.ws && existing.ws.readyState === ws_1.WebSocket.OPEN) {
                existing.ws.close();
            }
            existing.ws = ws;
            existing.lastSeen = Date.now();
            if (msg.userName)
                existing.userName = msg.userName;
            if (msg.color)
                existing.color = msg.color;
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
        const participant = {
            userId,
            userName: msg.userName ?? userId,
            color: msg.color ?? this.assignColor(sessionId, userId),
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
    handleDisconnect(ws, sessionId, userId) {
        this.wsToRoom.delete(ws);
        const room = this.rooms.get(sessionId);
        if (!room)
            return;
        const participant = room.participants.get(userId);
        if (!participant)
            return;
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
    removeParticipant(room, userId) {
        const participant = room.participants.get(userId);
        if (!participant)
            return;
        if (participant.ws && participant.ws.readyState === ws_1.WebSocket.OPEN) {
            participant.ws.close();
        }
        room.participants.delete(userId);
        room.disconnected.delete(userId);
        this.broadcast(room, { type: 'participant_left', userId });
        if (room.participants.size === 0 && room.disconnected.size === 0) {
            this.rooms.delete(room.sessionId);
        }
    }
    sweepGracePeriod() {
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
    broadcast(room, message, excludeUserId) {
        const data = JSON.stringify(message);
        for (const [uid, participant] of room.participants) {
            if (uid === excludeUserId)
                continue;
            if (participant.ws && participant.ws.readyState === ws_1.WebSocket.OPEN) {
                try {
                    participant.ws.send(data);
                }
                catch { }
            }
        }
    }
    sendTo(ws, message) {
        try {
            if (ws.readyState === ws_1.WebSocket.OPEN)
                ws.send(JSON.stringify(message));
        }
        catch { }
    }
    getRecentOps(room, limit) {
        const ops = [...room.fileOps.values()].sort((a, b) => b.opId - a.opId);
        return ops.slice(0, limit);
    }
    serializeParticipant(p) {
        return {
            userId: p.userId,
            userName: p.userName,
            color: p.color,
            cursor: p.cursor,
            selection: p.selection,
        };
    }
    serializeParticipants(room) {
        return [...room.participants.values()].map(p => this.serializeParticipant(p));
    }
    assignColor(_sessionId, _userId) {
        const palette = [
            '#e06c75', '#61afef', '#98c379', '#c678dd',
            '#e5c07b', '#56b6c2', '#d19a66', '#be5046',
        ];
        const index = (this.rooms.size + Math.floor(Math.random() * palette.length)) % palette.length;
        return palette[index];
    }
    getRoomInfo(sessionId) {
        const room = this.rooms.get(sessionId);
        if (!room)
            return null;
        return {
            participantCount: room.participants.size,
            participants: this.serializeParticipants(room),
        };
    }
    getActiveSessions() {
        return [...this.rooms.entries()].map(([sessionId, room]) => ({
            sessionId,
            participantCount: room.participants.size,
            createdAt: room.createdAt,
        }));
    }
    closeRoom(sessionId) {
        const room = this.rooms.get(sessionId);
        if (!room)
            return false;
        for (const participant of room.participants.values()) {
            if (participant.ws && participant.ws.readyState === ws_1.WebSocket.OPEN) {
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
exports.collaborativeServer = globalThis[globalKey] ??
    (() => {
        const s = new CollaborativeServer();
        globalThis[globalKey] = s;
        return s;
    })();
function getCollabServer() {
    return exports.collaborativeServer;
}
function attachCollabServer(httpServer) {
    exports.collaborativeServer.attach(httpServer);
}
