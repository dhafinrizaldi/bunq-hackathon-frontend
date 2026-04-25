import { useEffect, useState } from 'react';
import {
  Alert,
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
import type { Transaction, Contact } from '../types/types';
import type { SplitFlowParamList } from '../navigation/types';
import * as api from '../api/client';
import { splitCentsEvenly } from '../lib/money';
import { mockUser } from '../mocks/mockUser';
import { FlowHeader } from '../components/FlowHeader';
import { TransactionSummaryCard } from '../components/TransactionSummaryCard';
import { Text } from '../components/ui/Text';
import { Money } from '../components/ui/Money';
import { Button } from '../components/ui/Button';
import { CategoryIcon } from '../components/ui/CategoryIcon';

type Props = NativeStackScreenProps<SplitFlowParamList, 'EvenSplitConfirm'>;

interface ContactShare {
  contact: Contact;
  amountCents: number;
}

interface EvenSplit {
  contactShares: ContactShare[];
  userAmountCents: number;
  totalCents: number;
  totalPeople: number;
  baseCents: number;
  hasRemainder: boolean;
}

function computeEvenSplit(totalAmount: number, contacts: Contact[]): EvenSplit {
  const totalCents = Math.round(totalAmount * 100);
  const totalPeople = contacts.length + 1;
  const shares = splitCentsEvenly(totalCents, totalPeople);
  // contacts occupy indices 0..n-2; user is last (index n-1)
  return {
    contactShares: contacts.map((c, i) => ({ contact: c, amountCents: shares[i] })),
    userAmountCents: shares[totalPeople - 1],
    totalCents,
    totalPeople,
    baseCents: Math.floor(totalCents / totalPeople),
    hasRemainder: totalCents % totalPeople !== 0,
  };
}

function ParticipantRow({ contact, amountCents }: { contact: Contact; amountCents: number }) {
  const accent = accentForKey(contact.name);
  return (
    <View style={styles.participantRow}>
      <CategoryIcon initials={contact.name.slice(0, 2)} accent={accent} size={36} />
      <Text variant="bodyStrong" color="primary" style={styles.participantName}>{contact.name}</Text>
      <Money amountCents={amountCents} size="small" color={accent} />
    </View>
  );
}

export default function EvenSplitConfirmScreen({ navigation, route }: Props) {
  const { transactionId, selectedContactIds, voiceWasUsed, lastTranscript } = route.params;
  const insets = useSafeAreaInsets();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [voiceBannerDismissed, setVoiceBannerDismissed] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getCurrentTransaction(transactionId),
      api.getContacts(),
    ])
      .then(([txn, allContacts]) => {
        setTransaction(txn);
        setSelectedContacts(allContacts.filter(c => selectedContactIds.includes(c.id)));
      })
      .finally(() => setLoading(false));
  }, [transactionId, selectedContactIds]);

  const handleClose = () => navigation.getParent()?.goBack();
  const split = transaction ? computeEvenSplit(transaction.amount, selectedContacts) : null;

  const handleSubmit = async () => {
    if (!transaction || submitting || !split) return;
    setSubmitting(true);
    try {
      const participantEmails: Record<string, string> = { [mockUser.id]: mockUser.email };
      for (const c of selectedContacts) participantEmails[c.id] = c.email;

      await api.createSplitRequest(
        {
          transactionId: transaction.id,
          transactionMerchantName: transaction.merchantName,
          transactionAmount: transaction.amount,
          transactionCurrency: transaction.currency ?? 'EUR',
          mode: 'even',
          participants: split.contactShares.map(({ contact, amountCents }) => ({
            contactId: contact.id,
            amount: amountCents,
          })),
          note: note.trim() || undefined,
        },
        participantEmails,
        [],
        {}
      );
      setSuccess(true);
    } catch {
      Alert.alert('Something went wrong', 'Could not send split requests. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const bottomBarHeight = 96 + insets.bottom;

  if (loading) {
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
          <Button label="Done" onPress={handleClose} variant="accent" accent="cyan" fullWidth={false} style={styles.doneButton} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlowHeader title="Confirm split" onBack={() => navigation.goBack()} onClose={handleClose} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarHeight }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {transaction && <TransactionSummaryCard transaction={transaction} />}

        {voiceWasUsed && !voiceBannerDismissed && (
          <View style={styles.voiceBanner}>
            <Text variant="label" color="secondary" style={styles.voiceBannerText}>
              ⚡ Voice draft applied — review and fix anything wrong
            </Text>
            <Pressable onPress={() => setVoiceBannerDismissed(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={14} color={theme.colors.textTertiary} />
            </Pressable>
          </View>
        )}

        {voiceWasUsed && lastTranscript && (
          <Pressable style={styles.transcriptCard} onPress={() => setTranscriptExpanded(e => !e)}>
            <View style={styles.transcriptCardHeader}>
              <Text variant="label" color="tertiary">You said</Text>
              <Ionicons
                name={transcriptExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={theme.colors.textTertiary}
              />
            </View>
            {transcriptExpanded && (
              <Text variant="body" color="secondary" style={styles.transcriptText}>
                "{lastTranscript}"
              </Text>
            )}
          </Pressable>
        )}

        {split && (
          <View style={styles.calcCard}>
            <Text variant="bodyStrong" color="primary">
              {`€${transaction!.amount.toFixed(2)} ÷ ${split.totalPeople} people`}
            </Text>
            <Text variant="label" color="secondary">
              {split.hasRemainder
                ? `€${(split.baseCents / 100).toFixed(2)} – €${((split.baseCents + 1) / 100).toFixed(2)} per person`
                : `€${(split.baseCents / 100).toFixed(2)} each`}
            </Text>
            <Text variant="label" color="secondary">
              {`Your share: €${(split.userAmountCents / 100).toFixed(2)}`}
            </Text>
          </View>
        )}

        <View style={styles.participantList}>
          {split?.contactShares.map(({ contact, amountCents }) => (
            <ParticipantRow key={contact.id} contact={contact} amountCents={amountCents} />
          ))}
        </View>

        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder={`Dinner at ${transaction?.merchantName ?? 'the restaurant'}`}
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
  doneButton: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.xxl,
    width: 200,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
  },
  voiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.bgRaised,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accents.cyan,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  voiceBannerText: {
    flex: 1,
  },
  transcriptCard: {
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.base,
    marginTop: theme.spacing.sm,
  },
  transcriptCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transcriptText: {
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  calcCard: {
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.base,
    marginTop: theme.spacing.base,
    gap: theme.spacing.xs,
  },
  participantList: {
    marginTop: theme.spacing.base,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  participantName: {
    flex: 1,
  },
  noteInput: {
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.full,
    padding: theme.spacing.base,
    paddingHorizontal: theme.spacing.lg,
    color: theme.colors.textPrimary,
    fontSize: 15,
    marginTop: theme.spacing.base,
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
