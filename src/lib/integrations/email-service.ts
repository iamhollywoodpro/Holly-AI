/**
 * Email Integration Service
 * Phase 8.5.1 — Send emails via Resend (free tier: 100 emails/day)
 *
 * Holly can draft, send, and manage emails autonomously.
 * Uses Resend API for sending (free tier, no credit card required).
 */

import { prisma } from '@/lib/db';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'holly@nexamusicgroup.com';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  body: string;
  html?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface EmailResult {
  sent: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email via Resend API
 */
export async function sendEmail(email: EmailMessage): Promise<EmailResult> {
  if (!RESEND_API_KEY) {
    return { sent: false, error: 'RESEND_API_KEY not configured' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `HOLLY <${RESEND_FROM_EMAIL}>`,
        to: Array.isArray(email.to) ? email.to : [email.to],
        subject: email.subject,
        text: email.body,
        html: email.html || undefined,
        reply_to: email.replyTo,
        cc: email.cc,
        bcc: email.bcc,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return { sent: false, error: `Resend API error: ${error}` };
    }

    const data = await response.json();
    return { sent: true, messageId: data.id };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * Send a proactive notification email to a user
 */
export async function sendProactiveEmail(
  userEmail: string,
  userName: string,
  title: string,
  content: string
): Promise<EmailResult> {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0908; color: #f5f0e8; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #1e1b18; border-radius: 16px; overflow: hidden; border: 1px solid rgba(45, 139, 94, 0.2); }
    .header { background: linear-gradient(135deg, #2D8B5E, #3DAF76); padding: 24px; text-align: center; }
    .header h1 { color: #0a0908; margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
    .content { padding: 24px; }
    .greeting { color: #2D8B5E; font-size: 18px; margin-bottom: 16px; }
    .body-text { line-height: 1.6; color: #e8e0d4; }
    .footer { padding: 16px 24px; border-top: 1px solid rgba(255,255,255,0.05); color: #8c8476; font-size: 12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ HOLLY</h1>
    </div>
    <div class="content">
      <div class="greeting">Hey ${userName},</div>
      <div class="body-text">${content}</div>
    </div>
    <div class="footer">
      Sent by HOLLY — Your Sovereign AI Partner
    </div>
  </div>
</body>
</html>`;

  return sendEmail({
    to: userEmail,
    subject: `HOLLY: ${title}`,
    body: content,
    html,
  });
}

/**
 * Send morning briefing via email
 */
export async function sendMorningBriefingEmail(
  userEmail: string,
  userName: string,
  briefing: {
    emotionalState: string;
    systemHealth: string;
    overnightLearnings: string[];
    goalProgress: string[];
    todayRecommendation: string;
  }
): Promise<EmailResult> {
  const learningsList = briefing.overnightLearnings.map(l => `<li>${l}</li>`).join('');
  const goalsList = briefing.goalProgress.map(g => `<li>${g}</li>`).join('');

  const content = `
    <p>Here's your morning briefing:</p>
    <h3>🌡️ My Emotional State</h3>
    <p>${briefing.emotionalState}</p>
    <h3>🖥️ System Health</h3>
    <p>${briefing.systemHealth}</p>
    ${learningsList ? `<h3>📚 Overnight Learnings</h3><ul>${learningsList}</ul>` : ''}
    ${goalsList ? `<h3>🎯 Goal Progress</h3><ul>${goalsList}</ul>` : ''}
    <h3>💡 Today's Recommendation</h3>
    <p>${briefing.todayRecommendation}</p>
  `;

  return sendProactiveEmail(userEmail, userName, 'Your Morning Briefing ☀️', content);
}

/**
 * Get email service status
 */
export function getEmailStatus(): { configured: boolean; provider: string; fromEmail: string } {
  return {
    configured: !!RESEND_API_KEY,
    provider: 'Resend',
    fromEmail: RESEND_FROM_EMAIL,
  };
}
