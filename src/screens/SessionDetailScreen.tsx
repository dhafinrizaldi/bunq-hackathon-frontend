import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme, accentForKey } from '../theme/theme';
import type { PendingSplit, Participant, ReceiptItem } from '../types/types';
import type { RootStackParamList } from '../navigation/types';
import * as api from '../api/client';
import { mockUser } from '../mocks/mockUser';
import { formatCents } from '../lib/money';
import { Text } from '../components/ui/Text';
import { Money } from '../components/ui/Money';
import { CategoryIcon } from '../components/ui/CategoryIcon';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionDetail'>;

function ParticipantStatusRow({ participant }: { participant: Participant }) {
  const accent = accentForKey(participant.name);
  const isPaid = participant.status === 'paid';
  const isDeclined = participant.status === 'declined';

  return (
    <View style={styles.participantRow}>
      <CategoryIcon initials={participant.name.slice(0, 2)} accent={accent} size={36} />
      <View style={styles.participantInfo}>
        <Text variant="bodyStrong" color="primary">{participant.name}</Text>
        {participant.email && (
          <Text variant="label" color="tertiary" numberOfLines={1}>{participant.email}</Text>
        )}
      </View>
      <Money amountCents={participant.amountOwed} size="small" color={accent} />
      <View style={[
        styles.badge,
        isPaid && styles.badgePaid,
        isDeclined && styles.badgeDeclined,
        !isPaid && !isDeclined && styles.badgePending,
      ]}>
        <Text variant="micro" color={isPaid ? 'positive' : isDeclined ? 'negative' : 'tertiary'}>
          {isPaid ? 'Paid' : isDeclined ? 'Declined' : 'Pending'}
        </Text>
      </View>
    </View>
  );
}

function ItemRow({ item, currency }: { item: ReceiptItem; currency: string }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemLeft}>
        <Text variant="bodyStrong" color="primary">{item.name}</Text>
        {item.quantity > 1 && (
          <Text variant="label" color="secondary">{item.quantity} × {formatCents(item.price, currency)}</Text>
        )}
      </View>
      <Text variant="labelStrong" color="primary">{formatCents(item.price * item.quantity, currency)}</Text>
    </View>
  );
}

export default function SessionDetailScreen({ navigation, route }: Props) {
  const { splitId } = route.params;
  const insets = useSafeAreaInsets();

  const [split, setSplit] = useState<PendingSplit | null>(null);
  const [loading, setLoading] = useState(true);
  const [promptExpanded, setPromptExpanded] = useState(false);

  useEffect(() => {
    api.getSessionDetail(splitId, mockUser.email)
      .then(setSplit)
      .finally(() => setLoading(false));
  }, [splitId]);

  const NavBar = ({ title }: { title?: string }) => (
    <View style={styles.navBar}>
      <Pressable onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="chevron-back" size={24} color={theme.colors.textSecondary} />
      </Pressable>
      <Text variant="bodyStrong" color="primary" style={styles.navTitle} numberOfLines={1}>
        {title ?? 'Split details'}
      </Text>
      <View style={{ width: 24 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <NavBar />
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.accents.cyan} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!split) {
    return (
      <SafeAreaView style={styles.container}>
        <NavBar />
        <View style={styles.centered}>
          <Text variant="body" color="secondary">Session not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const paidCount = split.participants.filter(p => p.status === 'paid').length;
  const totalParticipants = split.participants.length;
  const currency = split.currency;
  const accent = accentForKey(split.merchantName);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <NavBar title={split.merchantName} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + theme.spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <CategoryIcon initials={split.merchantName.slice(0, 2)} accent={accent} size={48} />
            <View style={styles.summaryText}>
              <Text variant="heading" color="primary" numberOfLines={1}>{split.merchantName}</Text>
              <Text variant="label" color="tertiary">
                {paidCount} of {totalParticipants} paid · {formatDate(split.createdAt)}
              </Text>
            </View>
          </View>
          <Money amountCents={split.totalAmount} currency={currency} size="large" color={accent} />
          {split.isFullyPaid && (
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.positive} />
              <Text variant="label" color="positive">Fully paid</Text>
            </View>
          )}
        </View>

        {split.userPrompt && (
          <Pressable style={styles.promptCard} onPress={() => setPromptExpanded(e => !e)}>
            <View style={styles.promptHeader}>
              <Text variant="micro" color="tertiary">WHAT WAS SAID</Text>
              <Ionicons
                name={promptExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={theme.colors.textTertiary}
              />
            </View>
            {promptExpanded && (
              <Text variant="body" color="secondary" style={styles.promptText}>"{split.userPrompt}"</Text>
            )}
          </Pressable>
        )}

        {split.items && split.items.length > 0 && (
          <>
            <Text variant="micro" color="tertiary" style={styles.sectionTitle}>ITEMS</Text>
            <View style={styles.card}>
              {split.items.map((item, i) => (
                <View key={item.id}>
                  <ItemRow item={item} currency={currency} />
                  {i < (split.items?.length ?? 0) - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>
          </>
        )}

        <Text variant="micro" color="tertiary" style={styles.sectionTitle}>PAYMENT REQUESTS</Text>
        {split.participants.length === 0 ? (
          <Text variant="body" color="secondary" style={styles.emptyText}>No payment requests found</Text>
        ) : (
          <View style={styles.card}>
            {split.participants.map((p, i) => (
              <View key={p.id}>
                <ParticipantStatusRow participant={p} />
                {i < split.participants.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.base,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
  },
  summaryCard: {
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.xl,
    padding: theme.spacing.xl,
    marginBottom: theme.spacing.base,
    gap: theme.spacing.base,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  promptCard: {
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accents.cyan,
    marginBottom: theme.spacing.base,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promptText: {
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.lg,
    marginBottom: theme.spacing.base,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.bgElevated,
    marginHorizontal: theme.spacing.base,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  itemLeft: {
    flex: 1,
    gap: 2,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  participantInfo: {
    flex: 1,
    gap: 2,
  },
  badge: {
    borderRadius: theme.radii.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    minWidth: 62,
    alignItems: 'center',
  },
  badgePaid: {
    backgroundColor: theme.colors.positiveSoft,
  },
  badgePending: {
    backgroundColor: theme.colors.bgElevated,
  },
  badgeDeclined: {
    backgroundColor: theme.colors.negativeSoft,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
});
