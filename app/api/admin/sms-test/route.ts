/**
 * /api/admin/sms-test — SMS Diagnostic Endpoint
 *
 * Allows the creator (Steve) to test the full SMS pipeline from the browser.
 * Returns detailed diagnostic info about Twilio config, credential validity,
 * and the actual send attempt result.
 *
 * GET  → Returns config status (does NOT send an SMS)
 * POST → Sends a test SMS to CREATOR_PHONE
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { sendSMS, getSMSStatus } from '@/lib/integrations/sms-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Gather all SMS-related env vars (mask sensitive values)
    const twilioSid = process.env.TWILIO_ACCOUNT_SID || '';
    const twilioToken = process.env.TWILIO_AUTH_TOKEN || '';
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER || '';
    const creatorPhone = process.env.CREATOR_PHONE || '';
    const cronSecret = process.env.CRON_SECRET || '';

    const masked = (val: string, show = 4) =>
      val.length > show ? `${val.slice(0, show)}${'*'.repeat(Math.min(val.length - show, 12))}` : '(empty)';

    const diagnostics = {
      twilioConfigured: !!(twilioSid && twilioToken && twilioPhone),
      envVars: {
        TWILIO_ACCOUNT_SID:  twilioSid ? `✅ Set (${masked(twilioSid)})` : '❌ NOT SET',
        TWILIO_AUTH_TOKEN:   twilioToken ? `✅ Set (${masked(twilioToken)}):` : '❌ NOT SET',
        TWILIO_PHONE_NUMBER: twilioPhone || '❌ NOT SET',
        CREATOR_PHONE:       creatorPhone || '❌ NOT SET',
      },
      cronConfig: {
        CRON_SECRET: cronSecret ? `✅ Set (${masked(cronSecret)})` : '❌ NOT SET',
        note: 'Cron container must be running in Coolify for scheduled SMS',
      },
      smsServiceStatus: getSMSStatus(),
      recommendations: [] as string[],
    };

    // Build recommendations
    if (!twilioSid) diagnostics.recommendations.push('Set TWILIO_ACCOUNT_SID in Coolify environment');
    if (!twilioToken) diagnostics.recommendations.push('Set TWILIO_AUTH_TOKEN in Coolify environment');
    if (!twilioPhone) diagnostics.recommendations.push('Set TWILIO_PHONE_NUMBER in Coolify environment (your Twilio number)');
    if (!creatorPhone) diagnostics.recommendations.push('Set CREATOR_PHONE in Coolify environment (your phone in +1XXXXXXXXXX format)');
    if (diagnostics.recommendations.length === 0) {
      diagnostics.recommendations.push('All env vars configured — POST to this endpoint to send a test SMS');
    }

    return NextResponse.json(diagnostics);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await auth();
    if (!authResult.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const creatorPhone = process.env.CREATOR_PHONE;
    if (!creatorPhone) {
      return NextResponse.json({
        success: false,
        error: 'CREATOR_PHONE env var not set — cannot determine SMS recipient',
        hint: 'Add CREATOR_PHONE to Coolify environment (format: +1XXXXXXXXXX)',
      });
    }

    // Validate Twilio config
    const status = getSMSStatus();
    if (!status.configured) {
      return NextResponse.json({
        success: false,
        error: 'Twilio not fully configured',
        details: `Missing one or more: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER`,
        smsStatus: status,
      });
    }

    // Send test SMS
    const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York' });
    const result = await sendSMS({
      to: creatorPhone,
      body: `🧪 Holly SMS Test — ${timestamp}\n\nIf you received this, Twilio integration is working! 💚`,
    });

    return NextResponse.json({
      success: result.sent,
      messageId: result.messageId,
      error: result.error,
      sentTo: creatorPhone,
      timestamp,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 });
  }
}
