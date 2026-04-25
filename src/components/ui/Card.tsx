import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { theme } from '../../theme/theme';
import type { AccentKey } from '../../theme/palette';
import { accentNeedsInverseText } from '../../theme/palette';

export type CardVariant = 'default' | 'accent' | 'solid';

interface CardProps {
  variant?: CardVariant;
  accent?: AccentKey;
  elevated?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({
  variant = 'default',
  accent,
  elevated = false,
  onPress,
  children,
  style,
}: CardProps) {
  const bg = getBackground(variant, accent, elevated);
  const cardStyle = [styles.card, { backgroundColor: bg }, style];

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [
          ...cardStyle,
          pressed && { opacity: 0.85, transform: [{ scale: 0.985 }] },
        ]}
        onPress={onPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

function getBackground(variant: CardVariant, accent?: AccentKey, elevated?: boolean): string {
  if (variant === 'solid' && accent) {
    return theme.colors.accents[accent];
  }
  if (variant === 'accent' && accent) {
    return theme.colors.accentTints[accent];
  }
  return elevated ? theme.colors.bgElevated : theme.colors.bgRaised;
}

// Helper: returns whether content on this card should use inverse (dark) text
export function cardNeedsInverseText(variant: CardVariant, accent?: AccentKey): boolean {
  return variant === 'solid' && !!accent && accentNeedsInverseText[accent];
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radii.lg,
    padding: theme.spacing.base,
    overflow: 'hidden',
  },
});
