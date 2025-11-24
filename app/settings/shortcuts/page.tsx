'use client';

export default function ShortcutsPage() {
  const shortcuts = [
    {
      category: 'General',
      items: [
        { key: '?', description: 'Show keyboard shortcuts' },
        { key: 'Ctrl + N', description: 'New conversation' },
        { key: 'Ctrl + /', description: 'Toggle chat history sidebar' },
        { key: 'Ctrl + M', description: 'Toggle memory timeline' },
        { key: 'Ctrl + K', description: 'Open command palette' },
        { key: 'Esc', description: 'Close dialogs/modals' },
      ],
    },
    {
      category: 'Chat',
      items: [
        { key: 'Enter', description: 'Send message (if enabled in settings)' },
        { key: 'Shift + Enter', description: 'New line in message' },
        { key: 'Ctrl + L', description: 'Clear current input' },
        { key: 'Ctrl + V', description: 'Paste (upload if file)' },
        { key: 'Ctrl + ↑', description: 'Edit last message' },
      ],
    },
    {
      category: 'Commands',
      items: [
        { key: '/repos', description: 'Open repository selector' },
        { key: '/issues', description: 'View GitHub issues' },
        { key: '/workflows', description: 'Manage GitHub Actions' },
        { key: '/deploy', description: 'Trigger deployment' },
        { key: '/team', description: 'Team collaboration' },
        { key: '/help', description: 'Show help documentation' },
      ],
    },
    {
      category: 'Navigation',
      items: [
        { key: 'Ctrl + 1-9', description: 'Jump to conversation by number' },
        { key: 'Ctrl + ←', description: 'Previous conversation' },
        { key: 'Ctrl + →', description: 'Next conversation' },
        { key: 'Alt + ↑', description: 'Scroll to top' },
        { key: 'Alt + ↓', description: 'Scroll to bottom' },
      ],
    },
    {
      category: 'Developer',
      items: [
        { key: 'Ctrl + Shift + D', description: 'Toggle debug mode' },
        { key: 'Ctrl + Shift + I', description: 'Open browser DevTools' },
        { key: 'Ctrl + Shift + L', description: 'View API logs' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Keyboard Shortcuts</h2>
        <p className="text-gray-400">Master HOLLY with these keyboard shortcuts</p>
      </div>

      {/* Info Box */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">⌨️</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-purple-300 mb-1">Pro Tip</div>
            <p className="text-xs text-gray-400">
              Press <kbd className="px-2 py-0.5 bg-gray-800 rounded text-purple-300">?</kbd> anywhere
              to quickly view shortcuts
            </p>
          </div>
        </div>
      </div>

      {/* Shortcuts List */}
      {shortcuts.map((section) => (
        <div key={section.category}>
          <h3 className="text-lg font-semibold text-white mb-3">{section.category}</h3>
          <div className="space-y-2">
            {section.items.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <span className="text-sm text-gray-300">{shortcut.description}</span>
                <kbd className="px-3 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-purple-300 font-mono">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Platform Note */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-center">
        <p className="text-xs text-gray-500">
          On macOS, use <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-400">⌘</kbd> instead
          of <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-400">Ctrl</kbd>
        </p>
      </div>

      {/* Customization Coming Soon */}
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">🚧</div>
          <div className="flex-1">
            <div className="text-sm font-medium text-yellow-300 mb-1">Coming Soon</div>
            <p className="text-xs text-gray-400">
              Custom keyboard shortcuts and personalized key bindings will be available in a future
              update
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
