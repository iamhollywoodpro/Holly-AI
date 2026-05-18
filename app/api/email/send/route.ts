/**
 * Email API Endpoint
 * Phase 8.5.1 — Send emails via Holly
 *
 * POST /api/email/send — Send an email
 * GET  /api/email/send — Get email service status
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendEmail, getEmailStatus } from '@/lib/integrations/email-service';

export async function POST(req: NextRequest) {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { to, subject, body: emailBody, html, replyTo, cc, bcc } = body;

    if (!to || !subject || !emailBody) {
      return NextResponse.json({ error: 'Missing required fields: to, subject, body' }, { status: 400 });
    }

    const result = await sendEmail({ to, subject, body: emailBody, html, replyTo, cc, bcc });

    if (result.sent) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(getEmailStatus());
}
