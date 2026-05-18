/**
 * LiveKit Voice Token Endpoint
 * Phase 8.6.1 — Generate LiveKit tokens for real-time voice
 *
 * POST /api/voice/livekit-token — Generate a LiveKit access token
 * GET  /api/voice/livekit-token — Check LiveKit configuration status
 *
 * Requires: LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL env vars
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { AccessToken } from 'livekit-server-sdk';

const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || '';
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || '';
const LIVEKIT_URL = process.env.LIVEKIT_URL || 'ws://localhost:7880';

export async function POST(req: NextRequest) {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!LIVEKIT_API_KEY || !LIVEKIT_API_SECRET) {
      return NextResponse.json({
        error: 'LiveKit not configured',
        hint: 'Set LIVEKIT_API_KEY and LIVEKIT_API_SECRET environment variables',
      }, { status: 503 });
    }

    const body = await req.json();
    const { roomName, participantName } = body;

    const room = roomName || `holly-voice-${Date.now()}`;
    const name = participantName || 'User';
    const identity = `user_${authResult.userId}`;

    // Use the official livekit-server-sdk to generate a properly signed JWT
    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
      name,
      ttl: '1h',
    });

    token.addGrant({
      room: room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const jwt = await token.toJwt();

    return NextResponse.json({
      token: jwt,
      url: LIVEKIT_URL,
      roomName: room,
      identity,
    });
  } catch (error) {
    console.error('[LiveKit Token] Error:', error);
    return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    configured: !!(LIVEKIT_API_KEY && LIVEKIT_API_SECRET),
    url: LIVEKIT_URL,
    provider: 'LiveKit',
    version: '1.11.0',
    features: [
      'real-time voice conversation',
      'voice activity detection',
      'interruption handling',
      'multi-participant rooms',
    ],
  });
}
