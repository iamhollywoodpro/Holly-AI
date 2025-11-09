'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Zap, Brain, Heart, Target } from 'lucide-react';
import VoiceInput from '@/components/ui/VoiceInput';
import ConsciousnessIndicator from '@/components/consciousness/ConsciousnessIndicator';
import ParticleField from '@/components/ui/ParticleField';
import MessageBubble from '@/components/chat/MessageBubble';
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
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showGoals, setShowGoals] = useState(true);
  const [showMemory, setShowMemory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
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

  const handleVoiceTranscript = (text: string) => {
    setInput(text);
    setTimeout(() => handleSend(), 100);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="relative w-full h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-hidden">
      {/* Animated Particle Background */}
      <ParticleField />

      {/* Consciousness Indicator - Top Right */}
      <ConsciousnessIndicator />

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

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
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
              </div>
            </div>
          </motion.div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
            {messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                message={message}
                index={index}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <motion.div 
            className="px-8 py-6 border-t border-gray-800/50 bg-gray-900/30 backdrop-blur-xl"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="max-w-4xl mx-auto">
              <div className="relative">
                {/* Input Container */}
                <div className="relative bg-gray-800/50 rounded-2xl border border-gray-700/50 shadow-2xl">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Message HOLLY..."
                    className="w-full px-6 py-4 bg-transparent text-white placeholder-gray-500 resize-none outline-none min-h-[60px] max-h-[200px]"
                    rows={1}
                    disabled={isTyping}
                  />

                  {/* Bottom Bar */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/30">
                    {/* Voice Input */}
                    <VoiceInput
                      onTranscript={handleVoiceTranscript}
                      disabled={isTyping}
                    />

                    {/* Send Button */}
                    <motion.button
                      onClick={handleSend}
                      disabled={!input.trim() || isTyping}
                      className={`px-6 py-2.5 rounded-xl font-medium flex items-center gap-2 transition-all ${
                        input.trim() && !isTyping
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/50'
                          : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                      }`}
                      whileHover={input.trim() && !isTyping ? { scale: 1.05 } : {}}
                      whileTap={input.trim() && !isTyping ? { scale: 0.95 } : {}}
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </motion.button>
                  </div>
                </div>

                {/* Character Count */}
                <div className="mt-2 text-xs text-gray-500 text-right">
                  {input.length} characters
                </div>
              </div>
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
