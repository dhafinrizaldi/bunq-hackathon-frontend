import { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import type { Contact } from '../types/types';

interface ContactRowProps {
  contact: Contact;
  selected: boolean;
  onPress: () => void;
}

export function ContactRow({ contact, selected, onPress }: ContactRowProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
      onPress={onPress}
    >
      <View style={styles.avatarContainer}>
        {!imageError ? (
          <Image
            source={{ uri: contact.avatarUrl }}
            style={styles.avatar}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarInitial}>{contact.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name}>{contact.name}</Text>
      <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
        {selected && <Ionicons name="checkmark" size={14} color={theme.colors.onAccent} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    minHeight: 52,
    gap: theme.spacing.sm,
  },
  rowPressed: {
    opacity: 0.7,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.full,
    overflow: 'hidden',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.full,
  },
  avatarFallback: {
    backgroundColor: theme.colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
  },
  name: {
    flex: 1,
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.radii.sm,
    backgroundColor: theme.colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: theme.colors.accentPrimary,
  },
});
