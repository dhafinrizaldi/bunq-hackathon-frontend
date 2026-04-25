import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '../../theme/theme';
import type { ConversationMessage } from '../../hooks/useConversation';
import { TypingIndicator } from './TypingIndicator';

interface Props {
  message: ConversationMessage;
  onRetry: (id: string) => void;
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MessageBubble({ message, onRetry }: Props) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAgent]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAgent]}>
        {message.state === 'sending' ? (
          <TypingIndicator />
        ) : message.state === 'failed' ? (
          <View style={styles.failedContent}>
            <Text style={styles.failedText}>Couldn't reach the agent.</Text>
            <Pressable
              onPress={() => onRetry(message.id)}
              style={({ pressed }) => [styles.retryButton, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.content, isUser ? styles.contentUser : styles.contentAgent]}>
            {message.content}
          </Text>
        )}
      </View>
      <Text style={[styles.timestamp, isUser ? styles.timestampUser : styles.timestampAgent]}>
        {formatTime(message.timestamp)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginHorizontal: theme.spacing.base,
    marginVertical: theme.spacing.xs,
  },
  rowUser: {
    alignItems: 'flex-end',
  },
  rowAgent: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    borderRadius: 18,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  bubbleUser: {
    backgroundColor: theme.colors.accentTints.cyan,
    borderBottomRightRadius: 4,
  },
  bubbleAgent: {
    backgroundColor: theme.colors.bgRaised,
    borderBottomLeftRadius: 4,
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
  },
  contentUser: {
    color: theme.colors.textPrimary,
  },
  contentAgent: {
    color: theme.colors.textPrimary,
  },
  failedContent: {
    gap: theme.spacing.xs,
  },
  failedText: {
    fontSize: 14,
    color: theme.colors.negative,
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: 13,
    color: theme.colors.accents.cyan,
    fontWeight: theme.fonts.weights.semibold,
    textDecorationLine: 'underline',
  },
  timestamp: {
    fontSize: 11,
    color: theme.colors.textTertiary,
    marginTop: 3,
    marginHorizontal: 4,
  },
  timestampUser: {
    textAlign: 'right',
  },
  timestampAgent: {
    textAlign: 'left',
  },
});
