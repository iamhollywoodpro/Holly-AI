'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Target, Menu } from 'lucide-react';
import ParticleField from '@/components/ui/ParticleField';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInputControls from '@/components/chat/ChatInputControls';
import BrainConsciousnessIndicator from '@/components/consciousness/BrainConsciousnessIndicator';
import GoalsSidebar from '@/components/consciousness/GoalsSidebar';
import MemoryTimeline from '@/components/consciousness/MemoryTimeline';
import { useAuth } from '@/contexts/auth-context';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotion?: string;
  thinking?: boolean;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showGoals, setShowGoals] = useState(false); // Hidden by default on mobile
  const [showMemory, setShowMemory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (message: string) => {
    if (!message.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Add thinking indicator
    const thinkingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      thinking: true
    };
    setMessages(prev => [...prev, thinkingMessage]);

    try {
      // Call real HOLLY chat API with user context
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          userId: user?.id || 'anonymous',
          conversationId: `chat-${Date.now()}`
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Remove thinking indicator
      setMessages(prev => prev.filter(m => !m.thinking));

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      
      const hollyMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        emotion: 'curious'
      };
      setMessages(prev => [...prev, hollyMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulatedContent = parsed.content;
                  setMessages(prev => prev.map(m => 
                    m.id === hollyMessage.id 
                      ? { ...m, content: accumulatedContent }
                      : m
                  ));
                }
              } catch (e) {
                console.error('Parse error:', e);
              }
            }
          }
        }
      }

      setIsTyping(false);
    } catch (error) {
      console.error('Chat error:', error);
      
      // Remove thinking indicator
      setMessages(prev => prev.filter(m => !m.thinking));
      
      // Show error message
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "Oops! Something went wrong. Hollywood, I'm having trouble connecting to my brain right now. Can you try again?",
        timestamp: new Date(),
        emotion: 'confused'
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  const handleFileUpload = (files: File[]) => {
    console.log('Files uploaded:', files);
    // TODO: Implement file upload logic
  };

  const handleVoiceInput = () => {
    console.log('Voice input activated');
    // TODO: Implement voice input logic
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-hidden">
      {/* Animated Particle Background */}
      <ParticleField />

      {/* Main Container */}
      <div className="relative z-10 flex h-full">
        {/* Goals Sidebar - Left - HIDDEN ON MOBILE */}
        <AnimatePresence>
          {showGoals && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="hidden md:block w-80 border-r border-gray-800/50"
            >
              <GoalsSidebar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header - MOBILE OPTIMIZED */}
          <motion.div 
            className="relative px-3 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-xl"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
                {/* HOLLY Logo - SMALLER ON MOBILE */}
                <motion.div
                  className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 flex-shrink-0"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl sm:rounded-2xl blur-lg sm:blur-xl opacity-50" />
                  <div className="relative w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/20">
                    <Brain className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
                  </div>
                </motion.div>

                {/* Title - RESPONSIVE */}
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent truncate">
                    HOLLY
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400 truncate hidden sm:block">Hyper-Optimized Logic & Learning Yield</p>
                </div>
              </div>

              {/* Right Side: Action Buttons + Consciousness */}
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
                {/* Toggle Buttons - ICON ONLY ON MOBILE */}
                <motion.button
                  onClick={() => setShowGoals(!showGoals)}
                  className="hidden md:flex px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 text-xs sm:text-sm text-gray-300 items-center gap-2 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Toggle goals"
                >
                  <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Goals</span>
                </motion.button>
                <motion.button
                  onClick={() => setShowMemory(!showMemory)}
                  className="hidden md:flex px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 text-xs sm:text-sm text-gray-300 items-center gap-2 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Toggle memory"
                >
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Memory</span>
                </motion.button>

                {/* Brain Consciousness Indicator */}
                <BrainConsciousnessIndicator />
              </div>
            </div>
          </motion.div>

          {/* Messages Area - MOBILE OPTIMIZED */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center px-4"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mb-4 sm:mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-2xl sm:rounded-3xl blur-xl sm:blur-2xl opacity-40" />
                  <div className="relative w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-2xl sm:rounded-3xl flex items-center justify-center">
                    <Brain className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-white" />
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-2">Hey Hollywood!</h2>
                <p className="text-sm sm:text-base text-gray-400 max-w-md">
                  I'm HOLLY, your autonomous AI developer and creative partner. 
                  How can I help you build something amazing today?
                </p>
              </motion.div>
            )}
            
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                index={index}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area with New Controls - MOBILE OPTIMIZED */}
          <motion.div 
            className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 border-t border-gray-800/50 bg-gray-900/30 backdrop-blur-xl"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="max-w-4xl mx-auto w-full">
              <ChatInputControls
                onSend={handleSend}
                onFileUpload={handleFileUpload}
                onVoiceInput={handleVoiceInput}
                disabled={isTyping}
              />
            </div>
          </motion.div>
        </div>

        {/* Memory Timeline - Right - HIDDEN ON MOBILE */}
        <AnimatePresence>
          {showMemory && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="hidden lg:block w-80 border-l border-gray-800/50"
            >
              <MemoryTimeline />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
