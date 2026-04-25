import { View, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { theme, accentForKey } from '../theme/theme';
import { Money } from './ui/Money';
import { Text } from './ui/Text';
import { CategoryIcon } from './ui/CategoryIcon';
import type { Transaction } from '../types/types';

interface TransactionRowProps {
  transaction: Transaction;
  onSplitPress: (transaction: Transaction) => void;
  onLongPress: (transaction: Transaction) => void;
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
  const cents = Math.round(transaction.amount * 100);
  const accent = accentForKey(transaction.merchantName);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onLongPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLongPress(transaction);
      }}
      delayLongPress={500}
    >
      <CategoryIcon
        initials={transaction.merchantName.slice(0, 2)}
        accent={accent}
        size={44}
      />
      <View style={styles.middle}>
        <Text variant="bodyStrong" color="primary" numberOfLines={1}>{transaction.merchantName}</Text>
        <Text variant="label" color="tertiary">{formatTimestamp(transaction.timestamp)}</Text>
      </View>
      <View style={styles.right}>
        <Money amountCents={cents} currency={transaction.currency} size="small" color="primary" />
        <Pressable
          style={({ pressed }) => [styles.splitPill, pressed && styles.splitPillPressed]}
          onPress={() => onSplitPress(transaction)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text variant="labelStrong" color="primary">Split</Text>
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
    gap: theme.spacing.md,
    minHeight: 60,
  },
  rowPressed: {
    opacity: 0.7,
  },
  middle: {
    flex: 1,
    gap: 3,
  },
  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  splitPill: {
    backgroundColor: theme.colors.bgElevated,
    borderRadius: theme.radii.full,
    paddingHorizontal: theme.spacing.md,
    height: 28,
    justifyContent: 'center',
  },
  splitPillPressed: {
    backgroundColor: theme.colors.bgPressed,
  },
});
