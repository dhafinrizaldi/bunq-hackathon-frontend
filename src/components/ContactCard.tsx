import { View, Pressable, StyleSheet } from 'react-native';
import { theme, accentForKey } from '../theme/theme';
import { Text } from './ui/Text';
import { CategoryIcon } from './ui/CategoryIcon';
import type { Contact } from '../types/types';

interface ContactCardProps {
  contact: Contact;
  selected: boolean;
  onPress: () => void;
}

export function ContactCard({ contact, selected, onPress }: ContactCardProps) {
  const accent = accentForKey(contact.name);
  const tint = theme.colors.accentTints[accent];

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        selected && { backgroundColor: tint, borderColor: theme.colors.accents[accent], borderWidth: 1.5 },
        pressed && styles.cardPressed,
      ]}
      onPress={onPress}
    >
      <CategoryIcon
        initials={contact.name.slice(0, 2)}
        accent={accent}
        size={52}
      />
      <Text variant="micro" color="primary" style={styles.name} numberOfLines={1}>
        {contact.name.split(' ')[0]}
      </Text>
      {contact.distanceMeters !== undefined && (
        <Text variant="micro" color="tertiary">~{contact.distanceMeters}m</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 80,
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.sm,
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginRight: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cardPressed: {
    opacity: 0.8,
  },
  name: {
    textAlign: 'center',
  },
});
