'use client';

import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

interface Conversation {
  id: string;
  title: string;
  messageCount: number;
  updatedAt: Date;
}

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onOpenMemory?: () => void;
  onOpenSettings?: () => void;
}

export function MobileMenu({
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  onSelectConversation,
  onNewChat,
  onOpenMemory,
  onOpenSettings
}: MobileMenuProps) {
  
  // Group conversations by time
  const groupConversations = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const groups = {
      today: [] as Conversation[],
      yesterday: [] as Conversation[],
      thisWeek: [] as Conversation[],
      older: [] as Conversation[]
    };

    conversations.forEach(conv => {
      const convDate = new Date(conv.updatedAt);
      if (convDate >= today) {
        groups.today.push(conv);
      } else if (convDate >= yesterday) {
        groups.yesterday.push(conv);
      } else if (convDate >= lastWeek) {
        groups.thisWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  };

  const groups = groupConversations();

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
        {/* Backdrop */}
        <Transition.Child
          as={Fragment}
          enter="transition-opacity ease-linear duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity ease-linear duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
        </Transition.Child>

        {/* Menu Panel */}
        <div className="fixed inset-0 flex">
          <Transition.Child
            as={Fragment}
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <Dialog.Panel className="relative flex w-full max-w-xs flex-col bg-gray-950 border-r border-gray-800">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <Dialog.Title className="text-lg font-semibold text-white">
                  Menu
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto">
                {/* New Chat Button */}
                <div className="p-3 border-b border-gray-800">
                  <button
                    onClick={() => {
                      onNewChat();
                      onClose();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Chat
                  </button>
                </div>

                {/* Chat History */}
                <div className="p-3 space-y-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    Chat History
                  </div>

                  {/* Today */}
                  {groups.today.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2">Today</div>
                      <div className="space-y-1">
                        {groups.today.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => {
                              onSelectConversation(conv.id);
                              onClose();
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                              currentConversationId === conv.id
                                ? 'bg-purple-500/20 border border-purple-500/30'
                                : 'hover:bg-gray-800'
                            }`}
                          >
                            <div className="text-sm text-white truncate">{conv.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {conv.messageCount} messages · {formatTime(conv.updatedAt)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Yesterday */}
                  {groups.yesterday.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2">Yesterday</div>
                      <div className="space-y-1">
                        {groups.yesterday.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => {
                              onSelectConversation(conv.id);
                              onClose();
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                              currentConversationId === conv.id
                                ? 'bg-purple-500/20 border border-purple-500/30'
                                : 'hover:bg-gray-800'
                            }`}
                          >
                            <div className="text-sm text-white truncate">{conv.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {conv.messageCount} messages · {formatTime(conv.updatedAt)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* This Week */}
                  {groups.thisWeek.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2">This Week</div>
                      <div className="space-y-1">
                        {groups.thisWeek.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => {
                              onSelectConversation(conv.id);
                              onClose();
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                              currentConversationId === conv.id
                                ? 'bg-purple-500/20 border border-purple-500/30'
                                : 'hover:bg-gray-800'
                            }`}
                          >
                            <div className="text-sm text-white truncate">{conv.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {conv.messageCount} messages · {formatTime(conv.updatedAt)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Older */}
                  {groups.older.length > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2">Older</div>
                      <div className="space-y-1">
                        {groups.older.map((conv) => (
                          <button
                            key={conv.id}
                            onClick={() => {
                              onSelectConversation(conv.id);
                              onClose();
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                              currentConversationId === conv.id
                                ? 'bg-purple-500/20 border border-purple-500/30'
                                : 'hover:bg-gray-800'
                            }`}
                          >
                            <div className="text-sm text-white truncate">{conv.title}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {conv.messageCount} messages · {formatTime(conv.updatedAt)}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {conversations.length === 0 && (
                    <div className="text-center py-8 text-sm text-gray-500">
                      No conversations yet
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="border-t border-gray-800 p-3 space-y-1">
                  <button
                    onClick={() => {
                      onOpenMemory?.();
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <CpuChipIcon className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-gray-300">Memory</span>
                  </button>

                  <a
                    href="/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <BookOpenIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-300">Documentation</span>
                  </a>

                  <a
                    href="/support"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <QuestionMarkCircleIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-300">Help & Support</span>
                  </a>

                  <button
                    onClick={() => {
                      onOpenSettings?.();
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-300">Settings</span>
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
