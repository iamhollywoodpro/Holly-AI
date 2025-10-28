'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore, Message } from '@/store/chat-store';
import { ChatMessage } from './chat-message';
import { TypingIndicator } from './typing-indicator';
import { MessageInput } from './message-input';
import { EmotionIndicator } from './emotion-indicator';
import { HollyAvatar } from './holly-avatar';
import { Settings, Trash2, Sparkles } from 'lucide-react';

export function ChatInterface() {
  const { messages, currentEmotion, isTyping, addMessage, setTyping, setEmotion, clearMessages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

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

  const handleSendMessage = async (content: string) => {
    // Add user message
    addMessage({
      role: 'user',
      content,
    });

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
          userId: 'hollywood',
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
              // Update LOCAL state only - no Zustand updates!
              setStreamingMessage(fullContent);
            }

            if (data.done) {
              console.log('✅ Done');
              // NOW update Zustand with final message
              setStreamingMessage('');
              addMessage({
                role: 'assistant',
                content: fullContent,
                emotion: data.emotion || 'confident',
              });

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
        addMessage({
          role: 'assistant',
          content: "Oops! Something went wrong. Try again? 🔧",
          emotion: 'thoughtful',
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear all messages?')) {
      clearMessages();
    }
  };

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="border-b border-white/10 bg-holly-bg-dark/95 backdrop-blur-xl sticky top-0 z-10"
      >
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <HollyAvatar emotion={currentEmotion} size="lg" animated={true} />
            <div>
              <h1 className="text-2xl font-bold text-gradient flex items-center gap-2">
                HOLLY
                <Sparkles className="w-5 h-5 text-holly-gold-400" />
              </h1>
              <p className="text-sm text-gray-400">Your AI Development Partner</p>
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
    </div>
  );
}
