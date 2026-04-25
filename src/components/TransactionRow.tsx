import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme/theme';
import type { Transaction } from '../types/types';

interface TransactionRowProps {
  transaction: Transaction;
  onSplitPress: (transaction: Transaction) => void;
  onLongPress: (transaction: Transaction) => void;
}

function formatAmount(amount: number, currency: string): string {
  const symbol = currency === 'EUR' ? '€' : currency;
  return `${symbol}${amount.toFixed(2)}`;
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  if (diffHours < 24) return `Today ${h}:${m}`;
  if (diffHours < 48) return `Yesterday ${h}:${m}`;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}

export function TransactionRow({ transaction, onSplitPress, onLongPress }: TransactionRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        pressed && styles.rowPressed,
      ]}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress(transaction);
      }}
      delayLongPress={500}
    >
      <View style={styles.left}>
        <Text style={styles.merchantName}>{transaction.merchantName}</Text>
        <Text style={styles.timestamp}>{formatTimestamp(transaction.timestamp)}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.amount}>{formatAmount(transaction.amount, transaction.currency)}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.splitButton,
            pressed && styles.splitButtonPressed,
          ]}
          onPress={() => onSplitPress(transaction)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={styles.splitButtonText}>Split</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    minHeight: 52,
  },
  rowPressed: {
    opacity: 0.7,
  },
  left: {
    flex: 1,
    gap: 3,
  },
  merchantName: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  timestamp: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  amount: {
    ...theme.typography.moneySmall,
    color: theme.colors.textPrimary,
  },
  splitButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    height: 40,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  splitButtonPressed: {
    backgroundColor: theme.colors.surfaceElevated,
  },
  splitButtonText: {
    ...theme.typography.labelStrong,
    color: theme.colors.textPrimary,
  },
});
