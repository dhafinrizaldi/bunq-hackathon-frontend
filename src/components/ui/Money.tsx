import { StyleSheet, View } from 'react-native';
import { Text as RNText } from 'react-native';
import type { TextStyle } from 'react-native';
import { theme } from '../../theme/theme';
import type { AccentKey } from '../../theme/palette';

export type MoneyColor = 'primary' | 'inverse' | 'positive' | 'negative' | AccentKey;
type MoneySize  = 'small' | 'medium' | 'large' | 'hero';

interface Props {
  amountCents: number;
  currency?: string;
  size?: MoneySize;
  color?: MoneyColor;
}

const colorMap: Record<MoneyColor, string> = {
  primary:  theme.colors.textPrimary,
  inverse:  theme.colors.textInverse,
  positive: theme.colors.positive,
  negative: theme.colors.negative,
  magenta:  theme.colors.accents.magenta,
  cyan:     theme.colors.accents.cyan,
  lime:     theme.colors.accents.lime,
  yellow:   theme.colors.accents.yellow,
  orange:   theme.colors.accents.orange,
  purple:   theme.colors.accents.purple,
};

type SizeSpec = {
  symbol: Pick<TextStyle, 'fontSize' | 'fontWeight'>;
  whole:  Pick<TextStyle, 'fontSize' | 'fontWeight' | 'letterSpacing'>;
  dec:    Pick<TextStyle, 'fontSize' | 'fontWeight'>;
};

const sizeConfig: Record<MoneySize, SizeSpec> = {
  small: {
    symbol: { fontSize: 11, fontWeight: '600' },
    whole:  { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
    dec:    { fontSize: 11, fontWeight: '600' },
  },
  medium: {
    symbol: { fontSize: 14, fontWeight: '600' },
    whole:  { fontSize: 19, fontWeight: '700', letterSpacing: -0.2 },
    dec:    { fontSize: 13, fontWeight: '600' },
  },
  large: {
    symbol: { fontSize: 18, fontWeight: '600' },
    whole:  { fontSize: 32, fontWeight: '700', letterSpacing: -0.6 },
    dec:    { fontSize: 20, fontWeight: '600' },
  },
  hero: {
    symbol: { fontSize: 24, fontWeight: '600' },
    whole:  { fontSize: 40, fontWeight: '800', letterSpacing: -0.6 },
    dec:    { fontSize: 26, fontWeight: '600' },
  },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

export function Money({ amountCents, currency = 'EUR', size = 'medium', color = 'primary' }: Props) {
  const amount     = amountCents / 100;
  const whole      = Math.floor(Math.abs(amount));
  const dec        = Math.abs(amountCents % 100).toString().padStart(2, '0');
  const isNegative = amountCents < 0;
  const symbol     = CURRENCY_SYMBOLS[currency] ?? currency;
  const c          = colorMap[color];
  const s          = sizeConfig[size];
  const monoFamily = theme.typography.money.fontFamily;

  return (
    <View style={styles.row}>
      {isNegative && (
        <RNText style={[s.symbol, { color: c, fontFamily: monoFamily }]}>-</RNText>
      )}
      <RNText style={[s.symbol, { color: c, fontFamily: monoFamily }]}>{symbol}</RNText>
      <RNText style={[s.whole, { color: c, fontFamily: monoFamily }]}>{whole}</RNText>
      <RNText style={[s.dec, { color: c, opacity: 0.7, fontFamily: monoFamily }]}>.{dec}</RNText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
});
