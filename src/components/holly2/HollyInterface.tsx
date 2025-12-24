'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Menu, X } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ActionButtons } from './ActionButtons';
import { ToolExecutionPanel } from './ToolExecutionPanel';
import { SidebarCollapsible } from './SidebarCollapsible';
import { CleanHeader } from './CleanHeader';
import { FileUploadInline } from './FileUploadInline';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';

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
  uploading?: boolean;
  progress?: number;
}

interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;
  error?: string;
  startTime?: Date;
  endTime?: Date;
}

export function HollyInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [showToolPanel, setShowToolPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() && uploadedFiles.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      files: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setUploadedFiles([]);
    setIsStreaming(true);
    setShowToolPanel(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          files: userMessage.files,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      const newMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        toolCalls: [],
      };

      setMessages(prev => [...prev, newMessage]);

      let buffer = '';

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'status') {
                // Update status indicator (could show in UI)
                console.log('Status:', data.content);
              } else if (data.type === 'tool') {
                // Update tool execution panel
                const toolCall: ToolCall = {
                  id: Date.now().toString() + Math.random(),
                  name: data.toolName,
                  status: data.status === 'start' ? 'running' : 
                          data.status === 'complete' ? 'success' : 'error',
                  result: data.result,
                  startTime: data.status === 'start' ? new Date() : undefined,
                  endTime: data.status !== 'start' ? new Date() : undefined,
                };
                
                setToolCalls(prev => {
                  const existing = prev.find(t => t.name === data.toolName && t.status === 'running');
                  if (existing && data.status !== 'start') {
                    return prev.map(t => 
                      t.id === existing.id ? { ...t, ...toolCall } : t
                    );
                  }
                  return [...prev, toolCall];
                });
              } else if (data.type === 'text') {
                assistantMessage += data.content;
                setMessages(prev => 
                  prev.map(m => 
                    m.id === newMessage.id 
                      ? { ...m, content: assistantMessage }
                      : m
                  )
                );
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      const uploadedFile: UploadedFile = {
        id: Date.now().toString() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        url: '',
        uploading: true,
        progress: 0,
      };

      // Generate thumbnail for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedFile.thumbnail = e.target?.result as string;
        };
        reader.readAsDataURL(file);
      }

      // Add file to list immediately
      setUploadedFiles(prev => [...prev, uploadedFile]);

      // Upload file to server
      const formData = new FormData();
      formData.append('file', file);

      try {
        // Simulate progress (real progress would need XHR)
        const progressInterval = setInterval(() => {
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === uploadedFile.id && f.progress! < 90
                ? { ...f, progress: f.progress! + 10 }
                : f
            )
          );
        }, 200);

        const response = await fetch('/api/upload/client', {
          method: 'POST',
          body: formData,
        });

        clearInterval(progressInterval);

        if (response.ok) {
          const data = await response.json();
          setUploadedFiles(prev => 
            prev.map(f => 
              f.id === uploadedFile.id
                ? { ...f, url: data.url, uploading: false, progress: 100 }
                : f
            )
          );
        } else {
          throw new Error('Upload failed');
        }
      } catch (error) {
        console.error('Upload error:', error);
        // Remove failed upload
        setUploadedFiles(prev => prev.filter(f => f.id !== uploadedFile.id));
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div 
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: cyberpunkTheme.colors.background.primary }}
    >
      {/* Sidebar */}
      <SidebarCollapsible 
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <CleanHeader 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          chatTitle="New Chat"
        />

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: cyberpunkTheme.colors.gradients.primary }}
              >
                <span className="text-white font-bold text-3xl">H</span>
              </div>
              <h2 
                className="text-2xl font-bold mb-2"
                style={{ color: cyberpunkTheme.colors.text.primary }}
              >
                Hey! I'm HOLLY
              </h2>
              <p 
                className="text-lg mb-6"
                style={{ color: cyberpunkTheme.colors.text.secondary }}
              >
                Your AI development partner. What would you like to build today?
              </p>
              <ActionButtons onAction={(action) => setInput(action)} />
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isStreaming && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                  <span style={{ color: cyberpunkTheme.colors.text.secondary }}>
                    HOLLY is thinking...
                  </span>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Tool Execution Panel */}
        {showToolPanel && toolCalls.length > 0 && (
          <ToolExecutionPanel 
            toolCalls={toolCalls}
            onClose={() => setShowToolPanel(false)}
          />
        )}

        {/* Input Area */}
        <div 
          className="border-t px-6 py-4"
          style={{ 
            backgroundColor: cyberpunkTheme.colors.background.secondary,
            borderColor: cyberpunkTheme.colors.border.primary,
          }}
        >
          {/* File Preview */}
          {uploadedFiles.length > 0 && (
            <FileUploadInline 
              files={uploadedFiles}
              onRemove={(id) => setUploadedFiles(prev => prev.filter(f => f.id !== id))}
            />
          )}

          {/* Input Row */}
          <div className="flex items-center gap-3">
            <ActionButtons onAction={(action) => setInput(action)} compact />
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: cyberpunkTheme.colors.text.secondary }}
            >
              <Paperclip className="w-5 h-5" />
            </button>

            <button
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              style={{ color: cyberpunkTheme.colors.text.secondary }}
            >
              <Mic className="w-5 h-5" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message HOLLY..."
              className="flex-1 px-4 py-3 rounded-lg outline-none"
              style={{
                backgroundColor: cyberpunkTheme.colors.background.tertiary,
                color: cyberpunkTheme.colors.text.primary,
                border: `1px solid ${cyberpunkTheme.colors.border.primary}`,
              }}
            />

            <button
              onClick={handleSend}
              disabled={!input.trim() && uploadedFiles.length === 0}
              className="p-3 rounded-lg transition-all disabled:opacity-50"
              style={{
                background: cyberpunkTheme.colors.gradients.primary,
                color: 'white',
              }}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
