/**
 * Conversation Export Utility
 * Export conversations in various formats
 */

import type { Message } from '@/types/conversation';
import { format } from 'date-fns';

export type ExportFormat = 'markdown' | 'txt' | 'json' | 'html';

interface ExportOptions {
  title?: string;
  includeTimestamps?: boolean;
  includeMetadata?: boolean;
}

/**
 * Export conversation to specified format
 */
export async function exportConversation(
  messages: Message[],
  format: ExportFormat,
  options: ExportOptions = {}
): Promise<void> {
  const {
    title = 'HOLLY Conversation',
    includeTimestamps = true,
    includeMetadata = true,
  } = options;

  let content: string;
  let filename: string;
  let mimeType: string;

  switch (format) {
    case 'markdown':
      content = exportAsMarkdown(messages, title, includeTimestamps, includeMetadata);
      filename = `${sanitizeFilename(title)}.md`;
      mimeType = 'text/markdown';
      break;

    case 'txt':
      content = exportAsText(messages, title, includeTimestamps);
      filename = `${sanitizeFilename(title)}.txt`;
      mimeType = 'text/plain';
      break;

    case 'json':
      content = exportAsJSON(messages, title, includeMetadata);
      filename = `${sanitizeFilename(title)}.json`;
      mimeType = 'application/json';
      break;

    case 'html':
      content = exportAsHTML(messages, title, includeTimestamps);
      filename = `${sanitizeFilename(title)}.html`;
      mimeType = 'text/html';
      break;

    default:
      throw new Error(`Unsupported export format: ${format}`);
  }

  // Download file
  downloadFile(content, filename, mimeType);
}

/**
 * Export as Markdown
 */
function exportAsMarkdown(
  messages: Message[],
  title: string,
  includeTimestamps: boolean,
  includeMetadata: boolean
): string {
  let md = `# ${title}\n\n`;

  if (includeMetadata) {
    md += `**Exported:** ${format(new Date(), 'PPpp')}\n`;
    md += `**Messages:** ${messages.length}\n\n`;
    md += `---\n\n`;
  }

  messages.forEach((msg, index) => {
    const role = msg.role === 'user' ? '👤 You' : '🤖 HOLLY';
    md += `## ${role}\n\n`;

    if (includeTimestamps && msg.createdAt) {
      md += `*${format(new Date(msg.createdAt), 'PPpp')}*\n\n`;
    }

    md += `${msg.content}\n\n`;

    if (index < messages.length - 1) {
      md += `---\n\n`;
    }
  });

  return md;
}

/**
 * Export as plain text
 */
function exportAsText(
  messages: Message[],
  title: string,
  includeTimestamps: boolean
): string {
  let txt = `${title}\n${'='.repeat(title.length)}\n\n`;

  messages.forEach((msg) => {
    const role = msg.role === 'user' ? 'You' : 'HOLLY';
    txt += `[${role}]`;

    if (includeTimestamps && msg.createdAt) {
      txt += ` - ${format(new Date(msg.createdAt), 'PPpp')}`;
    }

    txt += `\n${msg.content}\n\n`;
  });

  return txt;
}

/**
 * Export as JSON
 */
function exportAsJSON(
  messages: Message[],
  title: string,
  includeMetadata: boolean
): string {
  const data: any = {
    messages: messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.createdAt,
    })),
  };

  if (includeMetadata) {
    data.metadata = {
      title,
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
    };
  }

  return JSON.stringify(data, null, 2);
}

/**
 * Export as HTML
 */
function exportAsHTML(
  messages: Message[],
  title: string,
  includeTimestamps: boolean
): string {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      background: #0A0A0F;
      color: #E5E7EB;
    }
    h1 {
      background: linear-gradient(135deg, #00F0FF 0%, #B026FF 50%, #FF006E 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 2rem;
    }
    .message {
      margin-bottom: 2rem;
      padding: 1.5rem;
      border-radius: 0.5rem;
      background: #13131A;
      border: 1px solid #2A2A3C;
    }
    .message.user {
      border-left: 3px solid #00F0FF;
    }
    .message.assistant {
      border-left: 3px solid #B026FF;
    }
    .role {
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #00F0FF;
    }
    .message.assistant .role {
      color: #B026FF;
    }
    .timestamp {
      font-size: 0.875rem;
      color: #6B7280;
      margin-bottom: 0.5rem;
    }
    .content {
      line-height: 1.6;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
`;

  messages.forEach((msg) => {
    const role = msg.role === 'user' ? 'You' : 'HOLLY';
    html += `  <div class="message ${msg.role}">
    <div class="role">${escapeHtml(role)}</div>
`;

    if (includeTimestamps && msg.createdAt) {
      html += `    <div class="timestamp">${format(new Date(msg.createdAt), 'PPpp')}</div>\n`;
    }

    html += `    <div class="content">${escapeHtml(msg.content)}</div>
  </div>
`;
  });

  html += `</body>
</html>`;

  return html;
}

/**
 * Sanitize filename
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9]/gi, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}

/**
 * Escape HTML
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Download file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
