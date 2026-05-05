'use client';

import { motion } from 'framer-motion';
import { 
  PlusIcon, 
  CodeBracketIcon, 
  RocketLaunchIcon,
  BugAntIcon 
} from '@heroicons/react/24/outline';

interface QuickAction {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  color: string;
}

interface QuickActionsBarProps {
  onNewChat: () => void;
  onOpenRepos: () => void;
  onOpenIssues: () => void;
  onToggleDebug: () => void;
}

export default function QuickActionsBar({
  onNewChat,
  onOpenRepos,
  onOpenIssues,
  onToggleDebug
}: QuickActionsBarProps) {
  const actions: QuickAction[] = [
    {
      icon: PlusIcon,
      label: 'New Chat',
      onClick: onNewChat,
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: CodeBracketIcon,
      label: 'Repositories',
      onClick: onOpenRepos,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: BugAntIcon,
      label: 'Issues',
      onClick: onOpenIssues,
      color: 'from-orange-500 to-red-500'
    },
    {
      icon: RocketLaunchIcon,
      label: 'Deploy',
      onClick: () => {}, // TODO: Connect to deploy dialog
      color: 'from-green-500 to-emerald-500'
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="hidden fixed bottom-20 right-4 sm:right-8 z-40 flex-col gap-2" // HIDDEN: User requested removal from UI
    >
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={action.onClick}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`group relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-full bg-gradient-to-br ${action.color} shadow-lg hover:shadow-xl transition-all`}
            title={action.label}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            
            {/* Tooltip on hover */}
            <div className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
              {action.label}
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}
