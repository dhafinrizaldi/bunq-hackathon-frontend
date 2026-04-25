import { View, Pressable, StyleSheet } from 'react-native';
import { theme, accentForKey } from '../theme/theme';
import { Money } from './ui/Money';
import { Text } from './ui/Text';
import { CategoryIcon } from './ui/CategoryIcon';
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

export function PendingSplitRow({ split, onPress }: PendingSplitRowProps) {
  const paidCount = split.participants.filter(p => p.status === 'paid').length;
  const total = split.participants.length;
  const isComplete = split.isFullyPaid || paidCount === total;
  const accent = accentForKey(split.merchantName);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
      ]}
      onPress={() => onPress(split)}
    >
      <CategoryIcon
        initials={split.merchantName.slice(0, 2)}
        accent={accent}
        size={44}
      />
      <View style={styles.middle}>
        <Text variant="bodyStrong" color="primary" numberOfLines={1}>{split.merchantName}</Text>
        <Text variant="label" color={isComplete ? 'tertiary' : 'secondary'}>
          {isComplete ? 'All paid ✓' : `${paidCount} of ${total} paid`}
        </Text>
      </View>
      <View style={styles.right}>
        <Money amountCents={split.totalAmount} currency={split.currency} size="small" color={isComplete ? 'primary' : accent} />
        <Text variant="micro" color="tertiary">{formatRelativeDate(split.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.base,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  cardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.985 }],
  },
  middle: {
    flex: 1,
    gap: 3,
  },
  right: {
    alignItems: 'flex-end',
    gap: 3,
  },
});
