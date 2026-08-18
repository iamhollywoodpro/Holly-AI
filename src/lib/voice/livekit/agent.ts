/**
 * HOLLY LiveKit Voice Agent — NVIDIA Magpie TTS via WebRTC
 *
 * Architecture:
 *   1. User speaks → browser captures audio via LiveKit WebRTC
 *   2. Audio → transcribed via Groq Whisper (existing /api/voice/transcribe)
 *   3. Transcript → LLM chat (existing /api/chat)
 *   4. LLM response text → NVIDIA Magpie TTS (VoxCPM2 removed 2026-08-12)
 *   5. Magpie audio → streamed back to LiveKit room as agent audio
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
import { synthesizeWithNvidia, isNvidiaTTSAvailable } from '../nvidia-tts-client';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || 'devkey';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || 'devsecret';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://livekit:7880';

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
  if (!isNvidiaTTSAvailable()) {
    console.warn('[LiveKit Agent] NVIDIA_API_KEY not configured');
    return null;
  }

  const cleanedText = text
    .replace(/\[laugh\]|\[chuckle\]|\[sigh\]|\[gasp\]|\[clears throat\]/gi, '')
    .replace(/\*[^*]+\*/g, '')
    .trim();

  if (!cleanedText) return null;

  try {
    const result = await synthesizeWithNvidia({
      text: cleanedText,
      style: 'Neutral',
    });
    return result?.audioBuffer ?? null;
  } catch (err) {
    console.error('[LiveKit Agent] NVIDIA Magpie synthesis failed:', err);
    return null;
  }
}

export function getLiveKitUrl(): string {
  return LIVEKIT_URL;
}

export function isLiveKitConfigured(): boolean {
  return !!(LIVEKIT_API_KEY && LIVEKIT_API_SECRET);
}
