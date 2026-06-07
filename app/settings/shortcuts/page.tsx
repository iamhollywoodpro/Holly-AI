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
        <h2 className="text-2xl font-black text-[#F5F0E8] mb-2 uppercase tracking-widest">Neural Interaction Keys</h2>
        <p className="text-[#8C8476] text-xs font-medium uppercase tracking-[0.15em]">Master the sovereign interface with these tactical keystrokes</p>
      </div>

      {/* Info Box */}
      <div className="bg-[#66CCCC]/5 border border-[#66CCCC]/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-xl">⌨️</div>
          <div className="flex-1">
            <div className="text-[10px] font-black text-[#66CCCC] uppercase tracking-[0.2em] mb-2">Architectural Pro-Tip</div>
            <p className="text-[9px] text-[#66CCCC]/70 uppercase tracking-widest font-medium leading-relaxed">
              INITIALIZE THE SOVEREIGN VIEWPORT COMMANDER BY PRESSING <kbd className="px-2.5 py-0.5 bg-[#0A0908] border border-[#66CCCC]/30 rounded text-[#66CCCC] font-black mx-1">?</kbd> ANYWHERE WITHIN THE GRID.
            </p>
          </div>
        </div>
      </div>

      {/* Shortcuts List */}
      <div className="space-y-10">
        {shortcuts.map((section) => (
          <div key={section.category}>
            <h3 className="text-[10px] font-black text-[#66CCCC] uppercase tracking-[0.3em] mb-4 border-b border-white/5 pb-2">{section.category} Protocols</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {section.items.map((shortcut) => (
                <div
                  key={shortcut.key}
                  className="flex items-center justify-between px-6 py-4 bg-[#1E1B18] border border-white/5 rounded-2xl hover:border-[#66CCCC]/20 transition-all duration-300 group"
                >
                  <span className="text-[11px] font-black text-[#F5F0E8] uppercase tracking-widest group-hover:text-[#66CCCC] transition-colors">{shortcut.description}</span>
                  <kbd className="px-3 py-1 bg-[#0A0908] border border-white/10 rounded-xl text-[9px] text-[#66CCCC] font-black uppercase tracking-tighter shadow-inner">
                    {shortcut.key}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Platform Note */}
      <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 text-center">
        <p className="text-xs text-gray-500">
          On macOS, use <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-400">⌘</kbd> instead
          of <kbd className="px-2 py-0.5 bg-gray-800 rounded text-gray-400">Ctrl</kbd>
        </p>
      </div>

      {/* Customization Coming Soon */}
      <div className="bg-[#66CCCC]/5 border border-[#66CCCC]/20 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-xl">🧬</div>
          <div className="flex-1">
            <div className="text-[10px] font-black text-[#66CCCC] uppercase tracking-[0.2em] mb-2">Emerging Capabilities</div>
            <p className="text-[9px] text-[#66CCCC]/70 uppercase tracking-widest font-medium leading-relaxed">
              NEURAL BINDING CUSTOMIZATION IS CURRENTLY UNDERGOING ARCHITECTURAL SYNC. PERSONALIZED TACTICAL MAPPINGS WILL BE INITIALIZED IN A FUTURE GRID CYCLE.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
