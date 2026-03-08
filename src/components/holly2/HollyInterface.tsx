'use client';

import Image from 'next/image'; import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Menu, X, Volume2, VolumeX } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ActionButtons } from './ActionButtons';
import { ToolExecutionPanel } from './ToolExecutionPanel';
import { SidebarCollapsible } from './SidebarCollapsible';
import { MobileSidebar } from './MobileSidebar';
import { CleanHeader } from './CleanHeader';
import { FileUploadInline } from './FileUploadInline';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { ExportConversationModal } from './ExportConversationModal';
import { GlobalSearchModal } from './GlobalSearchModal';

import { cyberpunkTheme } from '@/styles/themes/cyberpunk';
import { createConversation, getConversationMessages } from '@/lib/conversation-manager';
import type { Conversation } from '@/types/conversation';
import { getVoiceService } from '@/lib/voice-service';
import { getErrorMessage, isRetryableError, ErrorMessages } from '@/lib/error-handler';
import { WebLLMService } from '@/lib/ai/web-llm';
import { ollama } from '@/lib/ai/providers/ollama';

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
  const [activeView, setActiveView] = useState<'chat' | 'paths' | 'tools' | 'insights' | 'music' | 'aura' | 'code' | 'library' | 'memory' | 'settings' | 'autonomy'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [showToolPanel, setShowToolPanel] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isVoiceInput, setIsVoiceInput] = useState(false); // Track if user is using voice input
  const [isListening, setIsListening] = useState(false); // Track if currently recording
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [readingMode, setReadingMode] = useState(false);
  const [webLLMProgress, setWebLLMProgress] = useState<{ progress: number; message: string } | null>(null);
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      const activeElement = document.activeElement;
      const isInputFocused = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;

      // ? - Show keyboard shortcuts
      if (e.key === '?' && !modifier && !isInputFocused) {
        e.preventDefault();
        setShowKeyboardShortcuts(true);
        return;
      }

      if (!modifier) return;

      // Ctrl/Cmd + K - Global search
      if (e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
      // Ctrl/Cmd + E - Export conversation
      else if (e.key === 'e' && messages.length > 0) {
        e.preventDefault();
        setShowExportModal(true);
      }
      // Ctrl/Cmd + M - Toggle sidebar
      else if (e.key === 'm') {
        e.preventDefault();
        setSidebarOpen(prev => !prev);
      }
      // Ctrl/Cmd + B - Toggle voice
      else if (e.key === 'b') {
        e.preventDefault();
        setVoiceEnabled(prev => !prev);
      }
      // Ctrl/Cmd + / - Focus input
      else if (e.key === '/') {
        e.preventDefault();
        document.querySelector('textarea')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [messages.length]);

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
        credentials: 'include',
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
              } else if (data.type === 'signal' && data.content === 'web-llm') {
                console.log('[HollyInterface] 🌐 Switching to Local WebLLM...');
                await handleWebLLMFallback(userMessage, newMessage.id);
                return; // Exit handleSend as WebLLM takes over
              } else if (data.type === 'signal' && data.content === 'local-qwen-7b') {
                console.log('[HollyInterface] 🏠 Switching to Local Ollama (Qwen)...');
                await handleOllamaFallback(userMessage, newMessage.id);
                return; // Exit handleSend as Ollama takes over
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
      const errorMsg = getErrorMessage(error);
      setError(errorMsg);

      // Show error message in chat
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ ${errorMsg}\n\n${isRetryableError(error) ? 'You can try sending your message again.' : 'Please refresh the page and try again.'}`,
        timestamp: new Date(),
      }]);

      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsStreaming(false);
    }
  };

  /**
   * Handle local inference if backend signals WebLLM
   */
  const handleWebLLMFallback = async (userMessage: Message, assistantMessageId: string) => {
    try {
      setWebLLMProgress({ progress: 0, message: 'Initializing WebGPU...' });

      const response = await WebLLMService.chat({
        messages: [{ role: 'user', content: userMessage.content }],
        onProgress: (progress, message) => {
          setWebLLMProgress({ progress, message });
        }
      });

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: response }
            : m
        )
      );
    } catch (err) {
      console.error('[WebLLM] Local inference failed:', err);
      setError('Local AI inference failed. Please try a different query.');
    } finally {
      setWebLLMProgress(null);
      setIsStreaming(false);
    }
  };

  /**
   * Handle local inference via Ollama if requested
   */
  const handleOllamaFallback = async (userMessage: Message, assistantMessageId: string) => {
    try {
      setWebLLMProgress({ progress: 0.1, message: 'Waking up local Qwen 2.5 Neural Link...' });

      const isRunning = await ollama.isRunning();
      if (!isRunning) {
        throw new Error('Ollama is not running. Please start Ollama on your machine.');
      }

      setWebLLMProgress({ progress: 0.5, message: 'Connected to local model. Generating...' });

      const messages = [{ role: 'user', content: userMessage.content }];
      let fullContent = '';

      // Use the stream for real-time feel
      for await (const chunk of ollama.chatStream(messages as any, { model: 'qwen2.5-coder:7b' })) {
        fullContent += chunk;
        setMessages(prev =>
          prev.map(m =>
            m.id === assistantMessageId
              ? { ...m, content: fullContent }
              : m
          )
        );
        // Slowly increase "progress" to show activity
        setWebLLMProgress(prev => prev ? { ...prev, progress: Math.min(0.9, prev.progress + 0.01) } : null);
      }

    } catch (err: any) {
      console.error('[Ollama] Local inference failed:', err);
      setError(err.message || 'Local AI inference failed.');

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessageId
            ? { ...m, content: `❌ Error: ${err.message || 'Local AI failed'}. Please ensure Ollama is running with qwen2.5-coder:7b.` }
            : m
        )
      );
    } finally {
      setWebLLMProgress(null);
      setIsStreaming(false);
    }
  };

  const toggleVoice = () => {
    const newState = voiceService.current.toggle();
    setVoiceEnabled(newState);
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          console.log('[Voice Input] Recognized:', transcript);
          setInput(transcript);
          setIsVoiceInput(true);
          setIsListening(false);

          // Auto-send after voice input
          setTimeout(() => {
            if (transcript.trim()) {
              handleSend();
            }
          }, 500);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('[Voice Input] Error:', event.error);
          setIsListening(false);
          setError('Voice recognition failed. Please try again.');
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Voice input not supported in this browser');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      setIsVoiceInput(true);
      recognitionRef.current.start();
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() || uploadedFiles.length > 0) {
      handleSend();
    }
  };

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden bg-[#0a060e] text-slate-100 font-sans antialiased">
      {/* Main Layout Area */}
      <main className="flex flex-1 overflow-hidden">
        {/* Left Sidebar implementation above... */}

        {/* Main Content Area opens AFTER sidebar */}

        {/* Left Sidebar (Stitch Redesign - Manus Style) */}
        <aside className="hidden lg:flex w-72 flex-col h-full border-r border-white/5 z-20 bg-[#1a1022]/40 backdrop-blur-[20px]">
          {/* Logo Section */}
          <div className="p-8">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-400 to-[#9d25f4] flex items-center justify-center shadow-lg shadow-[#9d25f4]/30">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              </div>
              <h1 className="text-xl font-semibold tracking-widest text-white">HOLLY</h1>
            </div>
          </div>

          {/* New Thread Button */}
          <div className="px-6 mb-8">
            <button onClick={() => { setMessages([]); setConversationId(null); setActiveView('chat'); }} className="w-full py-3 rounded-full relative bg-white/5 flex items-center justify-center gap-2 group hover:opacity-90 transition-all border border-transparent shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]" style={{ isolation: 'isolate' }}>
              <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-[#9d25f4] p-[1px] -z-10" style={{ mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', maskComposite: 'exclude' }}></div>
              <svg className="w-4 h-4 text-cyan-400 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white tracking-wide">New Thread</span>
            </button>
          </div>

          {/* Main Navigation (Integrated into Recent Activity style) */}
          <nav className="flex-1 px-6 overflow-y-auto space-y-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/50 font-bold mb-4 px-2">Neural Domains</p>
            <div onClick={() => setActiveView('chat')} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${activeView === 'chat' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <span className="text-sm truncate font-medium">Neural Core</span>
            </div>
            <div onClick={() => setActiveView('music')} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${activeView === 'music' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
              <span className="text-sm truncate font-medium">Music Studio</span>
            </div>
            <div onClick={() => setActiveView('code')} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${activeView === 'code' ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              <span className="text-sm truncate font-medium">Code Workshop</span>
            </div>

            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-4 px-2 mt-8">Recent Activity</p>
            {/* Conversations map will go here, currently static placeholders to match design */}
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer text-slate-500 hover:text-slate-300 transition-colors">
              <span className="text-sm truncate">Market Analysis Alpha</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 cursor-pointer text-slate-500 hover:text-slate-300 transition-colors">
              <span className="text-sm truncate">Nexa Neural Logic</span>
            </div>
          </nav>

          {/* User Profile Switcher */}
          <div className="p-6 mt-auto">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors">
              <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">STEVE</span>
                <span className="text-[10px] text-cyan-400 uppercase tracking-wider">Premium Access</span>
              </div>
              <svg className="w-4 h-4 ml-auto text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar (Hidden on desktop) */}
        {
          mobileSidebarOpen && (
            <div className="lg:hidden absolute inset-0 bg-[#0a060e]/95 backdrop-blur-xl z-50 flex flex-col pt-16 px-6">
              <h3 className="text-cyan-400 font-bold uppercase tracking-widest text-xs mb-6">Neural Access</h3>
              <div className="space-y-4">
                <button onClick={() => { setActiveView('chat'); setMobileSidebarOpen(false); }} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all ${activeView === 'chat' ? 'bg-cyan-400/10 border border-cyan-400/50 text-cyan-400' : 'bg-purple-500/10 border border-purple-500/30 text-purple-300'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  <span className="font-bold tracking-widest uppercase">Neural Core</span>
                </button>
                {/* ... other mobile links can be restored later if needed ... */}
              </div>
            </div>
          )
        }

        {/* Main Content Area Re-opened */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[radial-gradient(circle_at_50%_50%,rgba(157,37,244,0.05)_0%,transparent_100%)]">
          {/* Header */}
          <header className="flex items-center justify-between px-10 py-6 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-500 hover:text-cyan-400 transition-colors">
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-medium text-slate-200">{activeView === 'chat' ? (messages.length === 0 ? 'New Chat' : 'Active Session') : activeView.toUpperCase()}</h2>
            </div>
            <div className="flex items-center gap-1">
              <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors group">
                <svg className="w-5 h-5 group-hover:text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
              </button>
              <button className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors group">
                <svg className="w-5 h-5 group-hover:text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>
              <button onClick={() => setShowExportModal(true)} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors group">
                <svg className="w-5 h-5 group-hover:text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              </button>
              <div className="w-px h-6 bg-white/10 mx-2"></div>
              <button onClick={() => { if (confirm('Clear session?')) { setMessages([]); setConversationId(null); } }} className="p-2 hover:bg-white/5 rounded-lg text-slate-400 transition-colors group">
                <svg className="w-5 h-5 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </header>

          {/* ... end existing sidebar ... */}
          {/* Active View Render */}
          <div className="flex-1 overflow-y-auto w-full relative z-0 flex flex-col">
            {activeView === 'music' ? (
              <div className="flex-1 flex flex-col pt-12 text-center text-slate-400">
                <div className="p-8"><p>[ Music Studio Loading... ]</p></div>
              </div>
            ) : activeView === 'aura' ? (
              <div className="flex-1 flex flex-col pt-12 text-center text-slate-400">
                <div className="p-8"><p>[ AURA A&R Compiling... ]</p></div>
              </div>
            ) : activeView === 'code' ? (
              <div className="flex-1 flex flex-col pt-12 text-center text-slate-400">
                <div className="p-8"><p>[ Code Workshop Initiating... ]</p></div>
              </div>
            ) : activeView === 'library' ? (
              <div className="flex-1 flex flex-col pt-12 text-center text-slate-400">
                <div className="p-8"><p>[ Universal Library Syncing... ]</p></div>
              </div>
            ) : activeView === 'memory' ? (
              <div className="flex-1 flex flex-col pt-12 text-center text-slate-400">
                <div className="p-8"><p>[ Neural Memory Scanning... ]</p></div>
              </div>
            ) : activeView === 'insights' ? (
              <div className="flex-1 flex flex-col pt-12 text-center text-slate-400">
                <div className="p-8"><p>[ Strategic Insights Processing... ]</p></div>
              </div>
            ) : activeView === 'settings' ? (
              <div className="flex-1 flex flex-col pt-12 text-center text-slate-400">
                <div className="p-8"><p>[ System Configuration Access... ]</p></div>
              </div>
            ) : activeView === 'autonomy' ? (
              <div className="flex-1 flex flex-col pt-12 text-center text-slate-400">
                <div className="p-8"><p>[ Neural Autonomy Restricted... ]</p></div>
              </div>
            ) : null}

            {/* View Area for Non-Chat Routes */}
            {activeView !== 'chat' ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
                <div className="w-24 h-24 mb-6 rounded-3xl bg-purple-500/10 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(34,211,238,0.15)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-cyan-400/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Image src="/assets/holly_logo_premium.png" alt="Holly Model" width={48} height={48} className="opacity-80 mix-blend-screen" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white mb-2 uppercase">
                  {activeView === 'paths' ? 'Neural Paths' : activeView === 'tools' ? 'Agent Tools' : 'Data Insights'}
                </h1>
                <p className="text-purple-300/80 max-w-md">
                  This subsystem is currently compiling. Deep integration with Nexa databases is required to visualize {activeView}.
                </p>
                <button onClick={() => setActiveView('chat')} className="mt-8 px-6 py-2.5 rounded-full bg-cyan-400/10 border border-cyan-400/50 text-cyan-400 font-bold tracking-widest uppercase hover:bg-cyan-400 hover:text-black transition-all">
                  Return to Neural Core
                </button>
              </div>
            ) : (
              <div className={`flex-1 overflow-y-auto ${readingMode ? 'reading-mode' : ''} px-6 pb-40`}>
                {isLoadingConversation ? (
                  <div className="flex items-center justify-center h-full min-h-[50vh]">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
                      <p className="text-slate-400">Restoring conversation data...</p>
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] px-4 w-full h-full relative">
                    {/* Background Radial Glow */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(157,37,244,0.1)_0%,_rgba(34,211,238,0.02)_40%,_transparent_70%)] pointer-events-none"></div>

                    {/* Central Focus Area (Stitch Redesign) */}
                    <div className="relative mb-12">
                      <div className="absolute inset-0 bg-[#9d25f4]/20 blur-[100px] rounded-full"></div>
                      <div className="absolute inset-0 bg-[#22d3ee]/10 blur-[60px] rounded-full translate-x-10 translate-y-10"></div>
                      <div className="h-32 w-32 rounded-full border border-white/10 flex items-center justify-center relative z-10">
                        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#9d25f4] to-[#22d3ee] shadow-[0_0_40px_rgba(157,37,244,0.4)] flex items-center justify-center">
                          <Image src="/assets/holly_logo_premium.png" alt="Holly Logo" width={40} height={40} className="mix-blend-screen opacity-90" />
                        </div>
                      </div>
                    </div>

                    <h2 className="text-4xl md:text-5xl font-light text-white tracking-tight text-center mb-10 max-w-2xl">
                      What are we <span className="font-medium text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-[#9d25f4]">building</span> today?
                    </h2>

                    <div className="flex gap-4 flex-wrap justify-center relative z-20">
                      <button onClick={() => setInput('Develop App')} className="px-6 py-2.5 rounded-full bg-[#1a1022]/40 backdrop-blur-[20px] hover:bg-white/10 transition-all text-sm font-medium text-slate-300 hover:text-white border border-white/5 whitespace-nowrap">
                        Develop App
                      </button>
                      <button onClick={() => setInput('Analyze Data')} className="px-6 py-2.5 rounded-full bg-[#1a1022]/40 backdrop-blur-[20px] hover:bg-white/10 transition-all text-sm font-medium text-slate-300 hover:text-white border border-white/5 whitespace-nowrap">
                        Analyze Data
                      </button>
                      <button onClick={() => setInput('Write Script')} className="px-6 py-2.5 rounded-full bg-[#1a1022]/40 backdrop-blur-[20px] hover:bg-white/10 transition-all text-sm font-medium text-slate-300 hover:text-white border border-white/5 whitespace-nowrap">
                        Write Script
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <ChatMessage
                        key={message.id}
                        message={message}
                        autoPlayVoice={isVoiceInput && index === messages.length - 1 && message.role === 'assistant'}
                      />
                    ))}
                    {isStreaming && (
                      <div className="flex items-center gap-2 mt-4 p-4">
                        <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                        <span className="text-slate-400 text-sm italic">
                          HOLLY Neural Core compiling response...
                        </span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}

                {/* Tool Execution Panel */}
                {showToolPanel && toolCalls.length > 0 && (
                  <ToolExecutionPanel
                    toolCalls={toolCalls}
                    onClose={() => setShowToolPanel(false)}
                  />
                )}

                {/* Input Terminal (Stitch Redesign) */}
                <div className="w-full max-w-5xl mx-auto px-6 pb-12 shrink-0 z-40 relative">
                  {/* File Preview */}
                  {uploadedFiles.length > 0 && (
                    <div className="mb-4 absolute bottom-full left-6 bg-black/60 backdrop-blur-md rounded-xl p-3 border border-purple-500/30">
                      <FileUploadInline
                        files={uploadedFiles}
                        onRemove={(id) => setUploadedFiles(prev => prev.filter(f => f.id !== id))}
                      />
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="relative bg-[#1a1022]/40 backdrop-blur-[20px] rounded-[32px] flex items-center px-4 md:px-6 py-3 md:py-4 border border-white/10 shadow-2xl w-full">
                    {/* Left Actions */}
                    <div className="flex items-center gap-1 md:gap-2 mr-2 md:mr-4 border-r border-white/10 pr-2 md:pr-4 shrink-0">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-400 hover:text-cyan-400 transition-colors relative">
                        <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                      </button>
                      <button type="button" onClick={toggleListening} className={`p-2 transition-colors ${isListening ? 'text-red-400 animate-pulse' : 'text-slate-400 hover:text-cyan-400'}`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      </button>
                    </div>

                    {/* Main Input */}
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      disabled={isLoadingConversation || isStreaming}
                      placeholder="Message HOLLY..."
                      className="flex-1 min-w-0 bg-transparent border-none focus:ring-0 text-slate-200 placeholder:text-slate-500 font-light text-sm md:text-base outline-none p-0"
                    />

                    {/* Right Actions */}
                    <div className="flex items-center gap-2 md:gap-3 ml-2 shrink-0">
                      <button type="button" onClick={toggleVoice} className={`p-2 transition-colors hidden sm:block ${voiceEnabled ? 'text-[#9d25f4]' : 'text-slate-500 hover:text-slate-300'}`}>
                        {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                      </button>

                      <button
                        type="submit"
                        disabled={(!input.trim() && uploadedFiles.length === 0) || isLoadingConversation || isStreaming}
                        className="h-10 w-10 md:h-12 md:w-12 shrink-0 rounded-full bg-gradient-to-tr from-cyan-400 to-[#9d25f4] flex items-center justify-center shadow-lg shadow-[#9d25f4]/20 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                      >
                        {isStreaming ? (
                          <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                        ) : (
                          <svg className="w-5 h-5 text-white transform -rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        )}
                      </button>
                    </div>
                  </form>
                  <p className="text-center text-[10px] text-slate-600 mt-4 tracking-widest uppercase pb-2">
                    HOLLY Neural Engine v4.0 • Secured by Nexa
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modals */}
      < KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)
        }
      />

      < ExportConversationModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        messages={
          messages.map(m => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.timestamp,
          }))
        }
        title={conversationId ? `Conversation ${conversationId}` : 'HOLLY Conversation'}
      />

      {/* WebLLM Initialization HUD */}
      {
        webLLMProgress && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md">
            <div
              className="w-full max-w-md p-8 rounded-2xl border text-center space-y-6 shadow-2xl"
              style={{
                backgroundColor: cyberpunkTheme.colors.background.secondary,
                borderColor: cyberpunkTheme.colors.primary.cyan,
                boxShadow: `0 0 30px ${cyberpunkTheme.colors.primary.cyan}40`
              }}
            >
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-white/10" />
                  <div
                    className="absolute inset-0 rounded-full border-4 border-t-transparent animate-spin"
                    style={{ borderColor: `${cyberpunkTheme.colors.primary.cyan} transparent transparent transparent` }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold" style={{ color: cyberpunkTheme.colors.primary.cyan }}>
                      {Math.round(webLLMProgress.progress * 100)}%
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-bold tracking-wider uppercase" style={{ color: cyberpunkTheme.colors.text.primary }}>
                  Initializing Local Neural Link
                </h3>
                <p className="text-sm mt-2 opacity-70" style={{ color: cyberpunkTheme.colors.text.secondary }}>
                  {webLLMProgress.message}
                </p>
              </div>

              <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/10">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${webLLMProgress.progress * 100}%`,
                    background: cyberpunkTheme.colors.gradients.primary
                  }}
                />
              </div>

              <p className="text-xs italic" style={{ color: cyberpunkTheme.colors.text.secondary }}>
                Downloading model weights (~2.8GB) to your browser cache for 100% private, free inference.
              </p>
            </div>
          </div>
        )
      }
    </div >
  );
}
