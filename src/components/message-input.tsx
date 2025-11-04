'use client';

import { useState, KeyboardEvent } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Mic } from 'lucide-react';

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-white/10 bg-holly-bg-dark p-4">
      <div className="max-w-4xl mx-auto">
        <div className="glass rounded-2xl p-2 flex items-end gap-2">
          {/* Attachment button */}
          <button
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white disabled:opacity-50"
            disabled={disabled}
            title="Attach file (coming soon)"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Text input */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message HOLLY..."
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none max-h-32 py-2.5"
            style={{
              minHeight: '2.5rem',
              maxHeight: '8rem',
            }}
          />

          {/* Voice button */}
          <button
            className="p-2 rounded-lg hover:bg-white/5 transition-colors text-gray-400 hover:text-white disabled:opacity-50"
            disabled={disabled}
            title="Voice input (coming soon)"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Send button */}
          <motion.button
            onClick={handleSend}
            disabled={!message.trim() || disabled}
            className={`
              p-2.5 rounded-xl transition-all
              ${
                message.trim() && !disabled
                  ? 'bg-gradient-to-br from-holly-purple-600 to-holly-blue-600 text-white hover:from-holly-purple-500 hover:to-holly-blue-500 glow-purple'
                  : 'bg-gray-800 text-gray-600'
              }
            `}
            whileTap={{ scale: 0.95 }}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Keyboard hint */}
        <p className="text-xs text-gray-600 mt-2 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-white/5 rounded">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-white/5 rounded">Shift+Enter</kbd> for new line
        </p>
      </div>
    </div>
  );
}
