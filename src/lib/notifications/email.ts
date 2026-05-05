import { logger } from "@/lib/monitoring/logger";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

/**
 * Send an email notification
 * This is a placeholder implementation that logs the email
 * In production, integrate with SendGrid, Resend, or similar service
 */
export async function sendEmail(options: EmailOptions): Promise<void> {
  const { to, subject, html, from = "HOLLY AI <noreply@nexamusicgroup.com>" } = options;

  // Log the email for now
  logger.info("Email notification", {
    to,
    subject,
    from,
    category: "notification",
  });

  // TODO: Integrate with actual email service
  // Example with Resend:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({ from, to, subject, html });

  // For development, just log
  if (process.env.NODE_ENV === "development") {
    console.log("📧 Email would be sent:");
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html.substring(0, 200)}...`);
  }
}

/**
 * Generate HTML email for PR notification
 */
export function generatePRNotificationEmail(
  userName: string,
  improvementTitle: string,
  improvementDescription: string,
  prUrl: string,
  dashboardUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HOLLY AI - New Improvement Ready for Review</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🧠 HOLLY AI</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Self-Improvement System</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      I've identified an improvement opportunity and created a pull request for your review:
    </p>

    <div style="background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px;">
      <h2 style="margin: 0 0 10px 0; font-size: 20px; color: #667eea;">${improvementTitle}</h2>
      <p style="margin: 0; color: #666; font-size: 14px;">${improvementDescription}</p>
    </div>

    <div style="margin: 30px 0;">
      <a href="${prUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-right: 10px;">View Pull Request</a>
      <a href="${dashboardUrl}" style="display: inline-block; background: white; color: #667eea; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; border: 2px solid #667eea;">Review Dashboard</a>
    </div>

    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <p style="margin: 0; font-size: 14px; color: #856404;">
        <strong>⚠️ Human Review Required:</strong> This change requires your approval before it can be merged and deployed.
      </p>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>HOLLY AI</strong><br>
      <em>Your Autonomous AI Assistant</em>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>This is an automated notification from HOLLY AI Self-Improvement System</p>
    <p>© ${new Date().getFullYear()} Nexa Music Group. All rights reserved.</p>
  </div>

</body>
</html>
  `.trim();
}

/**
 * Generate HTML email for improvement status update
 */
export function generateStatusUpdateEmail(
  userName: string,
  improvementTitle: string,
  status: string,
  message: string,
  dashboardUrl: string
): string {
  const statusEmoji = {
    approved: "✅",
    rejected: "❌",
    deployed: "🚀",
    failed: "⚠️",
  }[status] || "ℹ️";

  const statusColor = {
    approved: "#28a745",
    rejected: "#dc3545",
    deployed: "#667eea",
    failed: "#ffc107",
  }[status] || "#6c757d";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HOLLY AI - Improvement Status Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🧠 HOLLY AI</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Self-Improvement System</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hi ${userName},</p>
    
    <div style="background: white; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 5px;">
      <h2 style="margin: 0 0 10px 0; font-size: 20px; color: ${statusColor};">
        ${statusEmoji} ${improvementTitle}
      </h2>
      <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">
        <strong>Status:</strong> ${status.toUpperCase().replace("_", " ")}
      </p>
      <p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">${message}</p>
    </div>

    <div style="margin: 30px 0; text-align: center;">
      <a href="${dashboardUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Dashboard</a>
    </div>

    <p style="font-size: 14px; color: #666; margin-top: 30px;">
      Best regards,<br>
      <strong>HOLLY AI</strong><br>
      <em>Your Autonomous AI Assistant</em>
    </p>
  </div>

  <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
    <p>This is an automated notification from HOLLY AI Self-Improvement System</p>
    <p>© ${new Date().getFullYear()} Nexa Music Group. All rights reserved.</p>
  </div>

</body>
</html>
  `.trim();
}
