'use client';

import { Fragment } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { useUser } from '@clerk/nextjs';
import {
  UserCircleIcon,
  Cog6ToothIcon,
  CreditCardIcon,
  CpuChipIcon,
  CommandLineIcon,
  BugAntIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';

interface ProfileDropdownProps {
  onOpenMemory?: () => void;
  onOpenSettings?: () => void;
  onOpenKeyboardShortcuts?: () => void;
  onToggleDebug?: () => void;
  debugMode?: boolean;
}

export function ProfileDropdown({
  onOpenMemory,
  onOpenSettings,
  onOpenKeyboardShortcuts,
  onToggleDebug,
  debugMode = false
}: ProfileDropdownProps) {
  const { user } = useUser();

  const handleSignOut = () => {
    window.location.href = '/api/auth/signout';
  };

  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          <Menu.Button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800/50 transition-all group">
            {user?.imageUrl ? (
              <img
                src={user.imageUrl}
                alt={user.fullName || 'User'}
                className="w-8 h-8 rounded-full border-2 border-purple-500/30 group-hover:border-purple-500/50 transition-colors"
              />
            ) : (
              <UserCircleIcon className="w-8 h-8 text-gray-400 group-hover:text-white transition-colors" />
            )}
            <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </Menu.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl bg-gray-900 border border-gray-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none overflow-hidden z-50">
              {/* User Info Section */}
              <div className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-b border-gray-800">
                <div className="flex items-center gap-3">
                  {user?.imageUrl ? (
                    <img
                      src={user.imageUrl}
                      alt={user.fullName || 'User'}
                      className="w-12 h-12 rounded-full border-2 border-purple-500/30"
                    />
                  ) : (
                    <UserCircleIcon className="w-12 h-12 text-gray-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {user?.fullName || user?.username || 'User'}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {user?.primaryEmailAddress?.emailAddress || 'No email'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Profile Section */}
              <div className="p-2">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => window.location.href = '/profile'}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-gray-800' : ''
                      }`}
                    >
                      <UserCircleIcon className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-300">View Profile</span>
                    </button>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onOpenSettings}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-gray-800' : ''
                      }`}
                    >
                      <Cog6ToothIcon className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-300">Settings</span>
                    </button>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => window.location.href = '/settings/billing'}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-gray-800' : ''
                      }`}
                    >
                      <CreditCardIcon className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-300">Manage Account</span>
                    </button>
                  )}
                </Menu.Item>
              </div>

              {/* Features Section */}
              <div className="border-t border-gray-800 p-2">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onOpenMemory}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-gray-800' : ''
                      }`}
                    >
                      <CpuChipIcon className="w-5 h-5 text-purple-400" />
                      <span className="text-gray-300">Memory</span>
                      <span className="ml-auto text-xs text-gray-500">AI Context</span>
                    </button>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onOpenKeyboardShortcuts}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-gray-800' : ''
                      }`}
                    >
                      <CommandLineIcon className="w-5 h-5 text-blue-400" />
                      <span className="text-gray-300">Keyboard Shortcuts</span>
                      <span className="ml-auto text-xs text-gray-500">⌘K</span>
                    </button>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={onToggleDebug}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-gray-800' : ''
                      }`}
                    >
                      <BugAntIcon className={`w-5 h-5 ${debugMode ? 'text-green-400' : 'text-gray-400'}`} />
                      <span className="text-gray-300">Debug Mode</span>
                      {debugMode && (
                        <span className="ml-auto text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded">
                          ON
                        </span>
                      )}
                    </button>
                  )}
                </Menu.Item>
              </div>

              {/* Help Section */}
              <div className="border-t border-gray-800 p-2">
                <Menu.Item>
                  {({ active }) => (
                    <a
                      href="/docs"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-gray-800' : ''
                      }`}
                    >
                      <BookOpenIcon className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-300">Documentation</span>
                      <svg className="ml-auto w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </Menu.Item>

                <Menu.Item>
                  {({ active }) => (
                    <a
                      href="/support"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-gray-800' : ''
                      }`}
                    >
                      <QuestionMarkCircleIcon className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-300">Help & Support</span>
                      <svg className="ml-auto w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  )}
                </Menu.Item>
              </div>

              {/* Sign Out Section */}
              <div className="border-t border-gray-800 p-2">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleSignOut}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        active ? 'bg-red-500/10' : ''
                      }`}
                    >
                      <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-400" />
                      <span className="text-red-400">Sign Out</span>
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
}
