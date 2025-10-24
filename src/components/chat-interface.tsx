'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChatStore } from '@/store/chat-store';
import { ChatMessage } from './chat-message';
import { TypingIndicator } from './typing-indicator';
import { MessageInput } from './message-input';
import { EmotionIndicator } from './emotion-indicator';
import { HollyAvatar } from './holly-avatar';
import { Settings, Trash2, Sparkles } from 'lucide-react';

export function ChatInterface() {
  const { messages, currentEmotion, isTyping, addMessage, updateMessage, setTyping, setEmotion, clearMessages } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const streamingMessageIdRef = useRef<string | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    addMessage({
      role: 'user',
      content,
    });

    // Show typing indicator
    setTyping(true);
    setEmotion('thoughtful');
    setIsLoading(true);

    try {
      // Prepare conversation history (last 10 messages + current user message)
      const conversationHistory = [
        ...messages.slice(-10).map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content,
        },
      ];

      // Call HOLLY API with streaming (with timeout)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      console.log('🚀 Sending message to API:', content.substring(0, 50));
      
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          userId: 'hollywood',
          conversationHistory,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      console.log('✅ API response received, status:', response.status);

      if (!response.ok) {
        throw new Error('API request failed');
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }
      
      const decoder = new TextDecoder();
      let streamedContent = '';
      let chunksReceived = 0;
      streamingMessageIdRef.current = null;
      let updatePending = false;
      
      console.log('📡 Starting to read stream...');
      
      while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          chunksReceived++;
          console.log(`📦 Chunk ${chunksReceived}:`, chunk.substring(0, 100));
          
          const lines = chunk.split('\n').filter(line => line.trim().startsWith('data:'));

          for (const line of lines) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
              
              if (data.content) {
                streamedContent += data.content;
                
                // Add initial message on first chunk
                if (!streamingMessageIdRef.current) {
                  // addMessage now returns the ID - call directly to get ID
                  const messageId = addMessage({
                    role: 'assistant',
                    content: streamedContent,
                    isStreaming: true,
                  });
                  streamingMessageIdRef.current = messageId;
                  updatePending = false;
                } else if (!updatePending) {
                  // Throttle updates - only update if not already pending
                  updatePending = true;
                  requestAnimationFrame(() => {
                    if (streamingMessageIdRef.current) {
                      updateMessage(streamingMessageIdRef.current, streamedContent);
                    }
                    updatePending = false;
                  });
                }
              }
              
              if (data.done) {
                // If we got done without ever creating a message, create one now
                if (!streamingMessageIdRef.current && streamedContent) {
                  addMessage({
                    role: 'assistant',
                    content: streamedContent,
                    isStreaming: false,
                  });
                } else if (streamingMessageIdRef.current) {
                  // Mark the streaming message as complete
                  updateMessage(streamingMessageIdRef.current, streamedContent);
                }
                
                setEmotion(data.emotion || 'confident');
                setTyping(false);
                
                // Log model info
                if (data.model) {
                  console.log(`🧠 Response from: ${data.model}`);
                  if (data.responseTime) {
                    console.log(`⚡ Response time: ${data.responseTime}ms`);
                  }
                }
              }
            } catch (e) {
              console.warn('⚠️ Failed to parse SSE line:', line, e);
            }
          }
        }
    } catch (error) {
      console.error('❌ Chat error:', error);
      setTyping(false);
      
      let errorMessage = "Oops! Something went wrong on my end. Let me get that fixed for you, Hollywood. 🔧";
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "Timeout! The AI is taking too long to respond. This might be a temporary issue - try again? ⏱️";
        } else {
          console.error('Error details:', error.message, error.stack);
        }
      }
      
      addMessage({
        role: 'assistant',
        content: errorMessage,
        emotion: 'thoughtful',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('Clear all messages? This cannot be undone.')) {
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
                title="Settings (coming soon)"
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
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <MessageInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
}
