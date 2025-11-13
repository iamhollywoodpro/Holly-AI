// HOLLY Chat Interface - SERVER-SIDE UPLOAD VERSION

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, BarChart3, Paperclip } from 'lucide-react';
import { ConversationSidebar } from './conversation-sidebar';
import { ConversationSearch } from './conversation-search';
import { ConversationTags } from './conversation-tags';
import { ConversationExport } from './conversation-export';
import { StatsDashboard } from './stats-dashboard';
import { EmotionIndicator } from './emotion-indicator';
import { FileUploadZone } from './file-upload-zone';
import { useConversations } from '@/hooks/use-conversations';
import { useConversationStats } from '@/hooks/use-conversation-stats';
import { uploadFileViaAPI } from '@/lib/file-upload-client';
import { analyzeAudioComplete, generateFeedbackSummary } from '@/lib/audio-analyzer';

interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  emotion?: string;
  model?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

type EmotionType = 'focused' | 'excited' | 'thoughtful' | 'playful' | 'confident' | 'curious';

interface ChatInterfaceProps {
  userId: string;
}

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  progress: number;
  type: 'audio' | 'video' | 'image' | 'code' | 'document' | 'data' | 'other';
  metadata?: {
    duration?: number;
    dimensions?: { width: number; height: number };
    size: number;
  };
}

