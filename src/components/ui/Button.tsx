import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type ViewStyle,
} from 'react-native';
import { theme } from '../../theme/theme';
import type { AccentKey } from '../../theme/palette';
import { accentNeedsInverseText } from '../../theme/palette';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'destructive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  accent?: AccentKey;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  accent,
  disabled,
  loading,
  fullWidth = true,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const bg = getBackground(variant, accent);
  const textColor = getTextColor(variant, accent);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg },
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </Pressable>
  );
}

function getBackground(variant: ButtonVariant, accent?: AccentKey): string {
  switch (variant) {
    case 'primary':     return '#FFFFFF';
    case 'accent':      return accent ? theme.colors.accents[accent] : theme.colors.accents.cyan;
    case 'secondary':   return theme.colors.bgElevated;
    case 'ghost':
    case 'destructive': return 'transparent';
  }
}

function getTextColor(variant: ButtonVariant, accent?: AccentKey): string {
  switch (variant) {
    case 'primary':     return '#000000';
    case 'accent':
      if (accent && accentNeedsInverseText[accent]) return '#000000';
      return '#000000';
    case 'secondary':   return theme.colors.textPrimary;
    case 'ghost':       return theme.colors.textSecondary;
    case 'destructive': return theme.colors.negative;
  }
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
