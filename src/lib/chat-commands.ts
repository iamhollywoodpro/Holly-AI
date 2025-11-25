/**
 * Chat Command Parser for HOLLY
 * Handles special commands like /repos, /deploy, /clear
 */

export interface ChatCommand {
  type: 'repos' | 'deploy' | 'pr' | 'rollback' | 'workflows' | 'team' | 'issues' | 'browse' | 'commit' | 'clear' | 'help' | 'unknown';
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
    'pr': 'pr',
    'pull': 'pr',
    'pullrequest': 'pr',
    'rollback': 'rollback',
    'rb': 'rollback',
    'revert': 'rollback',
    'workflows': 'workflows',
    'workflow': 'workflows',
    'actions': 'workflows',
    'team': 'team',
    'collab': 'team',
    'collaboration': 'team',
    'issues': 'issues',
    'issue': 'issues',
    'bugs': 'issues',
    'browse': 'browse',
    'b': 'browse',
    'files': 'browse',
    'commit': 'commit',
    'commits': 'commit',
    'history': 'commit',
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

\`/pr\` or \`/pull\` - Pull Request Management
- \`/pr\` or \`/pr create\` - Create new PR from current branch
- \`/pr list\` - View all pull requests (open, closed, merged)
- \`/pr [branch]\` - Create PR from specific branch
- Auto-fill PR titles and descriptions from commits
- Requires active repository selection

\`/rollback\` or \`/rb\` - Deployment Rollback
- View deployment history
- One-click rollback to previous version
- Shows commit info and build time
- Production safety with confirmation

\`/workflows\` or \`/actions\` - GitHub Actions
- Monitor CI/CD workflows
- View workflow runs and status
- Trigger workflows manually
- Download workflow logs
- Cancel or rerun workflows

\`/team\` or \`/collab\` - Team Collaboration
- View team members and permissions
- Comment on PRs with @mentions
- Request code reviews
- Assign issues to teammates
- Team activity feed

\`/issues\` or \`/bugs\` - Issue Management
- Create issues with templates
- Search and filter issues
- Add labels and milestones
- Assign to team members
- Quick close actions

\`/browse\` or \`/b\` - File Browser & Viewer
- Browse repository files and folders
- Interactive file tree with search
- View file contents with syntax highlighting
- \`/browse owner/repo\` - Browse specific repository
- \`/browse\` - Browse current active repository
- Download files or open in GitHub

\`/commit\` or \`/commits\` - Commit History
- View commit history for your repository
- See detailed commit information
- View file changes and statistics
- Open commits in GitHub
- \`/commit\` - View commits for active repository
- Smart commit type indicators (feat, fix, docs, etc.)

\`/clear\` or \`/c\` - Clear chat history
- Clears all messages from current session
- Does not affect repository selection

\`/help\` or \`/h\` - Show this help message
- Displays all available commands

**Keyboard Shortcuts:**
- \`Ctrl+R\` / \`Cmd+R\` - Open repositories
- \`Ctrl+D\` / \`Cmd+D\` - Deploy
- \`Ctrl+P\` / \`Cmd+P\` - Create PR
- \`Ctrl+Enter\` - Send message
`.trim();
}

/**
 * Check if a keyboard event matches a command shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  command: 'repos' | 'deploy' | 'pr'
): boolean {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifierKey = isMac ? event.metaKey : event.ctrlKey;

  if (!modifierKey) return false;

  switch (command) {
    case 'repos':
      return event.key.toLowerCase() === 'r';
    case 'deploy':
      return event.key.toLowerCase() === 'd';
    case 'pr':
      return event.key.toLowerCase() === 'p';
    default:
      return false;
  }
}
