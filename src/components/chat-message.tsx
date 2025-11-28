'use client';

import { motion } from 'framer-motion';
import { Message } from '@/store/chat-store';
import { HollyAvatar } from './holly-avatar';
import { ModelBadge } from './model-badge';
import { User, Volume2, VolumeX, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';
import { speakText, stopSpeaking, isSpeaking } from '@/lib/voice/enhanced-voice-output';
import { useVoiceSettings } from '@/hooks/useVoiceSettings';
import { CommitButton } from './chat/CommitButton';
import { DeployButton } from './chat/DeployButton';
import { useActiveRepo } from '@/hooks/useActiveRepos';
import type { GitHubFile } from '@/lib/github-api';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant';
  const [isSpeakingThis, setIsSpeakingThis] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const voiceSettings = useVoiceSettings();
  const { activeRepo } = useActiveRepo();

  // Detect if message contains code blocks
  const hasCodeBlocks = message.content.includes('```');
  
  // Extract code blocks and file information
  const extractCodeFiles = (): GitHubFile[] => {
    const files: GitHubFile[] = [];
    const codeBlockRegex = /```(?:(\w+))?\s*(?:\/\/\s*(.+?))?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      const language = match[1] || 'text';
      const comment = match[2] || '';
      const code = match[3];
      
      // Try to extract filename from comment or use default
      let filename = 'file';
      if (comment && comment.includes('.')) {
        filename = comment.trim();
      } else if (language === 'typescript' || language === 'tsx') {
        filename = 'component.tsx';
      } else if (language === 'javascript' || language === 'jsx') {
        filename = 'component.jsx';
      } else if (language === 'python') {
        filename = 'script.py';
      } else if (language === 'css') {
        filename = 'styles.css';
      } else {
        filename = `file.${language}`;
      }
      
      files.push({
        path: filename,
        content: code,
        encoding: 'utf-8',
      });
    }
    
    return files;
  };
  
  const codeFiles = hasCodeBlocks ? extractCodeFiles() : [];
  const shouldShowCommitButton = isAssistant && hasCodeBlocks && codeFiles.length > 0 && activeRepo;
  
  // Check if message mentions successful commit
  const hasSuccessfulCommit = message.content.toLowerCase().includes('committed') || 
                               message.content.toLowerCase().includes('commit success') ||
                               message.metadata?.commitSuccess;
  const shouldShowDeployButton = isAssistant && hasSuccessfulCommit && activeRepo;

  const handleSpeak = async () => {
    if (isSpeakingThis) {
      // Stop speaking this message
      stopSpeaking();
      setIsSpeakingThis(false);
      return;
    }

    // Check if voice is enabled
    if (!voiceSettings.enabled) {
      console.warn('[HOLLY Voice] Voice output is disabled in settings');
      alert('Voice output is disabled. Enable it in settings.');
      return;
    }

    try {
      setIsLoading(true);
      setIsSpeakingThis(true);
      
      console.log('[HOLLY Voice] Starting TTS for message:', message.content.substring(0, 50));
      
      await speakText(message.content, {
        volume: voiceSettings.volume,
        onStart: () => {
          console.log('[HOLLY Voice] Audio started playing');
        },
        onEnd: () => {
          console.log('[HOLLY Voice] Audio finished playing');
          setIsSpeakingThis(false);
        },
        onError: (error) => {
          console.error('[HOLLY Voice] Playback error:', error);
          alert(`Voice playback failed: ${error}`);
          setIsSpeakingThis(false);
        }
      });
      
    } catch (error) {
      console.error('[HOLLY Voice] Failed to speak:', error);
      alert(`Failed to generate voice: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSpeakingThis(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-4 mb-6 ${isAssistant ? '' : 'flex-row-reverse'}`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isAssistant ? (
          <HollyAvatar emotion={message.emotion} size="md" animated={message.isStreaming} />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
            <User className="w-6 h-6 text-gray-300" />
          </div>
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 ${isAssistant ? '' : 'flex justify-end'}`}>
        <div
          className={`
            inline-block max-w-[85%] px-5 py-3 rounded-2xl
            ${
              isAssistant
                ? 'glass text-white rounded-tl-none'
                : 'bg-gradient-to-br from-holly-purple-600 to-holly-blue-600 text-white rounded-tr-none'
            }
          `}
        >
          {/* Message text with markdown support */}
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ node, inline, className, children, ...props }: any) => {
                  return inline ? (
                    <code
                      className="bg-black/30 px-2 py-1 rounded text-holly-purple-300 font-mono text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto border border-white/10">
                      <code className="text-sm font-mono text-gray-100" {...props}>
                        {children}
                      </code>
                    </pre>
                  );
                },
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="text-holly-purple-300 font-bold">{children}</strong>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Action Buttons */}
          {shouldShowCommitButton && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <CommitButton
                files={codeFiles}
                suggestedMessage={`Update ${codeFiles.map(f => f.path).join(', ')}\n\nChanges suggested by HOLLY`}
              />
            </div>
          )}
          
          {shouldShowDeployButton && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <DeployButton variant="success" />
            </div>
          )}

          {/* Timestamp, Model, and Voice Controls */}
          <div className={`flex items-center gap-2 mt-2 text-xs ${isAssistant ? 'text-gray-500' : 'text-white/60'}`}>
            <span>{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            {isAssistant && message.model && <ModelBadge model={message.model} />}
            
            {/* Voice Button (only for assistant messages) */}
            {isAssistant && voiceSettings.enabled && (
              <motion.button
                onClick={handleSpeak}
                disabled={isLoading}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title={isSpeakingThis ? 'Stop speaking' : 'Speak message'}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                ) : isSpeakingThis ? (
                  <VolumeX className="w-4 h-4 text-purple-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-gray-400 hover:text-purple-400" />
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
