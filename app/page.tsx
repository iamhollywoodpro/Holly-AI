// app/page.tsx - PHASE 2: Chat UX Polish Integration
// This file integrates: ActiveRepoIndicator, CommandAutocomplete, LoadingIndicator, Multi-line Input

'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useUser } from '@clerk/nextjs';
import { PaperAirplaneIcon, Bars3Icon } from '@heroicons/react/24/solid';
import Sidebar from '@/components/Sidebar';
import CommandHandler from '@/components/CommandHandler';
import GitHubConnectionDropdown from '@/components/header/GitHubConnectionDropdown';
import ProfileDropdown from '@/components/header/ProfileDropdown';
import MobileMenu from '@/components/header/MobileMenu';
import KeyboardShortcutsModal from '@/components/modals/KeyboardShortcutsModal';
import ActiveRepoIndicator, { EmptyRepoIndicator } from '@/components/chat/ActiveRepoIndicator';
import CommandAutocomplete from '@/components/chat/CommandAutocomplete';
import LoadingIndicator, { getLoadingMessage } from '@/components/chat/LoadingIndicator';
import { useActiveRepo } from '@/lib/stores/active-repo-store';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function Home() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string>('chat');
  
  // Phase 1 state
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [githubRepoCount, setGithubRepoCount] = useState<number>(0);
  
  // Phase 2 state
  const [showCommandAutocomplete, setShowCommandAutocomplete] = useState(false);
  const [commandQuery, setCommandQuery] = useState('');
  const [showRepoIndicator, setShowRepoIndicator] = useState(true);
  const [textareaHeight, setTextareaHeight] = useState('auto');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const commandHandlerRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const activeRepo = useActiveRepo();

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch GitHub connection info on mount
  useEffect(() => {
    if (user) {
      fetch('/api/github/connection')
        .then((res) => res.json())
        .then((data) => {
          if (data.connected) {
            setGithubUsername(data.username);
            setGithubRepoCount(data.repoCount);
          }
        })
        .catch((err) => console.error('Failed to fetch GitHub connection:', err));
    }
  }, [user]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const lineHeight = 24; // 1.5rem
      const maxLines = 5;
      const maxHeight = lineHeight * maxLines;
      
      if (scrollHeight > maxHeight) {
        textareaRef.current.style.height = `${maxHeight}px`;
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.height = `${scrollHeight}px`;
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  }, [input]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      // Cmd+K / Ctrl+K - Clear input
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setInput('');
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }

      // Cmd+Shift+K / Ctrl+Shift+K - Show keyboard shortcuts
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'K') {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
      }

      // Cmd+R / Ctrl+R - Open repo selector
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        // Trigger repo selector (will be handled by GitHubConnectionDropdown)
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Detect command autocomplete trigger
  useEffect(() => {
    const lastChar = input.slice(-1);
    const words = input.trim().split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('/')) {
      setCommandQuery(lastWord);
      setShowCommandAutocomplete(true);
    } else {
      setShowCommandAutocomplete(false);
      setCommandQuery('');
    }
  }, [input]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Check if it's a command
    if (input.trim().startsWith('/')) {
      setLoadingAction(getCommandAction(input.trim()));
      try {
        const response = await commandHandlerRef.current?.executeCommand(input.trim());
        
        const assistantMessage: Message = {
          role: 'assistant',
          content: response || 'Command executed successfully!',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        const errorMessage: Message = {
          role: 'assistant',
          content: `Error executing command: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
      setIsLoading(false);
      return;
    }

    // Regular chat
    setLoadingAction('chat');
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, history: messages }),
      });

      const data = await response.json();
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Shift+Enter = new line
    if (e.key === 'Enter' && e.shiftKey) {
      return; // Allow default behavior (new line)
    }
    
    // Enter alone = send message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCommandSelect = (command: string) => {
    // Replace the last word (command query) with the selected command
    const words = input.trim().split(/\s+/);
    words[words.length - 1] = command;
    setInput(words.join(' ') + ' ');
    setShowCommandAutocomplete(false);
    
    // Focus back on textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleRepoSelect = () => {
    // This will be handled by CommandHandler's repo selector
    commandHandlerRef.current?.openRepoSelector?.();
  };

  // Helper function to determine loading action from command
  const getCommandAction = (command: string): string => {
    if (command.startsWith('/workflows')) return 'fetch_workflows';
    if (command.startsWith('/actions')) return 'analyze_runs';
    if (command.startsWith('/issues')) return 'search_issues';
    if (command.startsWith('/team')) return 'fetch_team';
    if (command.startsWith('/collab')) return 'fetch_comments';
    if (command.startsWith('/repos')) return 'fetch_repos';
    return 'processing';
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setShowMobileMenu(true)}
                className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <Bars3Icon className="h-6 w-6" />
              </button>

              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                HOLLY AI Assistant
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* GitHub Connection Dropdown */}
              {githubUsername && (
                <GitHubConnectionDropdown
                  username={githubUsername}
                  repoCount={githubRepoCount}
                  onSync={() => {
                    // Refresh GitHub data
                    fetch('/api/github/connection')
                      .then((res) => res.json())
                      .then((data) => {
                        if (data.connected) {
                          setGithubUsername(data.username);
                          setGithubRepoCount(data.repoCount);
                        }
                      });
                  }}
                />
              )}

              {/* Profile Dropdown */}
              <ProfileDropdown
                user={user}
                debugMode={debugMode}
                onToggleDebug={() => setDebugMode(!debugMode)}
                onShowKeyboardShortcuts={() => setShowKeyboardShortcuts(true)}
              />
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl px-4 py-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {message.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="px-2 py-1">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">HOLLY</span>
                  </div>
                  <LoadingIndicator {...getLoadingMessage(loadingAction)} />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Active Repo Indicator */}
          {showRepoIndicator && activeRepo ? (
            <ActiveRepoIndicator
              owner={activeRepo.owner}
              repo={activeRepo.name}
              branch={activeRepo.branch || 'main'}
              onChangeRepo={handleRepoSelect}
              onDismiss={() => setShowRepoIndicator(false)}
            />
          ) : !activeRepo && showRepoIndicator ? (
            <EmptyRepoIndicator onSelectRepo={handleRepoSelect} />
          ) : null}

          {/* Input Area */}
          <div className="relative border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            {/* Command Autocomplete */}
            {showCommandAutocomplete && (
              <CommandAutocomplete
                query={commandQuery}
                onSelect={handleCommandSelect}
                onClose={() => setShowCommandAutocomplete(false)}
                position={{ bottom: 80 }}
              />
            )}

            <div className="max-w-4xl mx-auto flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message or / for commands..."
                  className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-white resize-none"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
                
                {/* Input hint */}
                {input.length === 0 && (
                  <div className="absolute bottom-2 right-3 text-xs text-gray-400 dark:text-gray-500 pointer-events-none">
                    Shift+Enter for new line
                  </div>
                )}
              </div>

              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>

            {/* Character count (optional) */}
            {input.length > 500 && (
              <div className="max-w-4xl mx-auto mt-2 text-xs text-gray-500 dark:text-gray-400 text-right">
                {input.length} characters
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        conversations={[]}
        onSelectConversation={() => {}}
        onNewChat={() => {
          setMessages([]);
          setShowMobileMenu(false);
        }}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* Command Handler (hidden) */}
      <CommandHandler ref={commandHandlerRef} />
    </div>
  );
}
