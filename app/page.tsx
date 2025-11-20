'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Target, Menu } from 'lucide-react';
import ParticleField from '@/components/ui/ParticleField';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInputControls from '@/components/chat/ChatInputControls';
import { WorkLogFeed } from '@/components/work-log';
import BrainConsciousnessIndicator from '@/components/consciousness/BrainConsciousnessIndicator';
import ChatHistory from '@/components/chat/ChatHistory';
import MemoryTimeline from '@/components/consciousness/MemoryTimeline';
import { useUser } from '@clerk/nextjs';
import { getVoiceInput, getVoiceOutput, isSpeechRecognitionAvailable, isSpeechSynthesisAvailable } from '@/lib/voice/voice-handler';
import { useConsciousnessState } from '@/hooks/useConsciousnessState';
import { UserButton } from '@clerk/nextjs';
import FileUploadPreview from '@/components/chat/FileUploadPreview';
import TypingIndicator from '@/components/chat/TypingIndicator';
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { HelpCircle, Calendar } from 'lucide-react';
import GoogleDriveBanner from '@/components/banners/GoogleDriveBanner';
import OnboardingCheck from '@/components/onboarding/OnboardingCheck';
import DebugToggle from '@/components/debug/DebugToggle';
import DebugPanel from '@/components/debug/DebugPanel';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotion?: string;
  thinking?: boolean;
}

