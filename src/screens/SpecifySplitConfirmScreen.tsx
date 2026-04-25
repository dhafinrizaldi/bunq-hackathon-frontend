import { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme, accentForKey } from '../theme/theme';
import type { Contact } from '../types/types';
import type { SplitFlowParamList } from '../navigation/types';
import { useSplitFlow } from '../context/SplitFlowContext';
import { mockUser } from '../mocks/mockUser';
import { splitCentsEvenly, formatCents } from '../lib/money';
import * as api from '../api/client';
import { FlowHeader } from '../components/FlowHeader';
import { TransactionSummaryCard } from '../components/TransactionSummaryCard';
import { Text } from '../components/ui/Text';
import { Money } from '../components/ui/Money';
import { Button } from '../components/ui/Button';
import { CategoryIcon } from '../components/ui/CategoryIcon';

type Props = NativeStackScreenProps<SplitFlowParamList, 'SpecifySplitConfirm'>;

const CURRENT_USER: Contact = {
  id: mockUser.id,
  email: mockUser.email,
  name: 'You',
  avatarUrl: mockUser.avatarUrl,
};

interface PersonCardProps {
  person: Contact;
  totalCents: number;
  currency: string;
  itemBreakdown: Array<{ name: string; shareCents: number; splitN: number }>;
  expanded: boolean;
  onToggle: () => void;
}

function PersonCard({ person, totalCents, currency, itemBreakdown, expanded, onToggle }: PersonCardProps) {
  const accent = accentForKey(person.name);

  return (
    <View style={styles.personCard}>
      <Pressable style={styles.personCardHeader} onPress={onToggle}>
        <CategoryIcon initials={person.name.slice(0, 2)} accent={accent} size={36} />
        <Text variant="bodyStrong" color="primary" style={styles.personName}>{person.name}</Text>
        <Money amountCents={totalCents} currency={currency} size="small" color={accent} />
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={theme.colors.textTertiary}
        />
      </Pressable>

      {expanded && itemBreakdown.length > 0 && (
        <View style={styles.breakdown}>
          {itemBreakdown.map((row, i) => (
            <View key={i} style={styles.breakdownRow}>
              <Text variant="label" color="secondary" style={styles.breakdownName} numberOfLines={1}>
                {row.name}{row.splitN > 1 ? ` (÷${row.splitN})` : ''}
              </Text>
              <Text variant="labelStrong" color="secondary">{formatCents(row.shareCents, currency)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

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
          transactionMerchantName: transaction.merchantName,
          transactionAmount: transaction.amount,
          transactionCurrency: transaction.currency ?? 'EUR',
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
          <ActivityIndicator color={theme.colors.accents.cyan} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (success) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={80} color={theme.colors.accents.cyan} />
          <Text variant="title" color="primary" style={styles.successTitle}>Requests sent!</Text>
          <Text variant="body" color="secondary" style={styles.successSub}>
            Payment requests sent to {selectedContacts.length}{' '}
            {selectedContacts.length === 1 ? 'person' : 'people'} via bunq
          </Text>
          <Button label="Done" onPress={handleClose} variant="accent" accent="cyan" fullWidth={false} style={styles.doneBtn} />
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

        {unassignedCents > 0 && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={14} color={theme.colors.negative} />
            <Text variant="label" color="negative" style={styles.flex1}>
              {formatCents(unassignedCents, currency)} unassigned — added to your share
            </Text>
          </View>
        )}

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

        <View style={styles.totalRow}>
          <Text variant="label" color="secondary">Receipt total</Text>
          <Text variant="labelStrong" color="primary">{formatCents(receiptTotal, currency)}</Text>
        </View>

        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={text => dispatch({ type: 'SET_NOTE', note: text })}
          placeholder={`Dinner at ${transaction.merchantName}`}
          placeholderTextColor={theme.colors.textTertiary}
          maxLength={140}
        />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + theme.spacing.base }]}>
        <Text variant="label" color="tertiary" style={styles.disclaimer}>
          Sending requests to {selectedContacts.length}{' '}
          {selectedContacts.length === 1 ? 'person' : 'people'} via bunq
        </Text>
        <Button
          label="Send requests"
          onPress={handleSubmit}
          variant="accent"
          accent="cyan"
          loading={submitting}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
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
    marginTop: theme.spacing.base,
  },
  successSub: {
    textAlign: 'center',
  },
  doneBtn: {
    marginTop: theme.spacing.xl,
    width: 200,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.negativeSoft,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  personList: {
    marginTop: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  personCard: {
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
  },
  personCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  personName: {
    flex: 1,
  },
  breakdown: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.bgElevated,
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
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: theme.colors.bgRaised,
    marginTop: theme.spacing.sm,
  },
  noteInput: {
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.full,
    padding: theme.spacing.base,
    paddingHorizontal: theme.spacing.lg,
    color: theme.colors.textPrimary,
    fontSize: 15,
    marginTop: theme.spacing.sm,
    minHeight: 48,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.bgRaised,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.base,
    gap: theme.spacing.sm,
  },
  disclaimer: {
    textAlign: 'center',
  },
});