export function ChatInterface({ userId }: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('confident');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [showUploadZone, setShowUploadZone] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    error,
    createConversation,
    selectConversation,
    addMessage,
    updateConversationTitle,
    togglePin,
    deleteConversation,
  } = useConversations(userId);

  const { statsData, isLoading: statsLoading, refetchStats } = useConversationStats(userId);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectConversation = useCallback((conversationId: string) => {
    selectConversation(conversationId);
    setShowSearch(false);
  }, [selectConversation]);

  const handleNewConversation = async () => {
    console.log('Creating new conversation...');
    const newConv = await createConversation('New Conversation');
    if (newConv) {
      console.log('New conversation created:', newConv.id);
    } else {
      console.error('Failed to create conversation');
    }
  };

  const handleTagsChange = async (tags: Array<{ id: string; name: string; color: string }>) => {
    if (!currentConversation) return;
    try {
      await fetch(`/api/conversations/${currentConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metadata: { ...currentConversation.metadata, tags },
        }),
      });
    } catch (err) {
      console.error('Failed to update tags:', err);
    }
  };

  // FIXED: File upload using server-side API
  const handleFilesSelected = async (uploadedFiles: UploadedFile[]) => {
    console.log('[handleFilesSelected] Received files:', uploadedFiles.length);

    if (!currentConversation) {
      alert('Please start a conversation first');
      return;
    }

    setIsUploading(true);
    setShowUploadZone(false);

    try {
      const uploadedUrls: string[] = [];
      const feedbackMessages: string[] = [];

      for (const uploadedFile of uploadedFiles) {
        const file = uploadedFile.file;
        
        console.log('[handleFilesSelected] Processing:', file.name);

        if (!(file instanceof File)) {
          console.error('[handleFilesSelected] Not a File object:', file);
          feedbackMessages.push(`❌ Invalid file: ${uploadedFile.id}`);
          continue;
        }

        // Upload via server-side API (bypasses RLS)
        const uploadResult = await uploadFileViaAPI(file, userId, currentConversation.id);
        
        if (!uploadResult.success || uploadResult.error) {
          console.error('Upload error:', uploadResult.error);
          feedbackMessages.push(`❌ Failed to upload ${file.name}: ${uploadResult.error}`);
          continue;
        }

        if (uploadResult.publicUrl) {
          uploadedUrls.push(uploadResult.publicUrl);
          
          // Analyze audio files
          const audioExtensions = ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'wma'];
          const fileExtension = file.name.split('.').pop()?.toLowerCase();
          
          if (fileExtension && audioExtensions.includes(fileExtension)) {
            try {
              // Analyze music file with feedback
              const analysisResult = await analyzeAudioComplete(file, uploadResult.publicUrl, true);
              
              if (analysisResult.feedback) {
                const feedback = generateFeedbackSummary(analysisResult.feedback);
                feedbackMessages.push(`🎵 **Music Analysis for "${file.name}"**:\n\n${feedback}`);
              } else if (analysisResult.error) {
                feedbackMessages.push(`✅ Uploaded ${file.name}\n⚠️ Analysis error: ${analysisResult.error}`);
              } else {
                feedbackMessages.push(`✅ Uploaded ${file.name} (audio analysis unavailable)`);
              }
            } catch (analysisError) {
              console.error('Analysis error:', analysisError);
              feedbackMessages.push(`✅ Uploaded ${file.name}\n⚠️ Analysis failed: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`);
            }
          } else {
            feedbackMessages.push(`✅ Uploaded ${file.name}`);
          }
        }
      }

      if (feedbackMessages.length > 0) {
        // Include file URLs in the message so HOLLY can see them
        let messageContent = feedbackMessages.join('\n\n');
        if (uploadedUrls.length > 0) {
          messageContent += '\n\n**Uploaded Files:**\n' + uploadedUrls.map(url => `- ${url}`).join('\n');
        }
        await addMessage('user', messageContent, undefined, undefined, currentConversation.id);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileRemove = (fileId: string) => {
    console.log('[handleFileRemove] Removed:', fileId);
  };

  const generateSmartTitle = (message: string): string => {
    const cleaned = message.trim().replace(/\s+/g, ' ');
    if (cleaned.length <= 40) return cleaned;
    
    const words = cleaned.split(' ');
    const titleWords = words.slice(0, 8);
    let title = titleWords.join(' ');
    
    if (words.length > 8) title += '...';
    if (title.length > 60) title = title.substring(0, 57) + '...';
    
    return title;
  };

  // FIXED: Conversation state handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming || isUploading) return;

    const userMessage = input.trim();
    setInput('');
    setIsStreaming(true);
    setStreamingMessage('');
    setCurrentEmotion('thoughtful');

    try {
      let conversationToUse = currentConversation;
      let isNewConversation = false;
      
      // Create conversation if needed
      if (!conversationToUse) {
        console.log('[handleSubmit] Creating conversation...');
        isNewConversation = true;
        
        const newConv = await createConversation('New Chat...');
        if (!newConv) {
          throw new Error('Failed to create conversation');
        }
        
        conversationToUse = newConv;
        console.log('[handleSubmit] Created:', conversationToUse.id);
        
        // No need to wait - we pass conversationId explicitly to addMessage
      }

      // Verify we have a conversation
      if (!conversationToUse?.id) {
        throw new Error('No active conversation - state sync failed');
      }

      console.log('[handleSubmit] Using conversation:', conversationToUse.id);

      // Add user message - pass conversationId explicitly
      await addMessage('user', userMessage, undefined, undefined, conversationToUse.id);

      // Stream AI response
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            ...messages.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: userMessage },
          ],
          conversationId: conversationToUse.id,
          userId,
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;
                  setStreamingMessage(fullResponse);
                  setCurrentEmotion('confident');
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Save assistant response - pass conversationId explicitly
      if (fullResponse) {
        await addMessage('assistant', fullResponse, 'confident', 'gpt-4', conversationToUse.id);
      }

      // Update title for new conversations
      if (isNewConversation && conversationToUse?.id) {
        const smartTitle = generateSmartTitle(userMessage);
        console.log('[handleSubmit] Updating title to:', smartTitle);
        await updateConversationTitle(conversationToUse.id, smartTitle);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setCurrentEmotion('curious');
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsStreaming(false);
      setStreamingMessage('');
    }
  };

  const displayMessages = [
    ...messages,
    ...(streamingMessage
      ? [{
          id: 'streaming',
          conversation_id: currentConversation?.id || '',
          role: 'assistant' as const,
          content: streamingMessage,
          created_at: new Date().toISOString(),
        }]
      : []),
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <ConversationSidebar
        conversations={conversations}
        currentConversation={currentConversation}
        onSelectConversation={selectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={deleteConversation}
        onTogglePin={togglePin}
        onOpenSearch={() => setShowSearch(true)}
        isLoading={isLoading}
      />

      <div className="flex-1 flex flex-col">
        {currentConversation && (
          <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {currentConversation.title}
                  </h2>
                  <EmotionIndicator emotion={currentEmotion} />
                </div>
                <div className="mt-2">
                  <ConversationTags
                    conversationId={currentConversation.id}
                    tags={currentConversation.metadata?.tags || []}
                    onTagsChange={handleTagsChange}
                    availableTags={[
                      { id: 'work', name: 'Work', color: '#3b82f6' },
                      { id: 'research', name: 'Research', color: '#8b5cf6' },
                      { id: 'ideas', name: 'Ideas', color: '#f59e0b' },
                      { id: 'bugs', name: 'Bugs', color: '#ef4444' },
                      { id: 'personal', name: 'Personal', color: '#10b981' },
                    ]}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    refetchStats();
                    setShowStats(true);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <BarChart3 className="w-4 h-4" />
                  Stats
                </button>
                <ConversationExport
                  conversation={currentConversation}
                  messages={messages}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {displayMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Hey Hollywood! 👋
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Start a new conversation or select one from the sidebar.
                </p>
              </div>
            </div>
          ) : (
            displayMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-3xl rounded-lg px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">
                        {message.role === 'user' ? 'You' : 'HOLLY'}
                      </p>
                      <div className="prose dark:prose-invert max-w-none">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          
          {isUploading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Uploading and analyzing files...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {showUploadZone && (
          <div className="px-4 pb-4">
            <FileUploadZone
              onFilesSelected={handleFilesSelected}
              onFileRemove={handleFileRemove}
              maxFiles={5}
              maxSizeMB={50}
            />
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message HOLLY..."
              disabled={isStreaming || isUploading}
              className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowUploadZone(!showUploadZone)}
              disabled={isStreaming || isUploading}
              className="px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:bg-gray-300 dark:disabled:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2"
              title="Attach files"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              type="submit"
              disabled={isStreaming || isUploading || !input.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {isStreaming ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>

      {showSearch && (
        <ConversationSearch
          conversations={conversations}
          onSelectConversation={handleSelectConversation}
          isOpen={showSearch}
          onClose={() => setShowSearch(false)}
        />
      )}

      {showStats && statsData && (
        <StatsDashboard
          data={statsData}
          onClose={() => setShowStats(false)}
        />
      )}
    </div>
  );
}
