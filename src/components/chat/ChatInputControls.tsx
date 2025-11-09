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
    <div className="relative">
      {/* Glow effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 rounded-2xl blur-lg" />

      {/* Main container */}
      <div className="relative bg-gray-800/80 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-3 flex items-end gap-2">
        {/* Upload button */}
        <motion.button
          onClick={handleFileClick}
          disabled={disabled}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Upload files"
        >
          <Paperclip className="w-5 h-5" />
        </motion.button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Voice input button */}
        <motion.button
          onClick={handleVoiceClick}
          disabled={disabled}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            isRecording
              ? 'bg-red-500/20 text-red-400 animate-pulse'
              : 'bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white'
          }`}
          title={isRecording ? 'Stop recording' : 'Voice input'}
        >
          {isRecording ? <Volume2 className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </motion.button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Message HOLLY..."
          rows={1}
          className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 resize-none py-2.5 max-h-[150px] disabled:opacity-50"
        />

        {/* Send button */}
        <motion.button
          onClick={handleSend}
          disabled={disabled || !message.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-700 disabled:to-gray-700"
          title="Send message"
        >
          <Send className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Recording indicator */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500/20 backdrop-blur-xl border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2"
        >
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Recording...
        </motion.div>
      )}
    </div>
  );
}
