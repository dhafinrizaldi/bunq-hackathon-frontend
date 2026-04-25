import { View, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme, accentForKey } from '../theme/theme';
import { Text } from './ui/Text';
import { CategoryIcon } from './ui/CategoryIcon';
import type { Contact } from '../types/types';

interface ContactRowProps {
  contact: Contact;
  selected: boolean;
  onPress: () => void;
}

export function ContactRow({ contact, selected, onPress }: ContactRowProps) {
  const accent = accentForKey(contact.name);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
    >
      <CategoryIcon
        initials={contact.name.slice(0, 2)}
        accent={accent}
        size={40}
      />
      <Text variant="bodyStrong" color="primary" style={styles.name}>{contact.name}</Text>
      <View style={[
        styles.checkbox,
        selected && { backgroundColor: theme.colors.accents[accent] },
      ]}>
        {selected && <Ionicons name="checkmark" size={14} color="#000000" />}
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
  name: {
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
