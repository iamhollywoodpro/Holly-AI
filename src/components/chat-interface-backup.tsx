'use client';

import { ConversationSearch } from './conversation-search';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, Message } from '@/store/chat-store';
import { useConversations } from '@/hooks/use-conversations';
import { ChatMessage } from './chat-message';
import { TypingIndicator } from './typing-indicator';
import { MessageInput } from './message-input';
import { EmotionIndicator } from './emotion-indicator';
import { HollyAvatar } from './holly-avatar';
import { ConversationSidebar } from './conversation-sidebar';
import { Settings, Trash2, Sparkles, Menu, X } from 'lucide-react';

export function ChatInterface() {
  const { messages, currentEmotion, isTyping, addMessage, setTyping, setEmotion, clearMessages, setMessages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auth integration
  const { user } = useAuth();

  // Memory system integration
  const {
    conversations,
    currentConversation,
    messages: dbMessages,
    createConversation,
    selectConversation,
    addMessage: addDbMessage,
    updateConversationTitle,
    togglePin,
    deleteConversation,
  } = useConversations(user?.id);

  // Load conversation messages from database when switching conversations
  useEffect(() => {
    if (currentConversation && dbMessages.length > 0) {
      // Convert database messages to chat store format
      const chatMessages = dbMessages.map(msg => ({
        id: msg.id,
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        emotion: msg.emotion,
      }));
      setMessages(chatMessages);
    } else if (!currentConversation) {
      // No conversation selected - clear messages
      clearMessages();
    }
  }, [currentConversation, dbMessages, setMessages, clearMessages]);

  // Combine real messages with streaming message for display
  const displayMessages = streamingMessage
    ? [
        ...messages,
        {
          id: 'streaming-temp',
          role: 'assistant' as const,
          content: streamingMessage,
          timestamp: new Date(),
          isStreaming: true,
        },
      ]
    : messages;

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, isTyping]);

  // Global search shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSendMessage = async (content: string) => {
    // Create new conversation if none exists
    if (!currentConversation) {
      const newConv = await createConversation(content.substring(0, 50));
      if (!newConv) {
        console.error('Failed to create conversation');
        return;
      }
    }

    // Add user message to UI
    addMessage({
      role: 'user',
      content,
    });

    // Save user message to database
    if (currentConversation) {
      await addDbMessage('user', content);
    }

    // Show typing
    setTyping(true);
    setEmotion('thoughtful');
    setIsLoading(true);
    setStreamingMessage('');

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const conversationHistory = [
        ...messages.slice(-10).map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user' as const, content },
      ];

      console.log('🚀 Sending:', content.substring(0, 50));

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          userId: user?.email || 'anonymous',
          conversationHistory,
        }),
        signal: abortControllerRef.current.signal,
      });

      console.log('✅ Response:', response.status);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');

      const decoder = new TextDecoder();
      let fullContent = '';

      console.log('📡 Streaming...');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(l => l.trim().startsWith('data:'));

        for (const line of lines) {
          try {
            const data = JSON.parse(line.replace('data: ', ''));

            if (data.content) {
              fullContent += data.content;
              setStreamingMessage(fullContent);
            }

            if (data.done) {
              console.log('✅ Done');
              setStreamingMessage('');
              
              // Add to UI
              addMessage({
                role: 'assistant',
                content: fullContent,
                emotion: data.emotion || 'confident',
              });

              // Save to database
              if (currentConversation) {
                await addDbMessage('assistant', fullContent, data.emotion || 'confident', data.model);
              }

              setEmotion(data.emotion || 'confident');
              setTyping(false);

              if (data.model) {
                console.log(`🧠 ${data.model} - ${data.responseTime}ms`);
              }
            }
          } catch (e) {
            console.warn('⚠️ Parse error:', e);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error:', error);
      setTyping(false);
      setStreamingMessage('');

      if (error instanceof Error && error.name !== 'AbortError') {
        const errorMsg = "Oops! Something went wrong. Try again? 🔧";
        addMessage({
          role: 'assistant',
          content: errorMsg,
          emotion: 'thoughtful',
        });
        
        // Save error message to database
        if (currentConversation) {
          await addDbMessage('assistant', errorMsg, 'thoughtful');
        }
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear current conversation? (It will still be saved in history)')) {
      clearMessages();
    }
  };

  const handleNewConversation = async () => {
    await createConversation();
    clearMessages();
  };

  const handleSelectConversation = async (id: string) => {
    await selectConversation(id);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id);
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <ConversationSidebar
              conversations={conversations}
              currentConversationId={currentConversation?.id || null}
              onSelectConversation={handleSelectConversation}
              onCreateConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onUpdateTitle={updateConversationTitle}
              onTogglePin={togglePin}
              onOpenSearch={() => setSearchOpen(true)}
              isLoading={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className="border-b border-white/10 bg-holly-bg-dark/95 backdrop-blur-xl sticky top-0 z-10"
        >
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-lg glass-hover text-gray-400 hover:text-white"
                title="Toggle sidebar"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <HollyAvatar emotion={currentEmotion} size="lg" animated={true} />
              <div>
                <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
                  HOLLY
                  <Sparkles className="w-5 h-5 text-holly-gold-400" />
                </h1>
                <p className="text-sm text-gray-400">
                  {currentConversation ? currentConversation.title : 'Your AI Development Partner'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <EmotionIndicator emotion={currentEmotion} />
              <div className="flex gap-2">
                <button
                  onClick={handleClearChat}
                  className="p-2 rounded-lg glass-hover text-gray-400 hover:text-red-400"
                  title="Clear chat"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button
                  className="p-2 rounded-lg glass-hover text-gray-400 hover:text-white"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {displayMessages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center text-gray-400 mt-20"
              >
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-holly-gold-400" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  Hey Hollywood! 👋
                </h2>
                <p>Ready to build something amazing together?</p>
                <p className="text-sm mt-2">💜 I now remember our conversations!</p>
              </motion.div>
            )}
            <AnimatePresence mode="popLayout">
              {displayMessages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isTyping && !streamingMessage && <TypingIndicator />}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <MessageInput onSend={handleSendMessage} disabled={isLoading} />

        {/* Search Modal */}
        <AnimatePresence>
          {searchOpen && (
            <ConversationSearch
              conversations={conversations}
              onSelectConversation={handleSelectConversation}
              isOpen={searchOpen}
              onClose={() => setSearchOpen(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