export default function ChatPage() {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [isTyping, setIsTyping] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(true); // Chat history instead of goals
  const [showMemory, setShowMemory] = useState(false);
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  const [isVoiceOutputActive, setIsVoiceOutputActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [lastInputWasVoice, setLastInputWasVoice] = useState(false);

  // Fetch real consciousness state
  const { state: consciousnessState, refresh: refreshConsciousness } = useConsciousnessState({
    refreshInterval: 30000, // Update every 30 seconds
    enabled: true
  });
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceInputRef = useRef(getVoiceInput());
  const voiceOutputRef = useRef(getVoiceOutput());

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Don't auto-create conversations - wait for user to send first message
  // This prevents empty "New Conversation" entries from cluttering the sidebar

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
  const createNewConversation = async (firstMessage?: string) => {
    try {
      console.log('[Chat] Creating new conversation for user:', user?.id || 'none');
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: firstMessage ? undefined : 'New Conversation',
          firstMessage: firstMessage
        })
      });
      
      const data = await response.json();
      console.log('[Chat] Create conversation response:', data);
      
      if (response.ok && data.conversation) {
        setCurrentConversationId(data.conversation.id);
        setMessages([]); // Clear messages for new conversation
        console.log('[Chat] ✅ New conversation created:', data.conversation.id);
        return data.conversation.id;
      } else {
        console.error('[Chat] ❌ Failed to create conversation:', data.error || 'Unknown error');
        return null;
      }
    } catch (error) {
      console.error('[Chat] ❌ Failed to create conversation (exception):', error);
      return null;
    }
  };

  // Load conversation from history
  const loadConversation = async (conversationId: string) => {
    try {
      setIsLoadingConversation(true);
      
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      const data = await response.json();
      
      if (response.ok && data.messages) {
        // Convert database messages to UI format
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

  const handleSend = async (message: string, fromVoice: boolean = false) => {
    if (!message.trim() || isTyping) return;
    
    // Track if this is from voice (will be reset after response)
    const shouldAutoSpeak = fromVoice || lastInputWasVoice;

    // Ensure conversation exists before sending message
    let conversationId = currentConversationId;
    if (!conversationId) {
      console.log('[Chat] No conversation found, creating one...');
      conversationId = await createNewConversation(message);
      if (!conversationId) {
        console.error('[Chat] Failed to create conversation, cannot send message');
        return;
      }
      // Update state
      setCurrentConversationId(conversationId);
    }

    console.log('[Chat] Sending message with conversation ID:', conversationId);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    // Save user message to database (use local conversationId, not state)
    saveMessageToDb(conversationId, 'user', message);

    // Add thinking indicator
    const thinkingMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      thinking: true
    };
    setMessages(prev => [...prev, thinkingMessage]);

    try {
      // Call real HOLLY chat API with user context
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
          conversationId: conversationId || `chat-${Date.now()}`
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Remove thinking indicator
      setMessages(prev => prev.filter(m => !m.thinking));

      // Handle streaming response
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

      // Save HOLLY's response to database (use conversationId variable from handleSend)
      if (conversationId && accumulatedContent) {
        saveMessageToDb(conversationId, 'assistant', accumulatedContent, 'curious');
        
        // Generate smart title after first message exchange
        if (messages.length === 0) {
          console.log('[Chat] First message - generating smart title...');
          try {
            const titleResponse = await fetch('/api/conversations/generate-title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ firstMessage: message })
            });
            
            if (titleResponse.ok) {
              const { title } = await titleResponse.json();
              console.log('[Chat] ✅ Generated title:', title);
              
              // Update conversation title
              await fetch(`/api/conversations/${conversationId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
              });
              
              // Notify ChatHistory to refresh
              window.dispatchEvent(new CustomEvent('conversation-title-updated', { 
                detail: { conversationId, title } 
              }));
            }
          } catch (error) {
            console.error('[Chat] Failed to generate title:', error);
          }
        }
      }

      // Refresh consciousness state after interaction
      refreshConsciousness();

      // Auto-speak response if user used voice input
      if (shouldAutoSpeak && accumulatedContent) {
        const voiceOutput = voiceOutputRef.current;
        setTimeout(() => {
          voiceOutput.speak(accumulatedContent, {
            provider: 'elevenlabs',
            elevenLabsVoiceId: 'charlotte',
            volume: 0.9,
            onStart: () => setIsVoiceOutputActive(true),
            onEnd: () => setIsVoiceOutputActive(false),
            onError: (error) => {
              console.error('Voice output error:', error);
              setIsVoiceOutputActive(false);
            }
          });
        }, 500);
      }
      
      // Reset voice input flag
      setLastInputWasVoice(false);

      setIsTyping(false);
    } catch (error) {
      console.error('Chat error:', error);
      
      // Remove thinking indicator
      setMessages(prev => prev.filter(m => !m.thinking));
      
      // Show error message
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

  // Show file preview before uploading
  const handleFilesSelected = (files: File[]) => {
    if (!files || files.length === 0) return;
    setPendingFiles(Array.from(files));
    setShowFilePreview(true);
  };

  // Remove file from preview
  const handleRemoveFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
    if (pendingFiles.length <= 1) {
      setShowFilePreview(false);
    }
  };

  // Cancel upload
  const handleCancelUpload = () => {
    setPendingFiles([]);
    setShowFilePreview(false);
  };

  // Confirm and upload files
  const handleConfirmUpload = async () => {
    setShowFilePreview(false);
    const files = pendingFiles;
    setPendingFiles([]);
    
    if (!files || files.length === 0) return;

    try {
      // Show uploading message
      const uploadingMessage: Message = {
        id: `upload-${Date.now()}`,
        role: 'assistant',
        content: `📤 Uploading ${files.length} file(s)...`,
        timestamp: new Date(),
        thinking: true
      };
      setMessages(prev => [...prev, uploadingMessage]);

      // Upload files in parallel
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

      // Remove uploading message
      setMessages(prev => prev.filter(m => m.id !== uploadingMessage.id));

      // Add success message with file links
      const fileLinks = results.map(r => 
        `- [${r.fileName}](${r.url}) (${(r.fileSize / 1024).toFixed(1)} KB)`
      ).join('\n');

      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **Files uploaded successfully!**\n\n${fileLinks}\n\nHow would you like me to help with these files?`,
        timestamp: new Date(),
        emotion: 'confident'
      };
      setMessages(prev => [...prev, successMessage]);

      // Save to database
      if (currentConversationId) {
        saveMessageToDb(currentConversationId, 'assistant', successMessage.content, 'confident');
      }

    } catch (error) {
      console.error('File upload error:', error);
      
      // Remove uploading message
      setMessages(prev => prev.filter(m => m.thinking));
      
      // Show error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ **Upload failed**: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease try again or check your file size (max 50MB).`,
        timestamp: new Date(),
        emotion: 'concerned'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleVoiceInput = () => {
    if (!isSpeechRecognitionAvailable()) {
      alert('Voice input is not supported in your browser. Please try Chrome, Edge, or Safari.');
      return;
    }

    const voiceInput = voiceInputRef.current;

    if (isVoiceInputActive) {
      // Stop listening
      voiceInput.stop();
      setIsVoiceInputActive(false);
    } else {
      // Start listening
      voiceInput.start(
        (transcript) => {
          // Voice recognized - send as message
          handleSend(transcript, true); // Pass true to indicate voice input
          setIsVoiceInputActive(false);
        },
        (error) => {
          // Error occurred
          console.error('Voice input error:', error);
          alert(error);
          setIsVoiceInputActive(false);
        }
      );
      setIsVoiceInputActive(true);
    }
  };

  // Voice output is now ONLY triggered by clicking speaker icon in MessageBubble
  // No automatic speaking

  // Register keyboard shortcuts (after all functions are declared)
  useKeyboardShortcuts([
    { key: '?', handler: () => setShowKeyboardShortcuts(true), description: 'Show shortcuts' },
    { key: 'n', ctrl: true, handler: createNewConversation, description: 'New chat' },
    { key: '/', ctrl: true, handler: () => setShowChatHistory(!showChatHistory), description: 'Toggle history' },
  ], !showKeyboardShortcuts); // Disable when shortcuts modal is open

  return (
    <>
      {/* Onboarding Check - Redirects first-time users */}
      <OnboardingCheck />
      
      <div className="chat-container relative w-full h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black overflow-hidden" style={{ height: '100dvh' }}>
      {/* Animated Particle Background */}
      <ParticleField />

      {/* Main Container */}
      <div className="relative z-10 flex h-full" style={{ height: '100%' }}>
        {/* Chat History Sidebar - Left - REPLACES GOALS */}
        <AnimatePresence>
          {showChatHistory && (
            <motion.div
              initial={{ x: -300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="hidden md:block w-80 border-r border-gray-800/50"
            >
              <ChatHistory
                key={currentConversationId || 'no-conversation'}
                currentConversationId={currentConversationId || undefined}
                onSelectConversation={loadConversation}
                onNewConversation={createNewConversation}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Google Drive Banner - Shows if not connected */}
          <GoogleDriveBanner />
          {/* Header - MOBILE OPTIMIZED */}
          <motion.div 
            className="relative z-50 px-3 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 border-b border-gray-800/50 bg-gray-900/30 backdrop-blur-xl"
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0">
                {/* HOLLY Logo - SMALLER ON MOBILE */}
                <motion.div
                  className="relative w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 flex-shrink-0"
                  animate={{
                    scale: [1, 1.05, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-xl sm:rounded-2xl blur-lg sm:blur-xl opacity-50" />
                  <div className="relative w-full h-full bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center border border-white/20">
                    <Brain className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
                  </div>
                </motion.div>

                {/* Title - RESPONSIVE WITH STATUS */}
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent truncate">
                    HOLLY
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400 truncate">
                    {user?.fullName ? `Hey ${user.fullName.split(' ')[0]}!` : 'Hey Hollywood!'} Ready to build?
                  </p>
                </div>
              </div>

              {/* Right Side: Action Buttons + Consciousness */}
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
                {/* Toggle Buttons - HIDDEN ON MOBILE */}
                <motion.button
                  onClick={() => setShowChatHistory(!showChatHistory)}
                  className="hidden md:flex px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 text-xs sm:text-sm text-gray-300 items-center gap-2 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Toggle chat history"
                >
                  <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">History</span>
                </motion.button>
                <motion.button
                  onClick={() => setShowMemory(!showMemory)}
                  className="hidden md:flex px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg border border-gray-700/50 text-xs sm:text-sm text-gray-300 items-center gap-2 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Toggle memory"
                >
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Memory</span>
                </motion.button>

                {/* Keyboard Shortcuts Button */}
                <motion.button
                  onClick={() => setShowKeyboardShortcuts(true)}
                  className="hidden sm:flex w-9 h-9 items-center justify-center rounded-lg bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 text-gray-400 hover:text-white transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Keyboard shortcuts"
                  title="Keyboard shortcuts (?)"
                >
                  <HelpCircle className="w-5 h-5" />
                </motion.button>

                {/* Brain Consciousness Indicator */}
                <BrainConsciousnessIndicator state={consciousnessState} />
                
                {/* Timeline Link */}
                <a
                  href="/timeline"
                  className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                  title="Project Timeline"
                >
                  <Calendar className="w-5 h-5" />
                </a>
                
                {/* Debug Toggle */}
                <DebugToggle />
                
                {/* User Profile Button */}
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
          </motion.div>

          {/* Messages Area - MOBILE OPTIMIZED */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
            {isLoadingConversation ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4" />
                  <p className="text-gray-400">Loading conversation...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-gray-500 text-sm">Start a conversation...</p>
              </div>
            ) : (
              messages.map((message, index) => (
                message.thinking ? (
                  <TypingIndicator key={message.id} status="thinking" />
                ) : (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    index={index}
                  />
                )
              ))
            )}
            
            {/* Work Log Feed - Disabled for regular chat */}
            {false && currentConversationId && (
              <WorkLogFeed 
                conversationId={currentConversationId}
                enabled={true}
                maxLogs={20}
              />
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* File Upload Preview - Floating */}
          {showFilePreview && (
            <FileUploadPreview
              files={pendingFiles}
              onRemove={handleRemoveFile}
              onConfirm={handleConfirmUpload}
              onCancel={handleCancelUpload}
            />
          )}

          {/* Keyboard Shortcuts Modal */}
          <KeyboardShortcuts
            isOpen={showKeyboardShortcuts}
            onClose={() => setShowKeyboardShortcuts(false)}
          />

          {/* Input Area with New Controls - MOBILE OPTIMIZED */}
          <motion.div 
            className="px-3 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 border-t border-gray-800/50 bg-gray-900/30 backdrop-blur-xl safe-bottom"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
          >
            <div className="max-w-4xl mx-auto w-full">
              <ChatInputControls
                onSend={handleSend}
                onFileUpload={handleFilesSelected}
                onVoiceInput={handleVoiceInput}
                disabled={isTyping || isLoadingConversation}
                isVoiceActive={isVoiceInputActive}
              />
            </div>
          </motion.div>
        </div>

        {/* Memory Timeline - Right - HIDDEN ON MOBILE */}
        <AnimatePresence>
          {showMemory && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', damping: 25 }}
              className="hidden lg:block w-80 border-l border-gray-800/50"
            >
              <MemoryTimeline />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Debug Panel - Bottom of screen */}
      <DebugPanel />
    </div>
    </>
  );
}
