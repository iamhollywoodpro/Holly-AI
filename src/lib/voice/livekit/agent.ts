/**
 * HOLLY LiveKit Voice Agent — VoxCPM2 TTS via WebRTC
 *
 * Architecture:
 *   1. User speaks → browser captures audio via LiveKit WebRTC
 *   2. Audio → transcribed via Groq Whisper (existing /api/voice/transcribe)
 *   3. Transcript → LLM chat (existing /api/chat)
 *   4. LLM response text → VoxCPM2 TTS (Modal endpoint)
 *   5. VoxCPM2 audio → streamed back to LiveKit room as agent audio
 *   6. User hears HOLLY's voice with near-zero latency
 *
 * VAD (Voice Activity Detection):
 *   - Uses @livekit/components-react built-in VAD
 *   - User can interrupt HOLLY mid-sentence
 *   - When VAD detects user speech during HOLLY's response, playback stops
 */

import type { AccessTokenOptions, VideoGrant } from 'livekit-server-sdk';
import { AccessToken } from 'livekit-server-sdk';
import { randomUUID } from 'crypto';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecret';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://livekit:7880';
const VOXCPM2_URL = process.env.VOXCPM2_TTS_URL;

export interface VoiceRoomConfig {
  roomName: string;
  userToken: string;
  agentToken: string;
  livekitUrl: string;
}

export async function createVoiceRoom(userId: string): Promise<VoiceRoomConfig> {
  const roomName = `holly-${userId.substring(0, 12)}-${Date.now()}`;

  const userToken = await createToken(roomName, userId.substring(0, 20), false);
  const agentToken = await createToken(roomName, 'holly-agent', true);

  return { roomName, userToken, agentToken, livekitUrl: LIVEKIT_URL };
}

async function createToken(room: string, identity: string, isAgent: boolean): Promise<string> {
  const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    name: isAgent ? 'HOLLY' : identity,
  });

  const grant: VideoGrant = {
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  };

  token.addGrant(grant);
  return token.toJwt();
}

export async function synthesizeForStream(text: string): Promise<Buffer | null> {
  if (!VOXCPM2_URL) {
    console.warn('[LiveKit Agent] VOXCPM2_TTS_URL not configured');
    return null;
  }

  const cleanedText = text
    .replace(/\[laugh\]|\[chuckle\]|\[sigh\]|\[gasp\]|\[clears throat\]/gi, '')
    .replace(/\*[^*]+\*/g, '')
    .trim();

  if (!cleanedText) return null;

  try {
    const response = await fetch(VOXCPM2_URL.replace(/\/$/, ''), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanedText,
        style_guidance: process.env.VOXCPM2_STYLE_GUIDANCE || 'natural, warm, confident',
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) return null;

    const arrayBuf = await response.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch (err) {
    console.error('[LiveKit Agent] VoxCPM2 synthesis failed:', err);
    return null;
  }
}

export function getLiveKitUrl(): string {
  return LIVEKIT_URL;
}

export function isLiveKitConfigured(): boolean {
  return !!(LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}
