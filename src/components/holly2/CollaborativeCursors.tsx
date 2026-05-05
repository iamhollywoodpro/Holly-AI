'use client';

import { useEffect, useRef, useMemo } from 'react';
import { useCollaborativeSession, type RemoteParticipant, type CursorPosition } from '@/lib/builder/collaborative-client';

interface CollaborativeCursorsProps {
  sessionId: string;
  userId: string;
  userName?: string;
  editorContainerRef?: React.RefObject<HTMLDivElement | null>;
}

const PARTICIPANT_COLORS = [
  '#e06c75', '#61afef', '#98c379', '#c678dd',
  '#e5c07b', '#56b6c2', '#d19a66', '#be5046',
];

function CursorLabel({ participant, containerRect }: {
  participant: RemoteParticipant;
  containerRect: DOMRect | null;
}) {
  if (!participant.cursor || !containerRect) return null;

  const lineHeight = 20;
  const charWidth = 7.8;
  const top = containerRect.top + participant.cursor.line * lineHeight;
  const left = containerRect.left + participant.cursor.column * charWidth;

  return (
    <div
      className="pointer-events-none fixed z-[9999] transition-all duration-75"
      style={{ top, left }}
    >
      <div
        className="w-0.5 h-5 rounded-sm"
        style={{ backgroundColor: participant.color }}
      />
      <div
        className="absolute top-[-18px] left-0 px-1.5 py-0.5 rounded text-[10px] font-medium text-white whitespace-nowrap shadow-lg"
        style={{ backgroundColor: participant.color }}
      >
        {participant.userName}
      </div>
    </div>
  );
}

function SelectionHighlight({ participant, containerRect }: {
  participant: RemoteParticipant;
  containerRect: DOMRect | null;
}) {
  if (!participant.selection || !containerRect) return null;

  const lineHeight = 20;
  const charWidth = 7.8;
  const { startLine, startCol, endLine, endCol } = participant.selection;

  const lines: React.ReactNode[] = [];
  for (let line = startLine; line <= endLine; line++) {
    const colStart = line === startLine ? startCol : 0;
    const colEnd = line === endLine ? endCol : 200;
    const top = containerRect.top + line * lineHeight;
    const left = containerRect.left + colStart * charWidth;
    const width = (colEnd - colStart) * charWidth;

    lines.push(
      <div
        key={line}
        className="pointer-events-none fixed z-[9998]"
        style={{
          top,
          left,
          width,
          height: lineHeight,
          backgroundColor: participant.color,
          opacity: 0.15,
          borderRadius: 2,
        }}
      />
    );
  }

  return <>{lines}</>;
}

export function CollaborativeCursors({ sessionId, userId, userName, editorContainerRef }: CollaborativeCursorsProps) {
  const {
    participants,
    cursorPositions,
    isConnected,
    sendCursorMove,
    error,
  } = useCollaborativeSession(sessionId, userId, userName);

  const containerRectRef = useRef<DOMRect | null>(null);

  useEffect(() => {
    const updateRect = () => {
      if (editorContainerRef?.current) {
        containerRectRef.current = editorContainerRef.current.getBoundingClientRect();
      }
    };
    updateRect();
    const interval = setInterval(updateRect, 1000);
    return () => clearInterval(interval);
  }, [editorContainerRef]);

  const remoteParticipants = useMemo(
    () => participants.filter(p => p.userId !== userId),
    [participants, userId],
  );

  return (
    <>
      {remoteParticipants.map(p => (
        <CursorLabel key={p.userId} participant={p} containerRect={containerRectRef.current} />
      ))}
      {remoteParticipants.map(p => (
        <SelectionHighlight key={`sel-${p.userId}`} participant={p} containerRect={containerRectRef.current} />
      ))}
    </>
  );
}

export function CollaborationParticipantList({ sessionId, userId, userName }: {
  sessionId: string;
  userId: string;
  userName?: string;
}) {
  const { participants, isConnected, error } = useCollaborativeSession(sessionId, userId, userName);

  if (!isConnected && participants.length === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1">
      <div className="flex items-center gap-0.5">
        {participants.map((p, i) => (
          <div
            key={p.userId}
            className="relative group"
            title={`${p.userName}${p.userId === userId ? ' (you)' : ''}`}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-white/10"
              style={{ backgroundColor: p.color ?? PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length] }}
            >
              {(p.userName ?? '?')[0].toUpperCase()}
            </div>
            {p.userId !== userId && (
              <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full ring-1 ring-[#0d0d0f]" />
            )}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-[10px] text-gray-200 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
              {p.userName}{p.userId === userId ? ' (you)' : ''}
            </div>
          </div>
        ))}
      </div>
      {isConnected && (
        <span className="text-[10px] text-green-400 ml-1">● live</span>
      )}
      {!isConnected && participants.length > 0 && (
        <span className="text-[10px] text-yellow-500 ml-1">● reconnecting</span>
      )}
      {error && (
        <span className="text-[10px] text-red-400 ml-1" title={error}>!</span>
      )}
    </div>
  );
}

export function CollaborationStatus({ sessionId, userId }: { sessionId: string; userId: string }) {
  const { participants, isConnected, error } = useCollaborativeSession(sessionId, userId);

  const count = participants.length;

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-gray-600'}`} />
      <span className="text-gray-500">
        {count} {count === 1 ? 'editor' : 'editors'}
        {!isConnected && ' (disconnected)'}
      </span>
      {error && (
        <span className="text-red-400" title={error}>!</span>
      )}
    </div>
  );
}
