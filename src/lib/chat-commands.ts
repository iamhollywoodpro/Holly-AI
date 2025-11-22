/**
 * Chat Command Parser for HOLLY
 * Handles special commands like /repos, /deploy, /clear
 */

export interface ChatCommand {
  type: 'repos' | 'deploy' | 'clear' | 'help' | 'unknown';
  args: string[];
  rawCommand: string;
}

/**
 * Parse a message to detect if it's a command
 */
export function parseCommand(message: string): ChatCommand | null {
  const trimmed = message.trim();
  
  // Check if message starts with /
  if (!trimmed.startsWith('/')) {
    return null;
  }

  // Extract command and arguments
  const parts = trimmed.slice(1).split(/\s+/);
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1);

  // Map command names to types
  const commandMap: Record<string, ChatCommand['type']> = {
    'repos': 'repos',
    'repo': 'repos',
    'repositories': 'repos',
    'deploy': 'deploy',
    'd': 'deploy',
    'clear': 'clear',
    'c': 'clear',
    'help': 'help',
    'h': 'help',
  };

  const type = commandMap[commandName] || 'unknown';

  return {
    type,
    args,
    rawCommand: trimmed,
  };
}

/**
 * Get help text for all commands
 */
export function getCommandHelp(): string {
  return `
**Available Commands:**

\`/repos\` or \`/repo\` - Browse and select repositories
- Opens repository selector dialog
- Keyboard shortcut: Ctrl+R (Windows/Linux) or Cmd+R (Mac)

\`/deploy\` or \`/d\` - Deploy to Vercel
- Triggers deployment of current repository
- Shows deployment status in real-time
- Requires active repository selection

\`/clear\` or \`/c\` - Clear chat history
- Clears all messages from current session
- Does not affect repository selection

\`/help\` or \`/h\` - Show this help message
- Displays all available commands

**Keyboard Shortcuts:**
- \`Ctrl+R\` / \`Cmd+R\` - Open repositories
- \`Ctrl+D\` / \`Cmd+D\` - Deploy
- \`Ctrl+Enter\` - Send message
`.trim();
}

/**
 * Check if a keyboard event matches a command shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  command: 'repos' | 'deploy'
): boolean {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? event.metaKey : event.ctrlKey;

  if (!modifierKey) return false;

  switch (command) {
    case 'repos':
      return event.key.toLowerCase() === 'r';
    case 'deploy':
      return event.key.toLowerCase() === 'd';
    default:
      return false;
  }
}
