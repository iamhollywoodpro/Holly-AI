'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Target } from 'lucide-react';
import ParticleField from '@/components/ui/ParticleField';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInputControls from '@/components/chat/ChatInputControls';
import BrainConsciousnessIndicator from '@/components/consciousness/BrainConsciousnessIndicator';
import GoalsSidebar from '@/components/consciousness/GoalsSidebar';
import MemoryTimeline from '@/components/consciousness/MemoryTimeline';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotion?: string;
  thinking?: boolean;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showGoals, setShowGoals] = useState(true);
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

    // Simulate HOLLY thinking
    const thinkingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      thinking: true
    };
    setMessages(prev => [...prev, thinkingMessage]);

    // TODO: Call actual HOLLY API
    setTimeout(() => {
      setMessages(prev => prev.filter(m => !m.thinking));
      
      const response: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "I hear you, Hollywood! Let me think about that...",
        timestamp: new Date(),
        emotion: 'curious'
      };
      
      setMessages(prev => [...prev, response]);
      setIsTyping(false);
    }, 1500);
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
        {/* Goals Sidebar - Left */}
        <AnimatePresence>
          {showGoals && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-80 border-r border-gray-800/50"
            >
              <GoalsSidebar />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <motion.div 
            className="relative px-8 py-6 border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-xl"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* HOLLY Logo */}
                <motion.div
                  className="relative w-16 h-16"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-2xl blur-xl opacity-50" />
                  <div className="relative w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-2xl flex items-center justify-center border border-white/20">
                    <Brain className="w-8 h-8 text-white" />
                  </div>
                </motion.div>

                {/* Title */}
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                    HOLLY
                  </h1>
                  <p className="text-sm text-gray-400">Hyper-Optimized Logic & Learning Yield</p>
                </div>
              </div>

              {/* Right Side: Action Buttons + Consciousness */}
              <div className="flex items-center gap-3">
                {/* Toggle Buttons */}
                <motion.button
                  onClick={() => setShowGoals(!showGoals)}
                  className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 text-sm text-gray-300 flex items-center gap-2 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Target className="w-4 h-4" />
                  Goals
                </motion.button>
                <motion.button
                  onClick={() => setShowMemory(!showMemory)}
                  className="px-4 py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 text-sm text-gray-300 flex items-center gap-2 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Sparkles className="w-4 h-4" />
                  Memory
                </motion.button>

                {/* Brain Consciousness Indicator */}
                <BrainConsciousnessIndicator />
              </div>
            </div>
          </motion.div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {messages.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-3xl blur-2xl opacity-40" />
                  <div className="relative w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-3xl flex items-center justify-center">
                    <Brain className="w-12 h-12 text-white" />
                  </div>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Hey Hollywood!</h2>
                <p className="text-gray-400 max-w-md">
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

          {/* Input Area with New Controls */}
          <motion.div 
            className="px-8 py-6 border-t border-gray-800/50 bg-gray-900/30 backdrop-blur-xl"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="max-w-4xl mx-auto">
              <ChatInputControls
                onSend={handleSend}
                onFileUpload={handleFileUpload}
                onVoiceInput={handleVoiceInput}
                disabled={isTyping}
              />
            </div>
          </motion.div>
        </div>

        {/* Memory Timeline - Right */}
        <AnimatePresence>
          {showMemory && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="w-80 border-l border-gray-800/50"
            >
              <MemoryTimeline />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
