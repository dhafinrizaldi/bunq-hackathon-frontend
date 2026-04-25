import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../theme/theme';
import type { Transaction, Contact } from '../types/types';
import type { SplitFlowParamList } from '../navigation/types';
import * as api from '../api/client';
import { mockUser } from '../mocks/mockUser';
import { FlowHeader } from '../components/FlowHeader';
import { TransactionSummaryCard } from '../components/TransactionSummaryCard';

type Props = NativeStackScreenProps<SplitFlowParamList, 'EvenSplitConfirm'>;

interface SplitCalc {
  perPersonAmount: number;
  userShare: number;
  totalPeople: number;
  hasRemainder: boolean;
}

function calcEvenSplit(totalAmount: number, contactCount: number): SplitCalc {
  const totalPeople = contactCount + 1;
  const totalCents = Math.round(totalAmount * 100);
  const baseCents = Math.floor(totalCents / totalPeople);
  const remainderCents = totalCents - baseCents * totalPeople;
  return {
    perPersonAmount: baseCents / 100,
    userShare: (baseCents + remainderCents) / 100,
    totalPeople,
    hasRemainder: remainderCents > 0,
  };
}

function formatCurrency(amount: number): string {
  return `€${amount.toFixed(2)}`;
}

interface ParticipantRowProps {
  contact: Contact;
  amount: number;
}

function ParticipantRow({ contact, amount }: ParticipantRowProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <View style={styles.participantRow}>
      <View style={styles.participantAvatarContainer}>
        {!imageError ? (
          <Image
            source={{ uri: contact.avatarUrl }}
            style={styles.participantAvatar}
            onError={() => setImageError(true)}
          />
        ) : (
          <View style={[styles.participantAvatar, styles.participantAvatarFallback]}>
            <Text style={styles.participantInitial}>{contact.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <Text style={styles.participantName}>{contact.name}</Text>
      <Text style={styles.participantAmount}>{formatCurrency(amount)}</Text>
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

  const split = transaction ? calcEvenSplit(transaction.amount, selectedContacts.length) : null;

  const handleSubmit = async () => {
    if (!transaction || submitting || !split) return;
    setSubmitting(true);
    try {
      const participantEmails: Record<string, string> = { [mockUser.id]: mockUser.email };
      for (const c of selectedContacts) participantEmails[c.id] = c.email;

      await api.createSplitRequest(
        {
          transactionId: transaction.id,
          mode: 'even',
          participants: selectedContacts.map(c => ({
            contactId: c.id,
            amount: split.perPersonAmount,
          })),
          note: note.trim() || undefined,
        },
        participantEmails,
        [],
        {}
      );
      setSuccess(true);
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
      <FlowHeader title="Confirm split" onBack={() => navigation.goBack()} onClose={handleClose} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarHeight }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {transaction && <TransactionSummaryCard transaction={transaction} />}

        {/* Voice draft banner */}
        {voiceWasUsed && !voiceBannerDismissed && (
          <View style={styles.voiceBanner}>
            <Text style={styles.voiceBannerText}>⚡ Voice draft applied — review and fix anything wrong</Text>
            <Pressable onPress={() => setVoiceBannerDismissed(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={14} color={theme.colors.accentPrimary} />
            </Pressable>
          </View>
        )}

        {/* Collapsible transcript card */}
        {voiceWasUsed && lastTranscript && (
          <Pressable style={styles.transcriptCard} onPress={() => setTranscriptExpanded(e => !e)}>
            <View style={styles.transcriptCardHeader}>
              <Text style={styles.transcriptCardLabel}>You said</Text>
              <Ionicons
                name={transcriptExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={theme.colors.textSecondary}
              />
            </View>
            {transcriptExpanded && (
              <Text style={styles.transcriptCardText}>"{lastTranscript}"</Text>
            )}
          </Pressable>
        )}

        {split && (
          <View style={styles.calcCard}>
            <Text style={styles.calcMain}>
              {formatCurrency(transaction!.amount)} ÷ {split.totalPeople} people ={' '}
              {formatCurrency(split.perPersonAmount)} each
            </Text>
            {split.hasRemainder && (
              <Text style={styles.calcRemainder}>
                ({formatCurrency(split.userShare)} from you to round)
              </Text>
            )}
          </View>
        )}

        <View style={styles.participantList}>
          {selectedContacts.map(c => (
            <ParticipantRow key={c.id} contact={c} amount={split?.perPersonAmount ?? 0} />
          ))}
        </View>

        <TextInput
          style={styles.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder={`Dinner at ${transaction?.merchantName ?? 'the restaurant'}`}
          placeholderTextColor={theme.colors.textSecondary}
          maxLength={140}
        />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + theme.spacing.base }]}>
        <Text style={styles.disclaimer}>
          You'll send a payment request to {selectedContacts.length}{' '}
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
  voiceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(0,220,120,0.15)',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.accentPrimary,
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  voiceBannerText: {
    color: theme.colors.accentPrimary,
    fontSize: 12,
    flex: 1,
  },
  transcriptCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.card,
    padding: theme.spacing.base,
    marginTop: theme.spacing.sm,
  },
  transcriptCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transcriptCardLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: theme.fonts.weights.semibold,
  },
  transcriptCardText: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: theme.spacing.xs,
  },
  calcCard: {
    backgroundColor: theme.colors.surfaceElevated,
    borderRadius: theme.radii.card,
    padding: theme.spacing.base,
    marginTop: theme.spacing.base,
    gap: theme.spacing.xs,
  },
  calcMain: {
    color: theme.colors.textPrimary,
    fontSize: 17,
    fontWeight: theme.fonts.weights.bold,
  },
  calcRemainder: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  participantList: {
    marginTop: theme.spacing.base,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  participantAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  participantAvatar: {
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
  participantName: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: theme.fonts.weights.semibold,
  },
  participantAmount: {
    color: theme.colors.textPrimary,
    fontSize: 15,
    fontWeight: theme.fonts.weights.bold,
  },
  noteInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.button,
    padding: theme.spacing.base,
    color: theme.colors.textPrimary,
    fontSize: 15,
    marginTop: theme.spacing.base,
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
