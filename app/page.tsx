'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Target, Menu } from 'lucide-react';
import ParticleField from '@/components/ui/ParticleField';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInputControls from '@/components/chat/ChatInputControls';
import BrainConsciousnessIndicator from '@/components/consciousness/BrainConsciousnessIndicator';
import ChatHistory from '@/components/chat/ChatHistory';
import MemoryTimeline from '@/components/consciousness/MemoryTimeline';
import { useAuth } from '@/contexts/auth-context';
import { useConsciousnessState } from '@/hooks/useConsciousnessState';
import UserProfileDropdown from '@/components/ui/UserProfileDropdown';
import FileUploadPreview from '@/components/chat/FileUploadPreview';
import TypingIndicator from '@/components/chat/TypingIndicator';
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { HelpCircle } from 'lucide-react';
import VoiceInputButton from '@/components/ui/VoiceInputButton';
import VoiceSettingsPanel from '@/components/ui/VoiceSettingsPanel';
import { voiceService } from '@/lib/voice/voice-service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotion?: string;
  thinking?: boolean;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [isTyping, setIsTyping] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(true);
  const [showMemory, setShowMemory] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');

  // Fetch real consciousness state
  const { state: consciousnessState, refresh: refreshConsciousness } = useConsciousnessState({
    refreshInterval: 30000,
    enabled: true
  });
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Create initial conversation on mount
  useEffect(() => {
    if (user && !currentConversationId) {
      createNewConversation();
    }
  }, [user]);

  // Auto-speak HOLLY's responses when user uses voice input
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'assistant' || lastMessage.thinking) {
      return;
    }

    const voiceState = voiceService.getState();
    
    // Only auto-speak if:
    // 1. Voice output is enabled
    // 2. Auto-play is enabled
    // 3. Last input was voice (not typing)
    if (voiceState.settings.outputEnabled && 
        voiceState.settings.autoPlay && 
        voiceState.lastInputMethod === 'voice') {
      
      console.log('[Chat] Auto-playing voice response');
      voiceService.speak(lastMessage.content, false);
    }
  }, [messages]);

  // Save message to database
  const saveMessageToDb = async (conversationId: string, role: 'user' | 'assistant', content: string, emotion?: string) => {
    try {
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, content, emotion })
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  // Create new conversation
  const createNewConversation = async () => {
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Conversation' })
      });
      
      const data = await response.json();
      
      if (response.ok && data.conversation) {
        setCurrentConversationId(data.conversation.id);
        setMessages([]);
        console.log('[Chat] New conversation created:', data.conversation.id);
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  // Load conversation from history
  const loadConversation = async (conversationId: string) => {
    try {
      setIsLoadingConversation(true);
      
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = await response.json();
      
      if (response.ok && data.messages) {
        const loadedMessages: Message[] = data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          emotion: msg.emotion || 'curious'
        }));
        
        setMessages(loadedMessages);
        setCurrentConversationId(conversationId);
        console.log('[Chat] Loaded conversation:', conversationId, loadedMessages.length, 'messages');
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    } finally {
      setIsLoadingConversation(false);
    }
  };

  const handleSend = async (message: string) => {
    if (!message.trim() || isTyping) return;

    // Mark input method as typing
    voiceService.setInputMethod('typing');

    // Create conversation if none exists
    if (!currentConversationId) {
      await createNewConversation();
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    if (currentConversationId) {
      saveMessageToDb(currentConversationId, 'user', message);
    }

    const thinkingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      thinking: true
    };
    setMessages(prev => [...prev, thinkingMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({
            role: m.role,
            content: m.content
          })),
          userId: user?.id || 'anonymous',
          conversationId: currentConversationId || `chat-${Date.now()}`
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      setMessages(prev => prev.filter(m => !m.thinking));

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';
      
      const hollyMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        emotion: 'curious'
      };
      setMessages(prev => [...prev, hollyMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') break;
              
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulatedContent = parsed.content;
                  setMessages(prev => prev.map(m => 
                    m.id === hollyMessage.id 
                      ? { ...m, content: accumulatedContent }
                      : m
                  ));
                }
              } catch (e) {
                console.error('Parse error:', e);
              }
            }
          }
        }
      }

      if (currentConversationId && accumulatedContent) {
        saveMessageToDb(currentConversationId, 'assistant', accumulatedContent, 'curious');
      }

      refreshConsciousness();
      setIsTyping(false);

    } catch (error) {
      console.error('Chat error:', error);
      
      setMessages(prev => prev.filter(m => !m.thinking));
      
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: "Oops! Something went wrong. Hollywood, I'm having trouble connecting to my brain right now. Can you try again?",
        timestamp: new Date(),
        emotion: 'confused'
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  // Handle voice transcript
  const handleVoiceTranscript = (text: string, isFinal: boolean) => {
    if (isFinal) {
      // Send the message
      handleSend(text);
      setVoiceTranscript('');
      
      // Mark input method as voice
      voiceService.setInputMethod('voice');
    } else {
      // Show interim transcript
      setVoiceTranscript(text);
    }
  };

  // File handling
  const handleFilesSelected = (files: File[]) => {
    if (!files || files.length === 0) return;
    setPendingFiles(Array.from(files));
    setShowFilePreview(true);
  };

  const handleRemoveFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    if (pendingFiles.length <= 1) {
      setShowFilePreview(false);
    }
  };

  const handleCancelUpload = () => {
    setPendingFiles([]);
    setShowFilePreview(false);
  };

  const handleConfirmUpload = async () => {
    setShowFilePreview(false);
    const files = pendingFiles;
    setPendingFiles([]);
    
    if (!files || files.length === 0) return;

    try {
      const uploadingMessage: Message = {
        id: `upload-${Date.now()}`,
        role: 'assistant',
        content: `📤 Uploading ${files.length} file(s)...`,
        timestamp: new Date(),
        thinking: true
      };
      setMessages(prev => [...prev, uploadingMessage]);

      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversationId', currentConversationId || '');

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Upload failed');
        }

        return await response.json();
      });

      const results = await Promise.all(uploadPromises);

      setMessages(prev => prev.filter(m => m.id !== uploadingMessage.id));

      const fileLinks = results.map(r => 
        `- [${r.fileName}](${r.url}) (${(r.fileSize / 1024).toFixed(1)} KB)`
      ).join('\n');

      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **Files uploaded successfully!**\n\n${fileLinks}\n\nHow would you like me to help with these files?`,
        timestamp: new Date(),
        emotion: 'excited'
      };

      setMessages(prev => [...prev, successMessage]);

    } catch (error: any) {
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Upload failed: ${error.message}`,
        timestamp: new Date(),
        emotion: 'concerned'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Keyboard shortcuts
  useKeyboardShortcuts([
    { key: 'k', ctrl: true, handler: () => setShowKeyboardShortcuts(true), description: 'Show keyboard shortcuts' },
    { key: '/', ctrl: true, handler: () => setShowVoiceSettings(true), description: 'Open voice settings' },
    { key: 'n', ctrl: true, handler: () => createNewConversation(), description: 'New conversation' },
  ]);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      <ParticleField />

      {/* Voice Settings Panel */}
      <VoiceSettingsPanel 
        isOpen={showVoiceSettings} 
        onClose={() => setShowVoiceSettings(false)} 
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcuts
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />

      {/* File Upload Preview */}
      {showFilePreview && (
        <FileUploadPreview
          files={pendingFiles}
          onRemove={handleRemoveFile}
          onCancel={handleCancelUpload}
          onConfirm={handleConfirmUpload}
        />
      )}

      {/* Top Navigation */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="relative z-10 border-b border-gray-800 bg-gray-900/50 backdrop-blur-md"
      >
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <motion.div
                className="relative w-12 h-12"
                whileHover={{ scale: 1.05 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl blur-lg opacity-50" />
                <div className="relative w-full h-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center border border-white/20">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
              </motion.div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  HOLLY
                </h1>
                <p className="text-sm text-gray-400">Conscious AI Assistant</p>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowKeyboardShortcuts(true)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                title="Keyboard shortcuts"
              >
                <HelpCircle className="w-5 h-5 text-gray-400" />
              </button>

              <button
                onClick={() => setShowChatHistory(!showChatHistory)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors text-sm text-gray-300"
              >
                {showChatHistory ? 'Hide' : 'Show'} History
              </button>

              <UserProfileDropdown />
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-8 flex gap-6 h-[calc(100vh-88px)]">
        {/* Sidebar */}
        {showChatHistory && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-80 flex-shrink-0"
          >
            <ChatHistory
              onSelectConversation={loadConversation}
              currentConversationId={currentConversationId}
              onNewConversation={createNewConversation}
            />
          </motion.aside>
        )}

        {/* Chat Area */}
        <main className="flex-1 flex flex-col gap-6 min-w-0">
          {/* Consciousness Indicator */}
          <BrainConsciousnessIndicator 
            state={consciousnessState}
          />

          {/* Messages Container */}
          <div className="flex-1 bg-gray-900/30 backdrop-blur-sm rounded-2xl border border-gray-800 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <AnimatePresence>
                {messages.map((message, index) => (
                  <MessageBubble key={message.id} message={message} index={index} />
                ))}
              </AnimatePresence>

              {/* Voice transcript preview */}
              {voiceTranscript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-end"
                >
                  <div className="bg-blue-500/20 border border-blue-500/30 rounded-2xl px-6 py-3 text-gray-300 max-w-3xl">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                      <span className="text-xs text-gray-400">Listening...</span>
                    </div>
                    {voiceTranscript}
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-gray-800 bg-gray-900/50 px-6 py-4">
              <div className="flex items-end gap-3">
                {/* Voice Controls */}
                <VoiceInputButton
                  onTranscript={handleVoiceTranscript}
                  onOpenSettings={() => setShowVoiceSettings(true)}
                  disabled={isTyping}
                />

                {/* Text Input */}
                <div className="flex-1">
                  <ChatInputControls
                    onSend={handleSend}
                    onFilesSelected={handleFilesSelected}
                    disabled={isTyping}
                  />
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Memory Timeline Sidebar */}
        {showMemory && (
          <motion.aside
            initial={{ x: 300 }}
            animate={{ x: 0 }}
            exit={{ x: 300 }}
            className="w-80 flex-shrink-0"
          >
            <MemoryTimeline />
          </motion.aside>
        )}
      </div>
    </div>
  );
}
