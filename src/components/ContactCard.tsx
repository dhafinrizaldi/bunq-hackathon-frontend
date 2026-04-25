import { useState } from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';
import type { Contact } from '../types/types';

interface ContactCardProps {
  contact: Contact;
  selected: boolean;
  onPress: () => void;
}

export function ContactCard({ contact, selected, onPress }: ContactCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        pressed && styles.cardPressed,
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
      <Text style={styles.name} numberOfLines={1}>{contact.name.split(' ')[0]}</Text>
      {contact.distanceMeters !== undefined && (
        <Text style={styles.distance}>~{contact.distanceMeters}m</Text>
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
  },
  cardSelected: {
    backgroundColor: theme.colors.accentSubtle,
    borderWidth: 1.5,
    borderColor: theme.colors.accentPrimary,
  },
  cardPressed: {
    opacity: 0.8,
  },
  avatarContainer: {
    width: 52,
    height: 52,
    borderRadius: theme.radii.full,
    overflow: 'hidden',
  },
  avatar: {
    width: 52,
    height: 52,
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
    ...theme.typography.micro,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  distance: {
    ...theme.typography.micro,
    color: theme.colors.textTertiary,
  },
});
