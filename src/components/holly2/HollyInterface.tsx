'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Menu, X } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ActionButtons } from './ActionButtons';
import { ToolExecutionPanel } from './ToolExecutionPanel';
import { SidebarCollapsible } from './SidebarCollapsible';
import { ConsciousnessIndicator } from './ConsciousnessIndicator';
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
}

interface ToolCall {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: any;
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

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'status') {
                // Update status indicator
              } else if (data.type === 'tool_call') {
                setToolCalls(prev => [...prev, data.tool]);
              } else if (data.type === 'content') {
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
        url: '', // Will be set after upload
      };

      // Generate thumbnail for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          uploadedFile.thumbnail = e.target?.result as string;
          setUploadedFiles(prev => [...prev, uploadedFile]);
        };
        reader.readAsDataURL(file);
      } else {
        setUploadedFiles(prev => [...prev, uploadedFile]);
      }

      // Upload file to server
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/upload/client', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          uploadedFile.url = data.url;
        }
      } catch (error) {
        console.error('Upload error:', error);
      }
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
        <header 
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ 
            backgroundColor: cyberpunkTheme.colors.background.secondary,
            borderColor: cyberpunkTheme.colors.border.primary,
          }}
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: cyberpunkTheme.colors.gradients.primary }}
              >
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <div>
                <h1 
                  className="text-lg font-bold"
                  style={{ 
                    background: cyberpunkTheme.colors.gradients.holographic,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  HOLLY
                </h1>
                <p 
                  className="text-xs"
                  style={{ color: cyberpunkTheme.colors.text.secondary }}
                >
                  AI Development Partner
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <ConsciousnessIndicator />
            <button className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500" />
          </div>
        </header>

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
