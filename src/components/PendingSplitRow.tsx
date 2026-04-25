import { View, Text, Pressable, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';
import type { PendingSplit } from '../types/types';

interface PendingSplitRowProps {
  split: PendingSplit;
  onPress: (split: PendingSplit) => void;
}

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
  if (diffMin < 60) return `${diffMin}m ago`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

function formatCents(cents: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : currency;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

export function PendingSplitRow({ split, onPress }: PendingSplitRowProps) {
  const paidCount = split.participants.filter(p => p.status === 'paid').length;
  const total = split.participants.length;
  const isComplete = split.isFullyPaid || paidCount === total;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isComplete && styles.cardComplete,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(split)}
    >
      <View style={styles.row}>
        <Text style={styles.merchantName}>{split.merchantName}</Text>
        <Text style={styles.amount}>{formatCents(split.totalAmount, split.currency)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.progress}>
          {isComplete ? 'All paid' : `${paidCount} of ${total} paid`}
        </Text>
        <Text style={styles.date}>{formatRelativeDate(split.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accentPrimary,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  cardComplete: {
    borderLeftColor: theme.colors.border,
  },
  cardPressed: {
    opacity: 0.75,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  merchantName: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  amount: {
    ...theme.typography.moneySmall,
    color: theme.colors.textPrimary,
  },
  progress: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
  },
  date: {
    ...theme.typography.micro,
    color: theme.colors.textTertiary,
  },
});
