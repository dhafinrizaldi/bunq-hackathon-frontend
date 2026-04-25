import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../theme/theme';
import type { PendingSplit, Participant, ReceiptItem } from '../types/types';
import type { RootStackParamList } from '../navigation/types';
import * as api from '../api/client';
import { mockUser } from '../mocks/mockUser';
import { formatCents } from '../lib/money';

type Props = NativeStackScreenProps<RootStackParamList, 'SessionDetail'>;

// ─── Participant row ───────────────────────────────────────────────
function ParticipantStatusRow({ participant }: { participant: Participant }) {
  const [imgErr, setImgErr] = useState(false);

  const badgeStyle = participant.status === 'paid'
    ? styles.badgePaid
    : participant.status === 'declined'
    ? styles.badgeDeclined
    : styles.badgePending;

  const badgeLabel = participant.status === 'paid' ? 'Paid'
    : participant.status === 'declined' ? 'Declined'
    : 'Pending';

  return (
    <View style={styles.participantRow}>
      <View style={styles.participantAvatar}>
        {participant.avatarUrl && !imgErr ? (
          <Image
            source={{ uri: participant.avatarUrl }}
            style={styles.participantAvatarImg}
            onError={() => setImgErr(true)}
          />
        ) : (
          <View style={[styles.participantAvatarImg, styles.participantAvatarFallback]}>
            <Text style={styles.participantInitial}>
              {participant.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.participantInfo}>
        <Text style={styles.participantName}>{participant.name}</Text>
        {participant.email && (
          <Text style={styles.participantEmail} numberOfLines={1}>{participant.email}</Text>
        )}
      </View>
      <Text style={styles.participantAmount}>
        {formatCents(participant.amountOwed, 'EUR')}
      </Text>
      <View style={[styles.badge, badgeStyle]}>
        <Text style={styles.badgeText}>{badgeLabel}</Text>
      </View>
    </View>
  );
}

// ─── Item row ──────────────────────────────────────────────────────
function ItemRow({ item, currency }: { item: ReceiptItem; currency: string }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemLeft}>
        <Text style={styles.itemName}>{item.name}</Text>
        {item.quantity > 1 && (
          <Text style={styles.itemMeta}>{item.quantity} × {formatCents(item.price, currency)}</Text>
        )}
      </View>
      <Text style={styles.itemTotal}>{formatCents(item.price * item.quantity, currency)}</Text>
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.navBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.navTitle}>Split details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.accentPrimary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!split) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.navBar}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={styles.navTitle}>Split details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Session not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const paidCount = split.participants.filter(p => p.status === 'paid').length;
  const totalParticipants = split.participants.length;
  const currency = split.currency;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.navBar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={styles.navTitle} numberOfLines={1}>{split.merchantName}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + theme.spacing.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary header */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryMerchant}>{split.merchantName}</Text>
          <Text style={styles.summaryTotal}>{formatCents(split.totalAmount, currency)}</Text>
          <Text style={styles.summaryMeta}>
            {paidCount} of {totalParticipants} paid · {formatDate(split.createdAt)}
          </Text>
          {split.isFullyPaid && (
            <View style={styles.paidBadge}>
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.positive} />
              <Text style={styles.paidBadgeText}>Fully paid</Text>
            </View>
          )}
        </View>

        {/* "What was said" card */}
        {split.userPrompt && (
          <Pressable style={styles.promptCard} onPress={() => setPromptExpanded(e => !e)}>
            <View style={styles.promptHeader}>
              <Text style={styles.promptLabel}>What was said</Text>
              <Ionicons
                name={promptExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={theme.colors.textSecondary}
              />
            </View>
            {promptExpanded && (
              <Text style={styles.promptText}>"{split.userPrompt}"</Text>
            )}
          </Pressable>
        )}

        {/* Items */}
        {split.items && split.items.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Items</Text>
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

        {/* Payment requests */}
        <Text style={styles.sectionTitle}>Payment requests</Text>
        {split.participants.length === 0 ? (
          <Text style={styles.emptyText}>No payment requests found</Text>
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
  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[d.getMonth()]}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.base,
  },
  navTitle: {
    color: theme.colors.textPrimary,
    fontSize: 16,
    fontWeight: theme.fonts.weights.semibold,
    flex: 1,
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: theme.spacing.base,
    marginBottom: theme.spacing.base,
    gap: theme.spacing.xs,
  },
  summaryMerchant: {
    color: theme.colors.textPrimary,
    fontSize: 18,
    fontWeight: theme.fonts.weights.bold,
  },
  summaryTotal: {
    color: theme.colors.accentPrimary,
    fontSize: 28,
    fontWeight: theme.fonts.weights.bold,
  },
  summaryMeta: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  paidBadgeText: {
    color: theme.colors.positive,
    fontSize: 13,
    fontWeight: theme.fonts.weights.semibold,
  },
  promptCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.card,
    padding: theme.spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accentPrimary,
    marginBottom: theme.spacing.base,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promptLabel: {
    color: theme.colors.accentPrimary,
    fontSize: 12,
    fontWeight: theme.fonts.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  promptText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: theme.spacing.sm,
    lineHeight: 20,
  },
  sectionTitle: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: theme.fonts.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    marginBottom: theme.spacing.base,
    overflow: 'hidden',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
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
  itemName: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: theme.fonts.weights.semibold,
  },
  itemMeta: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  itemTotal: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: theme.fonts.weights.bold,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  participantAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  participantAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  participantAvatarFallback: {
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  participantInitial: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: theme.fonts.weights.bold,
  },
  participantInfo: {
    flex: 1,
    gap: 2,
  },
  participantName: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: theme.fonts.weights.semibold,
  },
  participantEmail: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  participantAmount: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: theme.fonts.weights.bold,
  },
  badge: {
    borderRadius: 8,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 3,
    minWidth: 62,
    alignItems: 'center',
  },
  badgePaid: {
    backgroundColor: 'rgba(0,220,120,0.15)',
  },
  badgePending: {
    backgroundColor: 'rgba(154,154,154,0.12)',
  },
  badgeDeclined: {
    backgroundColor: 'rgba(255,92,92,0.12)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textSecondary,
  },
  emptyText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: theme.spacing.xl,
  },
});
