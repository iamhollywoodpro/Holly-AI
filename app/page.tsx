'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Brain, Target, Menu } from 'lucide-react';
import { DynamicLogoGreeting } from '@/components/header/DynamicLogoGreeting';
import ParticleField from '@/components/ui/ParticleField';
import MessageBubble from '@/components/chat/MessageBubble';
import ChatInputControls from '@/components/chat/ChatInputControls';
import { WorkLogFeed } from '@/components/work-log';
import BrainConsciousnessIndicator from '@/components/consciousness/BrainConsciousnessIndicator';
import { Sidebar2 } from '@/components/navigation/Sidebar2';
import MemoryTimeline from '@/components/consciousness/MemoryTimeline';
import { useUser } from '@clerk/nextjs';
import { getVoiceInput, getVoiceOutput, isSpeechRecognitionAvailable, isSpeechSynthesisAvailable } from '@/lib/voice/voice-handler';
import { useConsciousnessState } from '@/hooks/useConsciousnessState';
import { UserButton } from '@clerk/nextjs';
import FileUploadPreview from '@/components/chat/FileUploadPreview';
import TypingIndicator from '@/components/chat/TypingIndicator';
import KeyboardShortcuts from '@/components/ui/KeyboardShortcuts';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { HelpCircle, Calendar, FileText } from 'lucide-react';
import GoogleDriveBanner from '@/components/banners/GoogleDriveBanner';
import OnboardingCheck from '@/components/onboarding/OnboardingCheck';
import DebugToggle from '@/components/debug/DebugToggle';
import DebugPanel from '@/components/debug/DebugPanel';
import { SuggestionsPanel } from '@/components/suggestions/SuggestionsPanel';
import { useSuggestions } from '@/hooks/useSuggestions';
import type { Suggestion } from '@/types/suggestions';
import { SummaryPanel } from '@/components/summary/SummaryPanel';
import { useSummary } from '@/hooks/useSummary';
import { SuccessToast } from '@/components/notifications/SuccessToast';
import { DriveIndicator } from '@/components/indicators/DriveIndicator';
import { GitHubIndicator } from '@/components/indicators/GitHubIndicator';
import { useSearchParams } from 'next/navigation';
import { CommandHandler, CommandHandlerRef } from '@/components/chat/CommandHandler';
import { GitHubConnectionDropdown } from '@/components/header/GitHubConnectionDropdown';
import { ProfileDropdown } from '@/components/header/ProfileDropdown';
import { DriveConnectionDropdown } from '@/components/header/DriveConnectionDropdown';
import { MobileMenu } from '@/components/header/MobileMenu';
import { KeyboardShortcutsModal } from '@/components/modals/KeyboardShortcutsModal';
import { CommandHintToast } from '@/components/notifications/CommandHintToast';
import { Bars3Icon } from '@heroicons/react/24/outline';
// PersonalizedGreeting removed - now using DynamicLogoGreeting in sidebar

import LoadingIndicator, { getLoadingMessage } from '@/components/chat/LoadingIndicator';
import { useActiveRepos } from '@/hooks/useActiveRepos';
import QuickActionsBar from '@/components/ui/QuickActionsBar';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  emotion?: string;
  thinking?: boolean;
  attachments?: {
    type: 'image' | 'audio' | 'video' | 'document' | 'file';
    name: string;
    url: string;
    size?: number;
    mimeType?: string;
    // Analysis data
    vision?: any;
    music?: any;
  }[];
}

