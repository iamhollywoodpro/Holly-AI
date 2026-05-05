import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  isSending: boolean;
  error: string | null;

  getActiveConversation: () => Conversation | null;
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (role: Message['role'], content: string) => void;
  updateLastAssistantMessage: (content: string) => void;
  setStreaming: (streaming: boolean) => void;
  setSending: (sending: boolean) => void;
  setError: (error: string | null) => void;
  clearAll: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      isStreaming: false,
      isSending: false,
      error: null,

      getActiveConversation: () => {
        const { conversations, activeConversationId } = get();
        if (!activeConversationId) return null;
        return (
          conversations.find((c) => c.id === activeConversationId) || null
        );
      },

      createConversation: () => {
        const id = generateId();
        const conversation: Conversation = {
          id,
          title: 'New Chat',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }));
        return id;
      },

      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeConversationId:
            state.activeConversationId === id
              ? null
              : state.activeConversationId,
        }));
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
      },

      addMessage: (role, content) => {
        const { activeConversationId } = get();
        if (!activeConversationId) {
          get().createConversation();
        }

        const message: Message = {
          id: generateId(),
          role,
          content,
          timestamp: Date.now(),
        };

        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id !== (state.activeConversationId || conv.id))
              return conv;
            const isFirst = conv.messages.length === 0;
            const title =
              isFirst && role === 'user'
                ? content.slice(0, 40) + (content.length > 40 ? '...' : '')
                : conv.title;
            return {
              ...conv,
              title,
              messages: [...conv.messages, message],
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      updateLastAssistantMessage: (content) => {
        set((state) => ({
          conversations: state.conversations.map((conv) => {
            if (conv.id !== state.activeConversationId) return conv;
            const msgs = [...conv.messages];
            const lastIdx = msgs.length - 1;
            if (lastIdx >= 0 && msgs[lastIdx].role === 'assistant') {
              msgs[lastIdx] = { ...msgs[lastIdx], content };
            }
            return { ...conv, messages: msgs, updatedAt: Date.now() };
          }),
        }));
      },

      setStreaming: (streaming) => set({ isStreaming: streaming }),
      setSending: (sending) => set({ isSending: sending }),
      setError: (error) => set({ error }),
      clearAll: () =>
        set({
          conversations: [],
          activeConversationId: null,
          isStreaming: false,
          isSending: false,
          error: null,
        }),
    }),
    {
      name: 'holly-chat-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
      }),
    },
  ),
);
