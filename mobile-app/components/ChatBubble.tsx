import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { Message } from '../store/chatStore';

interface ChatBubbleProps {
  message: Message;
}

export const ChatBubble = memo(function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{message.content}</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.row,
        isUser ? styles.rowUser : styles.rowAssistant,
      ]}
    >
      {!isUser && <View style={styles.avatar} />}
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.assistantBubble,
        ]}
      >
        <Text
          style={[
            styles.messageText,
            isUser ? styles.userText : styles.assistantText,
          ]}
        >
          {message.content}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowAssistant: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.purple,
    marginRight: Spacing.sm,
    marginTop: 2,
    borderWidth: 1.5,
    borderColor: Colors.cyan,
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
  },
  userBubble: {
    backgroundColor: Colors.userBubble,
    borderBottomRightRadius: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.purple + '40',
  },
  assistantBubble: {
    backgroundColor: Colors.hollyBubble,
    borderBottomLeftRadius: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.cyan + '25',
  },
  messageText: {
    ...Typography.body,
    lineHeight: 22,
  },
  userText: {
    color: Colors.text,
  },
  assistantText: {
    color: Colors.text,
  },
  timestamp: {
    ...Typography.small,
    marginTop: Spacing.xs,
    textAlign: 'right',
  },
  systemContainer: {
    alignSelf: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  systemText: {
    ...Typography.small,
    textAlign: 'center',
  },
});
