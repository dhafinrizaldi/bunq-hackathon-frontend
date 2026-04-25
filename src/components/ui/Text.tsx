import { Text as RNText, type TextProps as RNTextProps, StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';
import type { AccentKey } from '../../theme/palette';

export type TextVariant =
  | 'hero' | 'title' | 'heading'
  | 'body' | 'bodyMedium' | 'bodyStrong'
  | 'label' | 'labelStrong' | 'labelUpper' | 'micro'
  | 'money' | 'moneyHero' | 'moneyMedium';

export type TextColor =
  | 'primary' | 'secondary' | 'tertiary' | 'inverse'
  | 'positive' | 'negative'
  | AccentKey;

const colorMap: Record<TextColor, string> = {
  primary:   theme.colors.textPrimary,
  secondary: theme.colors.textSecondary,
  tertiary:  theme.colors.textTertiary,
  inverse:   theme.colors.textInverse,
  positive:  theme.colors.positive,
  negative:  theme.colors.negative,
  magenta:   theme.colors.accents.magenta,
  cyan:      theme.colors.accents.cyan,
  lime:      theme.colors.accents.lime,
  yellow:    theme.colors.accents.yellow,
  orange:    theme.colors.accents.orange,
  purple:    theme.colors.accents.purple,
};

interface TextProps extends Omit<RNTextProps, 'style'> {
  variant?: TextVariant;
  color?: TextColor;
  style?: RNTextProps['style'];
}

export function Text({ variant = 'body', color = 'primary', style, ...props }: TextProps) {
  return (
    <RNText
      style={[styles[variant], { color: colorMap[color] }, style]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  hero:        theme.typography.hero,
  title:       theme.typography.title,
  heading:     theme.typography.heading,
  body:        theme.typography.body,
  bodyMedium:  theme.typography.bodyMedium,
  bodyStrong:  theme.typography.bodyStrong,
  label:       theme.typography.label,
  labelStrong: theme.typography.labelStrong,
  labelUpper:  theme.typography.labelUpper,
  micro:       theme.typography.micro,
  money:       theme.typography.money,
  moneyHero:   theme.typography.moneyHero,
  moneyMedium: theme.typography.moneyMedium,
});
