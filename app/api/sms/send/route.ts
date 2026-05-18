/**
 * SMS API Endpoint
 * Phase 8.5.3 — Send SMS via Twilio
 *
 * POST /api/sms/send — Send an SMS
 * GET  /api/sms/send — Get SMS service status
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendSMS, getSMSStatus } from '@/lib/integrations/sms-service';

export async function POST(req: NextRequest) {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { to, message, mediaUrl } = body;

    if (!to || !message) {
      return NextResponse.json({ error: 'Missing required fields: to, message' }, { status: 400 });
    }

    const result = await sendSMS({ to, body: message, mediaUrl });

    if (result.sent) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send SMS' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(getSMSStatus());
}
