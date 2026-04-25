import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';
import { Money } from './Money';
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

  return (
    <View style={styles.card}>
      <Text style={styles.merchant} numberOfLines={1}>{transaction.merchantName}</Text>
      <Money cents={cents} currency={transaction.currency} variant="hero" color={theme.colors.accentPrimary} />
      <Text style={styles.timestamp}>{formatTimestamp(transaction.timestamp)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.xl,
    marginVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  merchant: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
  },
  timestamp: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
});
