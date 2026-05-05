'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import {
  Room,
  RoomEvent,
  Track,
  ConnectionState,
} from 'livekit-client';
import { Mic, MicOff, Phone, PhoneOff, Loader2 } from 'lucide-react';

interface VoiceConversationProps {
  userId: string;
  onTranscript?: (text: string) => void;
}

function VoiceControls() {
  const [isMuted, setIsMuted] = useState(false);
  const roomRef = useRef<Room | null>(null);

  const toggleMute = useCallback(async () => {
    const room = roomRef.current;
    if (!room?.localParticipant) return;

    const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone);
    if (micPub?.track) {
      if (isMuted) {
        await micPub.track.unmute();
      } else {
        await micPub.track.mute();
      }
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  return (
    <div className="flex items-center gap-3">
      <RoomAudioRenderer />
      <button
        onClick={toggleMute}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          isMuted
            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
            : 'bg-green-500/20 text-green-400 border border-green-500/30'
        }`}
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>
      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
    </div>
  );
}

export default function LiveKitVoiceConversation({
  userId,
  onTranscript,
}: VoiceConversationProps) {
  const [token, setToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch('/api/voice/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to create room');
      setToken(json.token);
      setLivekitUrl(json.livekitUrl);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const handleConnected = useCallback(() => setIsConnected(true), []);
  const handleDisconnected = useCallback(() => {
    setIsConnected(false);
    setToken(null);
    setLivekitUrl(null);
  }, []);

  const disconnect = useCallback(() => {
    setToken(null);
    setLivekitUrl(null);
    setIsConnected(false);
  }, []);

  if (token && livekitUrl) {
    return (
      <LiveKitRoom
        serverUrl={livekitUrl}
        token={token}
        connect={true}
        audio={true}
        video={false}
        onConnected={handleConnected}
        onDisconnected={handleDisconnected}
        options={{
          adaptiveStream: true,
          dynacast: true,
        }}
      >
        <VoiceControls />
      </LiveKitRoom>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={isConnected ? disconnect : connect}
        disabled={isConnecting}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
          isConnected
            ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
            : 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30'
        } disabled:opacity-50`}
      >
        {isConnecting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isConnected ? (
          <PhoneOff className="w-4 h-4" />
        ) : (
          <Phone className="w-4 h-4" />
        )}
        {isConnecting ? 'Connecting...' : isConnected ? 'End Call' : 'Voice Call'}
      </button>
      {error && <span className="text-red-400 text-xs">{error}</span>}
    </div>
  );
}
