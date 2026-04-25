import { View, StyleSheet } from 'react-native';
import type { ViewStyle } from 'react-native';
import { theme } from '../theme/theme';

type Variant = 'default' | 'hero';

interface CardProps {
  variant?: Variant;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export function Card({ variant = 'default', style, children }: CardProps) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.bgRaised,
  },
  default: {
    borderRadius: theme.radii.lg,
    padding: theme.spacing.base,
  },
  hero: {
    borderRadius: theme.radii.xl,
    padding: theme.spacing.xl,
  },
});
