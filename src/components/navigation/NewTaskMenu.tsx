'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, ChevronDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { newTaskOptions, tasksByCategory, categoryLabels } from '@/config/new-task-menu';
import { TaskCategory } from '@/types/navigation';

interface NewTaskMenuProps {
  isCollapsed?: boolean;
}

export function NewTaskMenu({ isCollapsed = false }: NewTaskMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleTaskSelect = (route: string) => {
    setIsOpen(false);
    router.push(route);
  };

  const getIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center gap-3 px-3 py-2 rounded-lg
          text-white bg-gradient-to-r from-purple-500 to-pink-500
          hover:from-purple-600 hover:to-pink-600
          transition-all duration-200
          ${isCollapsed ? 'justify-center' : 'justify-between'}
        `}
        title={isCollapsed ? 'New Task' : undefined}
      >
        <div className="flex items-center gap-3">
          <Plus className="w-5 h-5" />
          {!isCollapsed && <span className="text-sm font-medium">New Task</span>}
        </div>
        {!isCollapsed && (
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div
            className={`
              absolute z-50 mt-2 w-80 bg-gray-800 border border-gray-700
              rounded-lg shadow-2xl overflow-hidden
              ${isCollapsed ? 'left-full ml-2' : 'left-0'}
            `}
          >
            <div className="max-h-[80vh] overflow-y-auto">
              {/* Render tasks by category */}
              {(Object.keys(tasksByCategory) as TaskCategory[]).map((category) => {
                const tasks = tasksByCategory[category];
                if (tasks.length === 0) return null;

                return (
                  <div key={category}>
                    {/* Category Header */}
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-900/50">
                      {categoryLabels[category]}
                    </div>

                    {/* Tasks */}
                    {tasks.map((task) => {
                      const Icon = getIcon(task.icon);
                      
                      return (
                        <button
                          key={task.id}
                          onClick={() => !task.comingSoon && handleTaskSelect(task.route)}
                          disabled={task.comingSoon}
                          className={`
                            w-full flex items-start gap-3 px-3 py-3
                            hover:bg-gray-700 transition-colors text-left
                            ${task.comingSoon ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                        >
                          <Icon className="w-5 h-5 mt-0.5 text-purple-400 flex-shrink-0" />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">
                                {task.label}
                              </span>
                              {task.badge && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-purple-500/20 text-purple-300">
                                  {task.badge}
                                </span>
                              )}
                              {task.comingSoon && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-gray-700 text-gray-400">
                                  Soon
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {task.description}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
