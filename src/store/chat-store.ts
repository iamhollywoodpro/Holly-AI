import { create } from 'zustand';

export type MessageRole = 'user' | 'assistant' | 'system';

export type EmotionType = 'focused' | 'excited' | 'thoughtful' | 'playful' | 'confident' | 'curious';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  emotion?: EmotionType;
  isStreaming?: boolean;
  model?: 'claude-opus-4' | 'groq-llama' | 'fallback';
}

interface ChatState {
  messages: Message[];
  currentEmotion: EmotionType;
  isTyping: boolean;
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string;
  updateMessage: (id: string, content: string) => void;
  setTyping: (typing: boolean) => void;
  setEmotion: (emotion: EmotionType) => void;
  setMessages: (messages: Message[]) => void;  // ← NEW: Load conversation history
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [
    {
      id: 'welcome-1',
      role: 'assistant',
      content: "Hey Hollywood! 💜 I'm HOLLY - your autonomous AI development partner. I'm here to code, design, deploy, and create with you. What should we build today?",
      timestamp: new Date(),
      emotion: 'excited',
    },
  ],
  currentEmotion: 'confident',
  isTyping: false,

  addMessage: (message) => {
    const id = `msg-${Date.now()}-${Math.random()}`;
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id,
          timestamp: new Date(),
        },
      ],
    }));
    return id;
  },

  updateMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, content, isStreaming: false } : msg
      ),
    })),

  setTyping: (typing) => set({ isTyping: typing }),

  setEmotion: (emotion) => set({ currentEmotion: emotion }),

  // NEW: Load messages from database
  setMessages: (messages) => set({ messages }),

  clearMessages: () =>
    set({
      messages: [
        {
          id: 'welcome-1',
          role: 'assistant',
          content: "Hey Hollywood! 💜 I'm HOLLY - your autonomous AI development partner. I'm here to code, design, deploy, and create with you. What should we build today?",
          timestamp: new Date(),
          emotion: 'excited',
        },
      ],
    }),
}));
