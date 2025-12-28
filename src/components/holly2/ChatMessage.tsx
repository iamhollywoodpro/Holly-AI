'use client';

import { formatDistanceToNow } from 'date-fns';
import { User, Sparkles, FileText, Image as ImageIcon, Film, Music, File } from 'lucide-react';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import HollyVoicePlayer from '@/components/ui/HollyVoicePlayer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  files?: UploadedFile[];
  toolCalls?: ToolCall[];
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  thumbnail?: string;
}

interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;
}

interface ChatMessageProps {
  message: Message;
  autoPlayVoice?: boolean;
}

export function ChatMessage({ message, autoPlayVoice = false }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return ImageIcon;
    if (type.startsWith('video/')) return Film;
    if (type.startsWith('audio/')) return Music;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div 
        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: isUser 
            ? cyberpunkTheme.colors.background.tertiary
            : cyberpunkTheme.colors.gradients.primary,
        }}
      >
        {isUser ? (
          <User className="w-5 h-5" style={{ color: cyberpunkTheme.colors.text.primary }} />
        ) : (
          <Sparkles className="w-5 h-5 text-white" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-3xl ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <span 
            className="font-semibold"
            style={{ color: cyberpunkTheme.colors.text.primary }}
          >
            {isUser ? 'You' : 'HOLLY'}
          </span>
          <span 
            className="text-xs"
            style={{ color: cyberpunkTheme.colors.text.tertiary }}
          >
            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
          </span>
        </div>

        {/* Files */}
        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.files.map((file) => {
              const Icon = getFileIcon(file.type);
              
              return (
                <div
                  key={file.id}
                  className="rounded-lg p-3 border flex items-center gap-3 max-w-xs"
                  style={{
                    backgroundColor: cyberpunkTheme.colors.background.tertiary,
                    borderColor: cyberpunkTheme.colors.border.primary,
                  }}
                >
                  {file.thumbnail ? (
                    <img 
                      src={file.thumbnail} 
                      alt={file.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div 
                      className="w-12 h-12 rounded flex items-center justify-center"
                      style={{ backgroundColor: cyberpunkTheme.colors.background.elevated }}
                    >
                      <Icon 
                        className="w-6 h-6" 
                        style={{ color: cyberpunkTheme.colors.primary.purple }}
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div 
                      className="text-sm font-medium truncate"
                      style={{ color: cyberpunkTheme.colors.text.primary }}
                    >
                      {file.name}
                    </div>
                    <div 
                      className="text-xs"
                      style={{ color: cyberpunkTheme.colors.text.tertiary }}
                    >
                      {formatFileSize(file.size)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Text Content */}
        {message.content && (
          <div className="space-y-2">
            <div 
              className="rounded-lg px-4 py-3 whitespace-pre-wrap"
              style={{
                backgroundColor: isUser 
                  ? cyberpunkTheme.colors.background.tertiary
                  : cyberpunkTheme.colors.background.elevated,
                color: cyberpunkTheme.colors.text.primary,
                border: isUser 
                  ? `1px solid ${cyberpunkTheme.colors.border.primary}`
                  : `1px solid ${cyberpunkTheme.colors.primary.purple}33`,
              }}
            >
              {message.content}
            </div>
            
            {/* Voice Player for HOLLY's messages */}
            {!isUser && (
              <HollyVoicePlayer
                text={message.content}
                autoPlay={autoPlayVoice}
                showControls={true}
              />
            )}
          </div>
        )}

        {/* Tool Calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-1">
            {message.toolCalls.map((tool) => (
              <div
                key={tool.id}
                className="text-xs px-3 py-1 rounded-full inline-flex items-center gap-2"
                style={{
                  backgroundColor: cyberpunkTheme.colors.background.tertiary,
                  color: cyberpunkTheme.colors.text.secondary,
                }}
              >
                <div 
                  className={`w-1.5 h-1.5 rounded-full ${
                    tool.status === 'running' ? 'animate-pulse' : ''
                  }`}
                  style={{
                    backgroundColor: 
                      tool.status === 'success' ? cyberpunkTheme.colors.accent.success :
                      tool.status === 'error' ? cyberpunkTheme.colors.accent.error :
                      tool.status === 'running' ? cyberpunkTheme.colors.primary.cyan :
                      cyberpunkTheme.colors.text.tertiary
                  }}
                />
                {tool.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
