import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { theme } from '../theme/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}

export function TextSplitModal({ visible, onClose, onSubmit }: Props) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  };

  const handleClose = () => {
    setText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Describe the split</Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={4}
            placeholder="Tom had the bitterballen, Anna and I shared the pasta…"
            placeholderTextColor={theme.colors.textTertiary}
            value={text}
            onChangeText={setText}
            autoFocus
            returnKeyType="default"
            textAlignVertical="top"
          />
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.cancelButton, { opacity: pressed ? 0.7 : 1 }]}
              onPress={handleClose}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.submitButton,
                !text.trim() && styles.submitButtonDisabled,
                { opacity: pressed ? 0.85 : 1 },
              ]}
              onPress={handleSubmit}
              disabled={!text.trim()}
            >
              <Text style={styles.submitText}>Continue</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: theme.colors.bgRaised,
    borderTopLeftRadius: theme.radii.xl,
    borderTopRightRadius: theme.radii.xl,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    gap: theme.spacing.base,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.divider,
    alignSelf: 'center',
    marginBottom: theme.spacing.sm,
  },
  title: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
  },
  input: {
    backgroundColor: theme.colors.bgElevated,
    borderRadius: theme.radii.md,
    padding: theme.spacing.base,
    color: theme.colors.textPrimary,
    ...theme.typography.bodyMedium,
    minHeight: 96,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.bgElevated,
    borderRadius: theme.radii.button,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelText: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textSecondary,
  },
  submitButton: {
    flex: 2,
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radii.button,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    ...theme.typography.bodyStrong,
    color: theme.colors.onAccent,
  },
});
