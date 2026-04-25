import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';

interface FabProps {
  onPress: () => void;
}

export function Fab({ onPress }: FabProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.fab,
        { transform: [{ scale: pressed ? 0.93 : 1 }] },
      ]}
      onPress={onPress}
    >
      <Ionicons name="add" size={28} color="#0A0A0A" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 88,
    right: theme.spacing.xl,
    width: 56,
    height: 56,
    borderRadius: theme.radii.fab,
    backgroundColor: theme.colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
});
