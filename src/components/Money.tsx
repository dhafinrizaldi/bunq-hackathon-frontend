import { Text } from 'react-native';
import { theme } from '../theme/theme';

type Variant = 'display' | 'hero' | 'body' | 'small';

interface MoneyProps {
  cents: number;
  currency?: string;
  variant?: Variant;
  color?: string;
}

const CONFIG: Record<Variant, { amountSize: number; symbolSize: number; weight: '400' | '700' }> = {
  display: { amountSize: 36, symbolSize: 22, weight: '700' },
  hero:    { amountSize: 28, symbolSize: 17, weight: '700' },
  body:    { amountSize: 15, symbolSize: 11, weight: '700' },
  small:   { amountSize: 13, symbolSize: 10, weight: '700' },
};

export function Money({ cents, currency = 'EUR', variant = 'body', color }: MoneyProps) {
  const symbol = currency === 'EUR' ? '€' : currency;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = (abs % 100).toString().padStart(2, '0');
  const sign = cents < 0 ? '-' : '';
  const { amountSize, symbolSize, weight } = CONFIG[variant];
  const amountColor = color ?? theme.colors.textPrimary;

  return (
    <Text style={{ fontWeight: weight, color: amountColor }}>
      <Text style={{ fontSize: symbolSize, color: theme.colors.textSecondary }}>
        {sign}{symbol}
      </Text>
      <Text style={{ fontSize: amountSize }}>
        {whole}.{frac}
      </Text>
    </Text>
  );
}
