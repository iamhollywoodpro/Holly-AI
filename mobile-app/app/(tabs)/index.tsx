import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useChatStore, Message } from '../../store/chatStore';
import { useSettingsStore } from '../../store/settingsStore';
import { streamChatMessage, sendChatMessage } from '../../services/api';
import { ChatBubble } from '../../components/ChatBubble';
import { VoiceButton } from '../../components/VoiceButton';
import { Colors, Spacing, BorderRadius, Typography } from '../../constants/theme';

export default function ChatScreen() {
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const conversations = useChatStore((s) => s.conversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const isSending = useChatStore((s) => s.isSending);
  const error = useChatStore((s) => s.error);

  const getActiveConversation = useChatStore((s) => s.getActiveConversation);
  const createConversation = useChatStore((s) => s.createConversation);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateLastAssistantMessage = useChatStore((s) => s.updateLastAssistantMessage);
  const setStreaming = useChatStore((s) => s.setStreaming);
  const setSending = useChatStore((s) => s.setSending);
  const setError = useChatStore((s) => s.setError);
  const setActiveConversation = useChatStore((s) => s.setActiveConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);

  const apiKey = useSettingsStore((s) => s.apiKey);
  const chatModel = useSettingsStore((s) => s.chatModel);

  const activeConversation = getActiveConversation();
  const messages = activeConversation?.messages || [];

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length, messages[messages.length - 1]?.content]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isSending || isStreaming) return;

    Keyboard.dismiss();
    setInputText('');

    let convId = activeConversationId;
    if (!convId) {
      convId = createConversation();
    }

    addMessage('user', text);

    try {
      setSending(true);
      setError(null);
      setStreaming(true);
      addMessage('assistant', '');

      const currentConv = useChatStore.getState().getActiveConversation();
      const chatMessages = (currentConv?.messages || [])
        .filter((m) => m.role !== 'system')
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }));

      if (!apiKey) {
        updateLastAssistantMessage(
          'Please configure your API key in Settings to connect to HOLLY AI.',
        );
        setStreaming(false);
        setSending(false);
        return;
      }

      const fullText = await streamChatMessage(
        chatMessages,
        (chunk) => {
          updateLastAssistantMessage(chunk);
        },
        { model: chatModel },
      );

      updateLastAssistantMessage(fullText || 'No response received.');
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to get response from HOLLY AI';
      updateLastAssistantMessage(`Error: ${errorMsg}`);
      setError(errorMsg);
    } finally {
      setStreaming(false);
      setSending(false);
    }
  }, [
    inputText,
    isSending,
    isStreaming,
    activeConversationId,
    apiKey,
    chatModel,
    addMessage,
    createConversation,
    setError,
    setSending,
    setStreaming,
    updateLastAssistantMessage,
  ]);

  const handleNewChat = useCallback(() => {
    createConversation();
    setInputText('');
    inputRef.current?.focus();
  }, [createConversation]);

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      setInputText(text);
    },
    [],
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => <ChatBubble message={item} />,
    [],
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>HOLLY AI</Text>
            <Text style={styles.emptySubtitle}>
              Your AI-powered music industry assistant
            </Text>
            <TouchableOpacity style={styles.newChatButton} onPress={handleNewChat}>
              <Text style={styles.newChatButtonText}>Start a conversation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            keyboardShouldPersistTaps="handled"
          />
        )}

        {error && (
          <View style={styles.errorBar}>
            <Text style={styles.errorText} numberOfLines={1}>{error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Text style={styles.errorDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <VoiceButton
            size={40}
            onTranscript={handleVoiceTranscript}
          />
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask HOLLY anything..."
            placeholderTextColor={Colors.textMuted}
            multiline
            maxLength={4000}
            editable={!isSending}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isSending}
          >
            {isSending ? (
              <ActivityIndicator size="small" color={Colors.background} />
            ) : (
              <Text style={styles.sendButtonText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.cyan,
    letterSpacing: 4,
    marginBottom: Spacing.sm,
  },
  emptySubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
  },
  newChatButton: {
    backgroundColor: Colors.purple,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.cyan + '40',
  },
  newChatButtonText: {
    color: Colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  messageList: {
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  errorBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.error + '20',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.error + '40',
  },
  errorText: {
    color: Colors.error,
    fontSize: 13,
    flex: 1,
  },
  errorDismiss: {
    color: Colors.error,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: Spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    color: Colors.text,
    fontSize: 16,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    backgroundColor: Colors.cyan,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    height: 46,
  },
  sendButtonDisabled: {
    backgroundColor: Colors.textMuted + '40',
  },
  sendButtonText: {
    color: Colors.background,
    fontWeight: '700',
    fontSize: 15,
  },
});
