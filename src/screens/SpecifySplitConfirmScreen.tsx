import { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Image,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../theme/theme';
import type { Contact } from '../types/types';
import type { SplitFlowParamList } from '../navigation/types';
import { useSplitFlow } from '../context/SplitFlowContext';
import { mockUser } from '../mocks/mockUser';
import { splitCentsEvenly, formatCents } from '../lib/money';
import * as api from '../api/client';
import { FlowHeader } from '../components/FlowHeader';
import { TransactionSummaryCard } from '../components/TransactionSummaryCard';

type Props = NativeStackScreenProps<SplitFlowParamList, 'SpecifySplitConfirm'>;

const CURRENT_USER: Contact = {
  id: mockUser.id,
  email: mockUser.email,
  name: 'You',
  avatarUrl: mockUser.avatarUrl,
};

// ─── Expandable person card ────────────────────────────────────
interface PersonCardProps {
  person: Contact;
  totalCents: number;
  currency: string;
  itemBreakdown: Array<{ name: string; shareCents: number; splitN: number }>;
  expanded: boolean;
  onToggle: () => void;
}

function PersonCard({ person, totalCents, currency, itemBreakdown, expanded, onToggle }: PersonCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <View style={styles.personCard}>
      <Pressable style={styles.personCardHeader} onPress={onToggle}>
        <View style={styles.personAvatarContainer}>
          {!imgError ? (
            <Image
              source={{ uri: person.avatarUrl }}
              style={styles.personAvatar}
              onError={() => setImgError(true)}
            />
          ) : (
            <View style={[styles.personAvatar, styles.personAvatarFallback]}>
              <Text style={styles.personInitial}>{person.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <Text style={styles.personName}>{person.name}</Text>
        <Text style={styles.personTotal}>{formatCents(totalCents, currency)}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.colors.textSecondary}
        />
      </Pressable>

      {expanded && itemBreakdown.length > 0 && (
        <View style={styles.breakdown}>
          {itemBreakdown.map((row, i) => (
            <View key={i} style={styles.breakdownRow}>
              <Text style={styles.breakdownName} numberOfLines={1}>
                {row.name}{row.splitN > 1 ? ` (÷${row.splitN})` : ''}
              </Text>
              <Text style={styles.breakdownAmount}>{formatCents(row.shareCents, currency)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────
export default function SpecifySplitConfirmScreen({ navigation }: Props) {
  const { state, dispatch } = useSplitFlow();
  const { transaction, selectedContacts, items, assignments, note } = state;
  const insets = useSafeAreaInsets();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const currency = transaction?.currency ?? 'EUR';
  const allPeople: Contact[] = useMemo(
    () => [...selectedContacts, CURRENT_USER],
    [selectedContacts]
  );

  // Per-person totals (cents)
  const personTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const person of allPeople) {
      totals[person.id] = items.reduce((sum, item) => {
        const assignees = assignments[item.id] ?? [];
        const idx = assignees.indexOf(person.id);
        if (idx === -1) return sum;
        return sum + splitCentsEvenly(item.price * item.quantity, assignees.length)[idx];
      }, 0);
    }
    return totals;
  }, [items, assignments, allPeople]);

  const receiptTotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items]
  );

  const assignedTotal = useMemo(
    () => Object.values(personTotals).reduce((s, v) => s + v, 0),
    [personTotals]
  );

  const unassignedCents = receiptTotal - assignedTotal;

  // Item breakdown per person
  const getBreakdown = (personId: string) =>
    items
      .map(item => {
        const assignees = assignments[item.id] ?? [];
        const idx = assignees.indexOf(personId);
        if (idx === -1) return null;
        const shares = splitCentsEvenly(item.price * item.quantity, assignees.length);
        return { itemId: item.id, name: item.name, shareCents: shares[idx], splitN: assignees.length };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

  const handleToggle = (personId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(personId) ? next.delete(personId) : next.add(personId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!transaction || submitting) return;
    setSubmitting(true);
    try {
      const participants = selectedContacts.map(contact => {
        const breakdown = getBreakdown(contact.id);
        const amount = breakdown.reduce((s, b) => s + b.shareCents, 0);
        return {
          contactId: contact.id,
          amount,
          itemBreakdown: breakdown.map(b => ({ itemId: b.itemId, share: b.shareCents })),
        };
      }).filter(p => p.amount > 0);

      const participantEmails: Record<string, string> = { [mockUser.id]: mockUser.email };
      for (const c of selectedContacts) participantEmails[c.id] = c.email;

      await api.createSplitRequest(
        {
          transactionId: transaction.id,
          mode: 'specify',
          participants,
          note: note.trim() || undefined,
          receiptImageUri: state.receiptImageUri ?? undefined,
        },
        participantEmails,
        items,
        assignments
      );
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => navigation.getParent()?.goBack();
  const bottomBarHeight = 96 + insets.bottom;

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <FlowHeader title="Confirm split" onBack={() => navigation.goBack()} onClose={handleClose} />
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.accentPrimary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={80} color={theme.colors.accentPrimary} />
          <Text style={styles.successTitle}>Requests sent!</Text>
          <Text style={styles.successSub}>
            Payment requests sent to {selectedContacts.length}{' '}
            {selectedContacts.length === 1 ? 'person' : 'people'} via bunq
          </Text>
          <Pressable
            style={({ pressed }) => [styles.doneButton, { opacity: pressed ? 0.85 : 1 }]}
            onPress={handleClose}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlowHeader
        title="Confirm split"
        onBack={() => navigation.goBack()}
        onClose={handleClose}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarHeight }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TransactionSummaryCard transaction={transaction} />

        {/* Unassigned warning banner */}
        {unassignedCents > 0 && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={14} color={theme.colors.negative} />
            <Text style={styles.warningText}>
              {formatCents(unassignedCents, currency)} unassigned — added to your share
            </Text>
          </View>
        )}

        {/* Per-person cards */}
        <View style={styles.personList}>
          {allPeople.map(person => {
            const isCurrentUser = person.id === mockUser.id;
            const baseCents = personTotals[person.id] ?? 0;
            const totalCents = isCurrentUser ? baseCents + unassignedCents : baseCents;
            return (
              <PersonCard
                key={person.id}
                person={person}
                totalCents={totalCents}
                currency={currency}
                itemBreakdown={getBreakdown(person.id)}
                expanded={expandedIds.has(person.id)}
                onToggle={() => handleToggle(person.id)}
              />
            );
          })}
        </View>

        {/* Receipt total summary */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Receipt total</Text>
          <Text style={styles.totalValue}>{formatCents(receiptTotal, currency)}</Text>
        </View>

        {/* Note field */}
        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={text => dispatch({ type: 'SET_NOTE', note: text })}
          placeholder={`Dinner at ${transaction.merchantName}`}
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={140}
        />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + theme.spacing.base }]}>
        <Text style={styles.disclaimer}>
          You'll send payment requests to {selectedContacts.length}{' '}
          {selectedContacts.length === 1 ? 'person' : 'people'} via bunq
        </Text>
        <Pressable
          style={({ pressed }) => [styles.sendButton, { opacity: pressed ? 0.85 : 1 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#0A0A0A" />
          ) : (
            <Text style={styles.sendButtonText}>Send requests</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  successTitle: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: theme.fonts.weights.bold,
    marginTop: theme.spacing.base,
  },
  successSub: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.xxl,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.xl,
    minHeight: 44,
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: theme.fonts.weights.bold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(255,92,92,0.12)',
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  warningText: {
    color: theme.colors.negative,
    fontSize: 13,
    flex: 1,
  },
  personList: {
    marginTop: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  personCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    overflow: 'hidden',
  },
  personCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  personAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  personAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  personAvatarFallback: {
    backgroundColor: theme.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personInitial: {
    color: theme.colors.textPrimary,
    fontSize: 14,
    fontWeight: theme.fonts.weights.bold,
  },
  personName: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: theme.fonts.weights.semibold,
  },
  personTotal: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: theme.fonts.weights.bold,
  },
  breakdown: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
  },
  breakdownName: {
    flex: 1,
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  breakdownAmount: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontWeight: theme.fonts.weights.semibold,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: theme.spacing.sm,
  },
  totalLabel: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  totalValue: {
    color: theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: theme.fonts.weights.semibold,
  },
  noteInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.button,
    padding: theme.spacing.base,
    color: theme.colors.textPrimary,
    fontSize: 15,
    marginTop: theme.spacing.sm,
    minHeight: 44,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  disclaimer: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  sendButton: {
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radii.button,
    paddingVertical: theme.spacing.md,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#0A0A0A',
    fontSize: 16,
    fontWeight: theme.fonts.weights.bold,
  },
});
