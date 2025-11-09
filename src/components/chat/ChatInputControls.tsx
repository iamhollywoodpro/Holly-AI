'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Mic, Volume2 } from 'lucide-react';

interface ChatInputControlsProps {
  onSend: (message: string) => void;
  onFileUpload: (files: File[]) => void;
  onVoiceInput: () => void;
  disabled?: boolean;
}

export default function ChatInputControls({
  onSend,
  onFileUpload,
  onVoiceInput,
  disabled = false
}: ChatInputControlsProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFileUpload(files);
      e.target.value = ''; // Reset input
    }
  };

  const handleVoiceClick = () => {
    setIsRecording(!isRecording);
    onVoiceInput();
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`;
  };

  return (
    <div className="relative w-full">
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-2xl blur-lg" />

      {/* Main container - MOBILE OPTIMIZED */}
      <div className="relative bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl overflow-hidden">
        {/* Input row with buttons */}
        <div className="flex items-end gap-1.5 sm:gap-2 p-2 sm:p-3">
          {/* Upload button */}
          <motion.button
            onClick={handleFileClick}
            disabled={disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            title="Upload files"
            aria-label="Upload files"
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="*/*"
            onChange={handleFileChange}
            className="hidden"
            aria-label="File input"
          />

          {/* Voice input button */}
          <motion.button
            onClick={handleVoiceClick}
            disabled={disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 ${
              isVoiceActive
                ? 'bg-red-500/20 text-red-400 animate-pulse'
                : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white'
            }`}
            title={isVoiceActive ? 'Stop recording' : 'Voice input'}
            aria-label={isVoiceActive ? 'Stop recording' : 'Voice input'}
          >
            {isVoiceActive ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
          </motion.button>

          {/* Text input - grows to fill space */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Message HOLLY..."
            rows={1}
            className="flex-1 min-w-0 bg-transparent border-none outline-none text-white placeholder-gray-500 resize-none py-2 sm:py-2.5 px-2 text-sm sm:text-base max-h-[120px] sm:max-h-[150px] disabled:opacity-50"
            aria-label="Message input"
          />

          {/* Send button */}
          <motion.button
            onClick={handleSend}
            disabled={disabled || !message.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-700 disabled:to-gray-700 active:scale-95"
            title="Send message"
            aria-label="Send message"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
        </div>
      </div>

      {/* Recording indicator */}
      {isVoiceActive && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1.5 sm:py-2 bg-red-500/20 backdrop-blur-xl border border-red-500/30 rounded-xl text-red-400 text-xs sm:text-sm flex items-center gap-2 whitespace-nowrap"
        >
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Recording...
        </motion.div>
      )}
    </div>
  );
}
