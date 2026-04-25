// Demo notes:
// - Mic needs mic permission; verify works in Expo Go before demo
// - MCP /query takes 3-8s typically — typing indicator is the recovery UX
// - MCP 500s: failed state + Retry button is the demo recovery path
// - Split-via-chat ("Split €X with Y and Z") requires those names in the bunq sandbox history
import { useCallback, useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { useConversation } from '../hooks/useConversation';
import { MessageBubble } from '../components/agent/MessageBubble';
import { ChatInput } from '../components/agent/ChatInput';
import { WelcomeState } from '../components/agent/WelcomeState';
import { Text } from '../components/ui/Text';
import { RainbowStripe } from '../components/ui/RainbowStripe';

export default function AgentScreen() {
  const { messages, loaded, sendMessage, retryMessage, clearConversation } = useConversation();
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  const isEmpty = messages.length === 0;
  const hasPendingAgent = messages.some(m => m.state === 'sending');

  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(
      () => scrollViewRef.current?.scrollToEnd({ animated: true }),
      80
    );
    return () => clearTimeout(timer);
  }, [messages, loaded]);

  const handleSend = useCallback((text: string) => { sendMessage(text); }, [sendMessage]);
  const handleSuggestion = useCallback((text: string) => { sendMessage(text); }, [sendMessage]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text variant="title" color="primary">Ask</Text>
          <Text variant="label" color="tertiary">Your money, in plain English</Text>
        </View>
        {!isEmpty && (
          <Pressable
            onPress={clearConversation}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={18} color={theme.colors.textSecondary} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {isEmpty ? (
          <WelcomeState onSelectPrompt={handleSuggestion} />
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onRetry={retryMessage}
              />
            ))}
          </ScrollView>
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + theme.spacing.sm }]}>
          <ChatInput onSend={handleSend} disabled={hasPendingAgent} />
        </View>
      </KeyboardAvoidingView>

      <RainbowStripe height={3} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.base,
  },
  headerText: {
    gap: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: theme.spacing.base,
  },
  inputBar: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.bgBase,
  },
});
