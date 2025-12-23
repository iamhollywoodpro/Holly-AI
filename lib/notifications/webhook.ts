import { logger } from "@/lib/monitoring/logger";

export interface WebhookMessage {
  title: string;
  description: string;
  color?: string;
  url?: string;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
}

/**
 * Send notification to Slack webhook
 */
export async function sendSlackNotification(message: WebhookMessage): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    logger.warn("Slack webhook URL not configured");
    return;
  }

  try {
    const payload = {
      text: message.title,
      attachments: [
        {
          color: message.color || "#667eea",
          title: message.title,
          text: message.description,
          fields: message.fields,
          ...(message.url && { title_link: message.url }),
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }

    logger.info("Slack notification sent", {
      title: message.title,
      category: "notification",
    });
  } catch (error) {
    logger.error("Failed to send Slack notification", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Send notification to Discord webhook
 */
export async function sendDiscordNotification(message: WebhookMessage): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    logger.warn("Discord webhook URL not configured");
    return;
  }

  try {
    const payload = {
      embeds: [
        {
          title: message.title,
          description: message.description,
          color: parseInt(message.color?.replace("#", "") || "6772EA", 16),
          url: message.url,
          fields: message.fields,
          timestamp: new Date().toISOString(),
          footer: {
            text: "HOLLY AI Self-Improvement System",
          },
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.statusText}`);
    }

    logger.info("Discord notification sent", {
      title: message.title,
      category: "notification",
    });
  } catch (error) {
    logger.error("Failed to send Discord notification", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Send notification to all configured webhooks
 */
export async function sendWebhookNotifications(message: WebhookMessage): Promise<void> {
  await Promise.allSettled([
    sendSlackNotification(message),
    sendDiscordNotification(message),
  ]);
}

/**
 * Generate webhook message for PR creation
 */
export function generatePRWebhookMessage(
  improvementTitle: string,
  improvementDescription: string,
  prUrl: string,
  riskLevel: string
): WebhookMessage {
  const riskColors: Record<string, string> = {
    low: "#28a745",
    medium: "#ffc107",
    high: "#dc3545",
  };

  return {
    title: `🧠 New Improvement: ${improvementTitle}`,
    description: improvementDescription,
    color: riskColors[riskLevel.toLowerCase()] || "#667eea",
    url: prUrl,
    fields: [
      { name: "Risk Level", value: riskLevel.toUpperCase(), inline: true },
      { name: "Status", value: "Pending Review", inline: true },
    ],
  };
}

/**
 * Generate webhook message for status update
 */
export function generateStatusWebhookMessage(
  improvementTitle: string,
  status: string,
  message: string
): WebhookMessage {
  const statusEmojis: Record<string, string> = {
    approved: "✅",
    rejected: "❌",
    deployed: "🚀",
    failed: "⚠️",
  };

  const statusColors: Record<string, string> = {
    approved: "#28a745",
    rejected: "#dc3545",
    deployed: "#667eea",
    failed: "#ffc107",
  };

  const emoji = statusEmojis[status] || "ℹ️";
  const color = statusColors[status] || "#6c757d";

  return {
    title: `${emoji} ${improvementTitle}`,
    description: message,
    color,
    fields: [
      { name: "Status", value: status.toUpperCase().replace("_", " "), inline: true },
    ],
  };
}
