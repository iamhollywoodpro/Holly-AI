'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface RemoteParticipant {
  userId: string;
  userName: string;
  color: string;
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

const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 15_000;
const RECONNECT_MAX_ATTEMPTS = 20;
const PING_INTERVAL_MS = 25_000;

interface CollabMessage {
  type: string;
  [key: string]: unknown;
}

interface UseCollaborativeSessionReturn {
  participants: RemoteParticipant[];
  sendMessage: (message: CollabMessage) => void;
  cursorPositions: Map<string, CursorPosition>;
  isConnected: boolean;
  sendCursorMove: (filePath: string, line: number, column: number) => void;
  sendSelectionChange: (filePath: string, startLine: number, startCol: number, endLine: number, endCol: number) => void;
  sendFileChange: (filePath: string, content: string) => void;
  error: string | null;
}

export function useCollaborativeSession(
  sessionId: string | null,
  userId: string | null,
  userName?: string,
): UseCollaborativeSessionReturn {
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [cursorPositions, setCursorPositions] = useState<Map<string, CursorPosition>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const opIdRef = useRef(0);

  const clearTimers = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (pingTimerRef.current) {
      clearInterval(pingTimerRef.current);
      pingTimerRef.current = null;
    }
  }, []);

  const getNextOpId = useCallback(() => {
    return ++opIdRef.current;
  }, []);

  const sendMessage = useCallback((message: CollabMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch {}
    }
  }, []);

  const sendCursorMove = useCallback((filePath: string, line: number, column: number) => {
    sendMessage({ type: 'cursor_move', filePath, line, column });
  }, [sendMessage]);

  const sendSelectionChange = useCallback(
    (filePath: string, startLine: number, startCol: number, endLine: number, endCol: number) => {
      sendMessage({ type: 'selection_change', filePath, startLine, startCol, endLine, endCol });
    },
    [sendMessage],
  );

  const sendFileChange = useCallback((filePath: string, content: string) => {
    const opId = getNextOpId();
    sendMessage({ type: 'file_change', filePath, content, opId });
  }, [sendMessage, getNextOpId]);

  const connect = useCallback(() => {
    if (!sessionId || !userId) return;
    if (!mountedRef.current) return;

    const wsProtocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
    const wsUrl = `${wsProtocol}//${host}/ws/collaborate?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      setError('Failed to create WebSocket');
      scheduleReconnect();
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;

      ws.send(JSON.stringify({
        type: 'join',
        sessionId,
        userId,
        userName: userName ?? userId,
      }));

      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(event.data) as Record<string, unknown>;
        handleMessage(msg);
      } catch {}
    };

    ws.onclose = (event) => {
      if (!mountedRef.current) return;
      setIsConnected(false);
      wsRef.current = null;
      clearTimers();

      if (event.code !== 1000 && event.code !== 1008) {
        scheduleReconnect();
      }
    };

    ws.onerror = () => {
      setError('WebSocket error');
    };
  }, [sessionId, userId, userName, clearTimers]);

  function scheduleReconnect() {
    if (!mountedRef.current) return;
    if (reconnectAttemptsRef.current >= RECONNECT_MAX_ATTEMPTS) {
      setError('Max reconnection attempts reached');
      return;
    }

    const attempt = reconnectAttemptsRef.current++;
    const delay = Math.min(RECONNECT_BASE_MS * Math.pow(2, attempt) + Math.random() * 500, RECONNECT_MAX_MS);

    reconnectTimerRef.current = setTimeout(() => {
      if (mountedRef.current) connect();
    }, delay);
  }

  function handleMessage(msg: Record<string, unknown>) {
    const type = msg.type as string;

    switch (type) {
      case 'joined': {
        const parts = (msg.participants as RemoteParticipant[]) ?? [];
        setParticipants(parts);
        setIsConnected(true);

        const cursors = new Map<string, CursorPosition>();
        for (const p of parts) {
          if (p.cursor) cursors.set(p.userId, p.cursor);
        }
        setCursorPositions(cursors);

        const recentOps = (msg.recentOps as Array<{ filePath: string; content: string; opId: number }>) ?? [];
        if (recentOps.length > 0) {
          const batchEvent = new CustomEvent('holly-collab-state-recovery', {
            detail: { operations: recentOps },
          });
          window.dispatchEvent(batchEvent);
        }
        break;
      }

      case 'participant_joined': {
        const participant = msg.participant as RemoteParticipant;
        if (!participant) break;
        setParticipants(prev => {
          const exists = prev.find(p => p.userId === participant.userId);
          if (exists) return prev.map(p => p.userId === participant.userId ? participant : p);
          return [...prev, participant];
        });
        break;
      }

      case 'participant_left': {
        const uid = msg.userId as string;
        setParticipants(prev => prev.filter(p => p.userId !== uid));
        setCursorPositions(prev => {
          const next = new Map(prev);
          next.delete(uid);
          return next;
        });
        break;
      }

      case 'participant_disconnected': {
        const uid = msg.userId as string;
        setParticipants(prev => prev.filter(p => p.userId !== uid));
        setCursorPositions(prev => {
          const next = new Map(prev);
          next.delete(uid);
          return next;
        });
        break;
      }

      case 'file_change': {
        const event = new CustomEvent('holly-collab-file-change', {
          detail: {
            userId: msg.userId as string,
            filePath: msg.filePath as string,
            content: msg.content as string,
            opId: msg.opId as number,
          },
        });
        window.dispatchEvent(event);
        break;
      }

      case 'cursor_move': {
        const uid = msg.userId as string;
        const cursor: CursorPosition = {
          filePath: msg.filePath as string,
          line: msg.line as number,
          column: msg.column as number,
        };
        setCursorPositions(prev => {
          const next = new Map(prev);
          next.set(uid, cursor);
          return next;
        });
        setParticipants(prev => prev.map(p =>
          p.userId === uid ? { ...p, cursor } : p,
        ));

        const cursorEvent = new CustomEvent('holly-collab-cursor', {
          detail: { userId: uid, cursor },
        });
        window.dispatchEvent(cursorEvent);
        break;
      }

      case 'selection_change': {
        const uid = msg.userId as string;
        const selection: SelectionRange = {
          filePath: msg.filePath as string,
          startLine: msg.startLine as number,
          startCol: msg.startCol as number,
          endLine: msg.endLine as number,
          endCol: msg.endCol as number,
        };
        setParticipants(prev => prev.map(p =>
          p.userId === uid ? { ...p, selection } : p,
        ));
        break;
      }

      case 'room_full': {
        setError((msg.message as string) ?? 'Room is full');
        break;
      }

      case 'error': {
        setError(msg.message as string);
        break;
      }

      case 'room_closed': {
        setError('Session ended by owner');
        setIsConnected(false);
        if (wsRef.current) wsRef.current.close(1000);
        break;
      }

      case 'pong':
        break;
    }
  }

  useEffect(() => {
    mountedRef.current = true;

    if (sessionId && userId) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      clearTimers();
      if (wsRef.current) {
        try { wsRef.current.close(1000); } catch {}
        wsRef.current = null;
      }
    };
  }, [sessionId, userId, connect, clearTimers]);

  return {
    participants,
    sendMessage,
    cursorPositions,
    isConnected,
    sendCursorMove,
    sendSelectionChange,
    sendFileChange,
    error,
  };
}
