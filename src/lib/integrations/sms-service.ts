/**
 * SMS Integration Service
 * Phase 8.5.3 — Send/receive SMS via Twilio
 *
 * Holly can text proactive insights and reminders.
 * Two-way conversation via SMS.
 */

export interface SMSMessage {
  to: string;
  body: string;
  mediaUrl?: string[];
}

export interface SMSResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER || '';

/**
 * Send an SMS via Twilio API
 */
export async function sendSMS(sms: SMSMessage): Promise<SMSResult> {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return { sent: false, error: 'Twilio credentials not configured' };
  }

  try {
    const params: Record<string, string> = {
      To: sms.to,
      From: TWILIO_PHONE_NUMBER,
      Body: sms.body,
    };

    if (sms.mediaUrl && sms.mediaUrl.length > 0) {
      params.MediaUrl = sms.mediaUrl[0]; // Twilio supports one media URL per message
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(params),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { sent: false, error: `Twilio API error: ${error}` };
    }

    const data = await response.json();
    return { sent: true, messageId: data.sid };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Send a proactive insight via SMS
 */
export async function sendInsightSMS(
  phoneNumber: string,
  insight: string
): Promise<SMSResult> {
  // Truncate to SMS-friendly length (160 chars max for standard SMS, 1600 for long)
  const body = `✨ HOLLY Insight:\n\n${insight.substring(0, 300)}${insight.length > 300 ? '...' : ''}`;
  return sendSMS({ to: phoneNumber, body });
}

/**
 * Send a reminder via SMS
 */
export async function sendReminderSMS(
  phoneNumber: string,
  reminder: string,
  when?: string
): Promise<SMSResult> {
  const body = when
    ? `⏰ HOLLY Reminder (${when}):\n\n${reminder}`
    : `⏰ HOLLY Reminder:\n\n${reminder}`;
  return sendSMS({ to: phoneNumber, body });
}

/**
 * Parse incoming SMS webhook from Twilio
 */
export function parseIncomingSMS(formData: FormData): {
  from: string;
  to: string;
  body: string;
  messageSid: string;
  mediaUrls: string[];
} {
  return {
    from: formData.get('From') as string || '',
    to: formData.get('To') as string || '',
    body: formData.get('Body') as string || '',
    messageSid: formData.get('MessageSid') as string || '',
    mediaUrls: formData.get('NumMedia') === '1'
      ? [formData.get('MediaUrl0') as string]
      : [],
  };
}

/**
 * Get SMS service status
 */
export function getSMSStatus(): { configured: boolean; provider: string; phoneNumber: string } {
  return {
    configured: !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER),
    provider: 'Twilio',
    phoneNumber: TWILIO_PHONE_NUMBER || 'not configured',
  };
}
