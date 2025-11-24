import React, { useEffect, useRef } from 'react';
import { CommandLineIcon, BoltIcon, UserGroupIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

interface Command {
  name: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
}

interface CommandAutocompleteProps {
  query: string;
  onSelect: (command: string) => void;
  onClose: () => void;
  position?: { top?: number; bottom?: number };
}

const COMMANDS: Command[] = [
  // GitHub Actions
  {
    name: '/workflows',
    description: 'View and manage GitHub Actions workflows',
    category: 'GitHub Actions',
    icon: BoltIcon,
    shortcut: 'Cmd+Shift+W',
  },
  {
    name: '/actions',
    description: 'View recent workflow runs and logs',
    category: 'GitHub Actions',
    icon: BoltIcon,
  },

  // Team Collaboration
  {
    name: '/team',
    description: 'Manage team members and collaboration',
    category: 'Team Collaboration',
    icon: UserGroupIcon,
  },
  {
    name: '/collab',
    description: 'View PR comments and reviews',
    category: 'Team Collaboration',
    icon: UserGroupIcon,
  },

  // Issue Management
  {
    name: '/issues',
    description: 'Search and manage GitHub issues',
    category: 'Issue Management',
    icon: ExclamationCircleIcon,
  },
  {
    name: '/bugs',
    description: 'View open bugs and critical issues',
    category: 'Issue Management',
    icon: ExclamationCircleIcon,
  },

  // Repository
  {
    name: '/repos',
    description: 'Switch active repository',
    category: 'Repository',
    icon: CommandLineIcon,
    shortcut: 'Cmd+R',
  },
];

export default function CommandAutocomplete({
  query,
  onSelect,
  onClose,
  position,
}: CommandAutocompleteProps) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter commands based on query
  const filteredCommands = COMMANDS.filter((cmd) =>
    cmd.name.toLowerCase().includes(query.toLowerCase())
  );

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) {
      acc[cmd.category] = [];
    }
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          onSelect(filteredCommands[selectedIndex].name);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredCommands, onSelect, onClose]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (filteredCommands.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="absolute left-0 right-0 z-50 mx-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden"
      style={position}
    >
      <div className="max-h-96 overflow-y-auto">
        {Object.entries(groupedCommands).map(([category, commands]) => (
          <div key={category}>
            {/* Category Header */}
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
              {category}
            </div>

            {/* Commands in Category */}
            {commands.map((cmd, index) => {
              const globalIndex = filteredCommands.indexOf(cmd);
              const isSelected = globalIndex === selectedIndex;
              const Icon = cmd.icon;

              return (
                <button
                  key={cmd.name}
                  onClick={() => onSelect(cmd.name)}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                  className={`w-full flex items-start gap-3 px-3 py-3 text-left transition-colors ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                      isSelected
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isSelected
                            ? 'text-blue-900 dark:text-blue-100'
                            : 'text-gray-900 dark:text-gray-100'
                        }`}
                      >
                        {cmd.name}
                      </span>
                      {cmd.shortcut && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                          {cmd.shortcut}
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-0.5 ${
                        isSelected
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {cmd.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <span>↑↓ Navigate • Enter/Tab Select • Esc Close</span>
      </div>
    </div>
  );
}
