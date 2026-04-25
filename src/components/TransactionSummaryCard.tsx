import { View, StyleSheet } from 'react-native';
import { theme, accentForKey } from '../theme/theme';
import { Money } from './ui/Money';
import { Text } from './ui/Text';
import { CategoryIcon } from './ui/CategoryIcon';
import type { Transaction } from '../types/types';

interface TransactionSummaryCardProps {
  transaction: Transaction;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  if (diffHours < 24) return `Today at ${h}:${m}`;
  if (diffHours < 48) return `Yesterday at ${h}:${m}`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]} at ${h}:${m}`;
}

export function TransactionSummaryCard({ transaction }: TransactionSummaryCardProps) {
  const cents = Math.round(transaction.amount * 100);
  const accent = accentForKey(transaction.merchantName);

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <CategoryIcon
          initials={transaction.merchantName.slice(0, 2)}
          accent={accent}
          size={48}
        />
        <View style={styles.textCol}>
          <Text variant="heading" color="primary" numberOfLines={1}>{transaction.merchantName}</Text>
          <Text variant="label" color="tertiary">{formatTimestamp(transaction.timestamp)}</Text>
        </View>
      </View>
      <Money amountCents={cents} currency={transaction.currency} size="hero" color={accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.xl,
    marginVertical: theme.spacing.sm,
    gap: theme.spacing.base,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
});
