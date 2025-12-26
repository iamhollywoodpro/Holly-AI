'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Menu, X, Volume2, VolumeX } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ActionButtons } from './ActionButtons';
import { ToolExecutionPanel } from './ToolExecutionPanel';
import { SidebarCollapsible } from './SidebarCollapsible';
import { CleanHeader } from './CleanHeader';
import { FileUploadInline } from './FileUploadInline';
import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import { createConversation, getConversationMessages } from '@/lib/conversation-manager';
import type { Conversation } from '@/types/conversation';
import { getVoiceService } from '@/lib/voice-service';

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
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<any>(null);
  const voiceService = useRef(getVoiceService());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation from URL parameter
  useEffect(() => {
    const loadConversationFromUrl = async () => {
      const params = new URLSearchParams(window.location.search);
      const convId = params.get('conversation');
      
      if (convId && convId !== conversationId) {
        console.log('[HollyInterface] Loading conversation from URL:', convId);
        setIsLoadingConversation(true);
        
        try {
          const loadedMessages = await getConversationMessages(convId);
          
          // Convert to Message format
          const formattedMessages: Message[] = loadedMessages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.createdAt),
          }));
          
          setMessages(formattedMessages);
          setConversationId(convId);
          console.log('[HollyInterface] ✅ Loaded', formattedMessages.length, 'messages');
        } catch (error) {
          console.error('[HollyInterface] ❌ Failed to load conversation:', error);
        } finally {
          setIsLoadingConversation(false);
        }
      }
    };
    
    loadConversationFromUrl();
  }, []);

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
      // Create conversation if this is the first message
      let currentConversationId = conversationId;
      if (!currentConversationId) {
        console.log('[HollyInterface] Creating new conversation...');
        const newConversation = await createConversation(userMessage.content);
        currentConversationId = newConversation.id;
        setConversationId(currentConversationId);
        
        // Update URL without page reload
        const newUrl = `${window.location.pathname}?conversation=${currentConversationId}`;
        window.history.pushState({}, '', newUrl);
        
        // Refresh sidebar to show new conversation
        if (sidebarRef.current?.refreshConversations) {
          sidebarRef.current.refreshConversations();
        }
        
        console.log('[HollyInterface] ✅ Conversation created:', currentConversationId);
      }

      // Map files to backend format
      const mappedFiles = userMessage.files?.map(f => ({
        fileName: f.name,
        fileSize: f.size,
        fileType: f.type,
        blobUrl: f.url,
        publicUrl: f.url,
        mimeType: f.type,
        storagePath: f.url,
        metadata: {},
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          conversationId: currentConversationId,
          files: mappedFiles,
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
      // Speak the response if voice is enabled
      if (voiceEnabled && assistantMessage) {
        try {
          await voiceService.current.speak(assistantMessage);
        } catch (voiceError) {
          console.error('[Voice] Playback error:', voiceError);
        }
      }
    } catch (error) {
      console.error('Send error:', error);
    } finally {
      setIsStreaming(false);
    }
  };

  const toggleVoice = () => {
    const newState = voiceService.current.toggle();
    setVoiceEnabled(newState);
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
        ref={sidebarRef}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentConversationId={conversationId}
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
          {isLoadingConversation ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                <p style={{ color: cyberpunkTheme.colors.text.secondary }}>Loading conversation...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
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
              onClick={toggleVoice}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors"
              style={{ 
                color: voiceEnabled ? cyberpunkTheme.colors.primary.purple : cyberpunkTheme.colors.text.secondary 
              }}
              title={voiceEnabled ? 'Voice enabled - HOLLY will speak' : 'Voice disabled'}
            >
              {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
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
