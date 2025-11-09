'use client';

import { motion } from 'framer-motion';
import { User, Sparkles, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotion?: string;
  thinking?: boolean;
}

interface MessageBubbleProps {
  message: Message;
  index: number;
}

export default function MessageBubble({ message, index }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isThinking = message.thinking;

  const getEmotionColor = (emotion?: string) => {
    const colors: Record<string, string> = {
      excited: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
      curious: 'from-blue-500/20 to-purple-500/20 border-blue-500/30',
      focused: 'from-purple-500/20 to-indigo-500/20 border-purple-500/30',
      content: 'from-green-500/20 to-emerald-500/20 border-green-500/30',
      wonder: 'from-pink-500/20 to-rose-500/20 border-pink-500/30',
    };
    return emotion ? colors[emotion] || colors.curious : '';
  };

  if (isThinking) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="flex items-start gap-4"
      >
        {/* HOLLY Avatar */}
        <motion.div
          className="relative w-10 h-10 flex-shrink-0"
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-md opacity-50" />
          <div className="relative w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center border border-white/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </motion.div>

        {/* Thinking Indicator */}
        <motion.div className="flex-1 bg-gradient-to-r from-gray-800/50 to-gray-700/50 rounded-2xl px-6 py-4 border border-gray-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <div className="flex gap-1">
              <motion.div
                className="w-2 h-2 bg-purple-400 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
              />
              <motion.div
                className="w-2 h-2 bg-purple-400 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="w-2 h-2 bg-purple-400 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
              />
            </div>
            <span className="text-sm text-gray-400">HOLLY is thinking...</span>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.05,
        type: 'spring',
        stiffness: 200,
        damping: 20
      }}
      className={`flex items-start gap-4 ${isUser ? 'flex-row-reverse' : ''}`}
    >
      {/* Avatar */}
      <motion.div
        className="relative w-10 h-10 flex-shrink-0"
        whileHover={{ scale: 1.1 }}
      >
        {isUser ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full blur-md opacity-50" />
            <div className="relative w-full h-full bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center border border-white/20">
              <User className="w-5 h-5 text-white" />
            </div>
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-md opacity-50" />
            <div className="relative w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center border border-white/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </>
        )}
      </motion.div>

      {/* Message Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'flex justify-end' : ''}`}>
        <motion.div
          className={`relative rounded-2xl px-6 py-4 backdrop-blur-sm ${
            isUser
              ? 'bg-gradient-to-br from-blue-600/90 to-cyan-600/90 border border-blue-400/30 shadow-lg shadow-blue-500/20'
              : `bg-gradient-to-br ${getEmotionColor(message.emotion) || 'from-gray-800/50 to-gray-700/50'} border ${getEmotionColor(message.emotion).includes('border') ? '' : 'border-gray-700/50'} shadow-lg`
          }`}
          whileHover={{ scale: 1.01 }}
        >
          {/* Message Header */}
          {!isUser && message.emotion && (
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700/30">
              <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                Feeling: <span className="text-purple-400 capitalize">{message.emotion}</span>
              </div>
            </div>
          )}

          {/* Message Text */}
          <div className={`text-base leading-relaxed ${isUser ? 'text-white' : 'text-gray-100'}`}>
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                em: ({ children }) => <em className="italic text-purple-300">{children}</em>,
                code: ({ children }) => (
                  <code className="px-2 py-0.5 bg-black/30 rounded text-sm font-mono text-cyan-300">
                    {children}
                  </code>
                ),
                pre: ({ children }) => (
                  <pre className="mt-2 p-4 bg-black/40 rounded-lg overflow-x-auto">
                    <code className="text-sm font-mono text-cyan-300">{children}</code>
                  </pre>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Timestamp */}
          <div className="mt-2 text-xs text-gray-400">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>

          {/* Decorative Glow */}
          {!isUser && (
            <div className={`absolute -inset-0.5 bg-gradient-to-r ${getEmotionColor(message.emotion) || 'from-purple-500/20 to-pink-500/20'} rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity -z-10`} />
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