export default function ChatPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const commandHandlerRef = useRef<CommandHandlerRef>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [isTyping, setIsTyping] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(true); // Chat history instead of goals
  const [showMemory, setShowMemory] = useState(false);
  const [isVoiceInputActive, setIsVoiceInputActive] = useState(false);
  const [isVoiceOutputActive, setIsVoiceOutputActive] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [githubRepoCount, setGithubRepoCount] = useState(0);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [lastInputWasVoice, setLastInputWasVoice] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [driveConnected, setDriveConnected] = useState(false);
  const [allConversations, setAllConversations] = useState<any[]>([]);
  const [recentUploadedFiles, setRecentUploadedFiles] = useState<any[]>([]); // 👁️  Store files with vision data

  // Phase 2: Chat UX Polish state

  const [loadingAction, setLoadingAction] = useState<string>('chat');
  const getCurrentRepo = useActiveRepos(state => state.getCurrentRepo);
  const activeRepo = getCurrentRepo(); // Get current active repo

  // Fetch real consciousness state
  const { state: consciousnessState, refresh: refreshConsciousness } = useConsciousnessState({
    refreshInterval: 30000, // Update every 30 seconds
    enabled: true
  });
  const [isLoadingConversation, setIsLoadingConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceInputRef = useRef(getVoiceInput());
  const voiceOutputRef = useRef(getVoiceOutput());

  // AI Suggestions
  const suggestions = useSuggestions({
    conversationId: currentConversationId,
    enabled: true,
    autoHideDelay: 30000,
  });

  // Chat History Summarization
  const summary = useSummary({
    conversationId: currentConversationId,
    autoGenerate: true,
    autoGenerateDelay: 600000, // 10 minutes
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for Google Drive connection success
  useEffect(() => {
    const success = searchParams.get('success');
    if (success === 'drive_connected') {
      setSuccessMessage('🎉 Google Drive connected successfully! Your files will be automatically saved.');
      setShowSuccessToast(true);
    }
  }, [searchParams]);
  
  // Fetch GitHub connection info and conversations
  useEffect(() => {
    const fetchGitHubInfo = async () => {
      try {
        const response = await fetch('/api/github/connection', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.connected) {
            setGithubUsername(data.username || '');
            setGithubRepoCount(data.repoCount || 0);
          }
        }
      } catch (error) {
        console.error('Failed to fetch GitHub info:', error);
      }
    };
    
    const fetchDriveStatus = async () => {
      try {
        const response = await fetch('/api/google-drive/status', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        if (response.ok) {
          const data = await response.json();
          setDriveConnected(data.success && data.connected);
        }
      } catch (error) {
        console.error('Failed to fetch Drive status:', error);
      }
    };
    
    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/conversations');
        if (response.ok) {
          const data = await response.json();
          setAllConversations(data.conversations || []);
        }
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      }
    };
    
    fetchGitHubInfo();
    fetchDriveStatus();
    fetchConversations();
  }, []);
  
  // Refresh conversations when title changes or new conversation created
  useEffect(() => {
    const handleRefresh = () => {
      fetch('/api/conversations')
        .then(res => res.json())
        .then(data => setAllConversations(data.conversations || []))
        .catch(err => console.error('Failed to refresh conversations:', err));
    };
    
    window.addEventListener('conversation-title-updated', handleRefresh);
    return () => window.removeEventListener('conversation-title-updated', handleRefresh);
  }, []);

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

  // Handle suggestion click
  const handleSuggestionClick = async (suggestion: Suggestion) => {
    // Track usage for learning
    suggestions.trackUsage(suggestion);
    
    // Dismiss suggestions
    suggestions.dismiss();
    
    // Handle different action types
    switch (suggestion.action) {
      case 'send_message':
        // Send the suggestion as a message
        if (suggestion.payload) {
          await handleSend(suggestion.payload, false);
        }
        break;
        
      case 'navigate':
        // Navigate to a different page
        if (suggestion.payload) {
          window.location.href = suggestion.payload;
        }
        break;
        
      case 'execute_tool':
        // Execute a specific tool/action
        // TODO: Implement tool execution logic
        console.log('Execute tool:', suggestion.payload);
        break;
        
      default:
        console.warn('Unknown suggestion action:', suggestion.action);
    }
  };

  // Handle jump to message from summary
  const handleJumpToMessage = (messageId: string) => {
    // Find the message element
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      // Scroll to the message
      messageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Highlight the message briefly
      messageElement.classList.add('ring-2', 'ring-purple-500', 'ring-offset-2', 'ring-offset-gray-900');
      setTimeout(() => {
        messageElement.classList.remove('ring-2', 'ring-purple-500', 'ring-offset-2', 'ring-offset-gray-900');
      }, 2000);
      
      // Close the summary panel
      summary.closeFullPanel();
    }
  };

  const handleSend = async (message: string, fromVoice: boolean = false) => {
    if (!message.trim() || isTyping) return;
    
    // Check if it's a command FIRST
    const commandResult = commandHandlerRef.current?.executeCommand(message.trim());
    if (commandResult === true) {
      // Command executed successfully - don't send to AI
      return;
    } else if (typeof commandResult === 'string') {
      // Command returned an error message - show it to user
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: commandResult,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }
    
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
            content: m.content,
            // 👁️  Include file attachments with vision data for last message
            fileAttachments: m.id === userMessage.id ? recentUploadedFiles : undefined
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

      // Refresh AI suggestions after response
      setTimeout(() => {
        suggestions.refresh();
      }, 1000);

      // Auto-speak response if user used voice input
      if (shouldAutoSpeak && accumulatedContent) {
        const voiceOutput = voiceOutputRef.current;
        setTimeout(() => {
          voiceOutput.speak(accumulatedContent, {
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
      
      // 👁️  Clear uploaded files after message sent
      setRecentUploadedFiles([]);

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

      // Build file links with vision/music descriptions
      const fileLinks = results.map((r, idx) => {
        let link = `- [${r.file.name}](${r.file.url}) (${(r.file.size / 1024).toFixed(1)} KB)`;
        
        // 👁️  If vision analysis available, add it!
        if (r.vision && r.vision.summary) {
          link += `\n  👁️  *HOLLY sees: ${r.vision.summary}*`;
        }
        
        // 🎵 If music analysis available, add A&R notes!
        if (r.music) {
          link += `\n  🎵 **HOLLY's A&R Analysis:**`;
          link += `\n    • **Hit Score:** ${r.music.hitScore}/10 (⭐️ ${r.music.hitScore >= 8 ? 'Strong hit potential!' : r.music.hitScore >= 6.5 ? 'Solid commercial track' : 'Needs refinement'})`;
          link += `\n    • **BPM:** ${Math.round(r.music.bpm)} | **Key:** ${r.music.key} | **Tempo:** ${r.music.tempo}`;
          link += `\n    • **Production:** ${r.music.productionScore}/10`;
          link += `\n    • **Billboard:** ${r.music.chartPotential} (Predicted Peak: #${r.music.predictedPeak})`;
          if (r.music.strengths && r.music.strengths.length > 0) {
            link += `\n    • **Strengths:** ${r.music.strengths.join(', ')}`;
          }
          link += `\n    📝 *${r.music.overallAssessment}*`;
        }
        
        return link;
      }).join('\n');

      // Store uploaded files with vision data for next message
      const uploadedFiles = results.map((r, idx) => ({
        name: r.file.name,
        url: r.file.url,
        type: files[idx].type,
        vision: r.vision // Includes description, summary, keyElements
      }));
      
      // Store in state for next message (you'll need to add this state)
      setRecentUploadedFiles(uploadedFiles);

      // Create attachments array with all file data
      const attachments = results.map((r, idx) => {
        let fileType: 'image' | 'audio' | 'video' | 'document' | 'file' = 'file';
        if (files[idx].type.startsWith('image/')) fileType = 'image';
        else if (files[idx].type.startsWith('audio/')) fileType = 'audio';
        else if (files[idx].type.startsWith('video/')) fileType = 'video';
        else if (files[idx].type.includes('pdf') || files[idx].type.includes('document')) fileType = 'document';
        
        return {
          type: fileType,
          name: r.file.name,
          url: r.file.url,
          size: r.file.size,
          mimeType: files[idx].type,
          vision: r.vision,
          music: r.music
        };
      });

      const successMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `✅ **Files uploaded successfully!**\n\n${fileLinks}\n\nHow would you like me to help with these files?`,
        timestamp: new Date(),
        emotion: 'confident',
        attachments // Include visual attachments
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
        {/* NEW Sidebar2 - Navigation + Chat History */}
        <Sidebar2 
          currentConversationId={currentConversationId || undefined}
          onSelectConversation={loadConversation}
          onNewConversation={createNewConversation}
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0 md:ml-64 transition-all duration-300">
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
              <div className="flex flex-col items-center justify-center h-full p-6 max-w-3xl mx-auto">
                <p className="text-gray-400 text-base text-center">Start a conversation to build something amazing 💬</p>
              </div>
            ) : (
              messages.map((message, index) => (
                message.thinking ? (
                  <LoadingIndicator key={message.id} {...getLoadingMessage(loadingAction)} />
                ) : (
                  <div key={message.id} id={`message-${message.id}`} className="transition-all duration-300">
                    <MessageBubble
                      message={message}
                      index={index}
                      conversationId={currentConversationId}
                    />
                  </div>
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
            <div className="max-w-4xl mx-auto w-full space-y-4">
              {/* AI Suggestions Panel */}
              <SuggestionsPanel
                suggestions={suggestions.suggestions}
                onSelectSuggestion={handleSuggestionClick}
                onDismiss={suggestions.dismiss}
                isVisible={suggestions.isVisible && !isTyping}
              />
              
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
      
      {/* Summary Panel - Full-screen modal */}
      <SummaryPanel
        summary={summary.summary}
        isOpen={summary.showFullPanel}
        onClose={summary.closeFullPanel}
        onJumpToMessage={handleJumpToMessage}
        onExport={summary.exportAsMarkdown}
      />
      
      {/* Success Toast - Google Drive & other notifications */}
      <SuccessToast
        message={successMessage}
        show={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
        duration={5000}
      />
      
      {/* Command Handler for /workflows, /team, /issues commands */}
      <CommandHandler ref={commandHandlerRef} />
      
      {/* Mobile Menu - Hamburger navigation */}
      <MobileMenu
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        conversations={allConversations}
        currentConversationId={currentConversationId}
        onSelectConversation={(id) => {
          loadConversation(id);
          setShowMobileMenu(false);
        }}
        onNewChat={() => {
          createNewConversation('');
          setShowMobileMenu(false);
        }}
        onOpenMemory={() => {
          setShowMemory(true);
          setShowMobileMenu(false);
        }}
        onOpenSettings={() => {
          window.location.href = '/settings/integrations';
        }}
        onOpenKeyboardShortcuts={() => {
          setShowKeyboardShortcuts(true);
          setShowMobileMenu(false);
        }}
        onToggleDebug={() => setDebugMode(!debugMode)}
        debugMode={debugMode}
        githubUsername={githubUsername}
        githubRepoCount={githubRepoCount}
        onOpenRepoSelector={() => commandHandlerRef.current?.executeCommand('/repos')}
        driveConnected={driveConnected}
      />
      
      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
      
      {/* Command Hint Toast - Shows once */}
      <CommandHintToast />

      {/* Quick Actions Bar - Floating */}
      <QuickActionsBar
        onNewChat={() => createNewConversation('')}
        onOpenRepos={() => commandHandlerRef.current?.executeCommand('/repos')}
        onOpenIssues={() => commandHandlerRef.current?.executeCommand('/issues')}
        onToggleDebug={() => setDebugMode(!debugMode)}
      />
    </div>
    </>
  );
}
