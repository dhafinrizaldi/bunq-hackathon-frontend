import { useMemo, useState } from 'react';
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
import type { ReceiptItem, Contact } from '../types/types';
import type { SplitFlowParamList } from '../navigation/types';
import { useSplitFlow } from '../context/SplitFlowContext';
import { mockUser } from '../mocks/mockUser';
import { splitCentsEvenly, formatCents } from '../lib/money';
import { FlowHeader } from '../components/FlowHeader';
import { TransactionSummaryCard } from '../components/TransactionSummaryCard';
import { EditItemSheet } from '../components/EditItemSheet';

type Props = NativeStackScreenProps<SplitFlowParamList, 'ItemAssignment'>;

// Synthetic "You" entry for the current user
const CURRENT_USER: Contact = {
  id: mockUser.id,
  email: mockUser.email,
  name: 'You',
  avatarUrl: mockUser.avatarUrl,
};

interface PersonTotals {
  [personId: string]: number; // total in cents
}

// ─── Running Totals Card ────────────────────────────────────────
interface TotalsCardProps {
  person: Contact;
  totalCents: number;
  currency: string;
}

function TotalsCard({ person, totalCents, currency }: TotalsCardProps) {
  const [imgError, setImgError] = useState(false);
  const hasAmount = totalCents > 0;

  return (
    <View style={[styles.totalsCard, hasAmount && styles.totalsCardActive]}>
      <View style={styles.totalsAvatar}>
        {!imgError ? (
          <Image
            source={{ uri: person.avatarUrl }}
            style={styles.totalsAvatarImg}
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={[styles.totalsAvatarImg, styles.totalsAvatarFallback]}>
            <Text style={styles.totalsAvatarInitial}>{person.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <Text style={styles.totalsName} numberOfLines={1}>{person.name}</Text>
      <Text style={[styles.totalsAmount, hasAmount && styles.totalsAmountActive]}>
        {formatCents(totalCents, currency)}
      </Text>
    </View>
  );
}

// ─── Assignment Chip ────────────────────────────────────────────
interface ChipProps {
  person: Contact;
  selected: boolean;
  onPress: () => void;
}

function AssignmentChip({ person, selected, onPress }: ChipProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <Pressable
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <View style={styles.chipAvatar}>
        {!imgError ? (
          <Image
            source={{ uri: person.avatarUrl }}
            style={styles.chipAvatarImg}
            onError={() => setImgError(true)}
          />
        ) : (
          <View style={[styles.chipAvatarImg, styles.chipAvatarFallback]}>
            <Text style={styles.chipInitial}>{person.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.chipName, selected && styles.chipNameSelected]} numberOfLines={1}>
        {person.name}
      </Text>
    </Pressable>
  );
}

// ─── Item Row ───────────────────────────────────────────────────
interface ItemRowProps {
  item: ReceiptItem;
  assignees: string[];
  people: Contact[];
  currency: string;
  highlighted: boolean;
  onTogglePerson: (itemId: string, personId: string) => void;
  onSplitEqually: (itemId: string) => void;
  onLongPress: (item: ReceiptItem) => void;
}

function ItemRow({ item, assignees, people, currency, highlighted, onTogglePerson, onSplitEqually, onLongPress }: ItemRowProps) {
  const total = item.price * item.quantity;
  const allSelected = people.every(p => assignees.includes(p.id));

  return (
    <Pressable
      style={[styles.itemRow, highlighted && styles.itemRowHighlighted]}
      onLongPress={() => onLongPress(item)}
      delayLongPress={400}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemLeft}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemMeta}>
            {item.quantity} × {formatCents(item.price, currency)}
          </Text>
        </View>
        <Text style={styles.itemTotal}>{formatCents(total, currency)}</Text>
      </View>

      <View style={styles.chipRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {people.map(person => (
            <AssignmentChip
              key={person.id}
              person={person}
              selected={assignees.includes(person.id)}
              onPress={() => onTogglePerson(item.id, person.id)}
            />
          ))}
        </ScrollView>
        <Pressable
          style={[styles.splitAllChip, allSelected && styles.splitAllChipActive]}
          onPress={() => onSplitEqually(item.id)}
        >
          <Text style={[styles.splitAllText, allSelected && styles.splitAllTextActive]}>All</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

// ─── Main Screen ────────────────────────────────────────────────
export default function ItemAssignmentScreen({ navigation }: Props) {
  const { state, dispatch } = useSplitFlow();
  const { transaction, selectedContacts, items, assignments, voiceWasUsed, lastTranscript } = state;
  const insets = useSafeAreaInsets();

  const [editTarget, setEditTarget] = useState<ReceiptItem | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [bannerText, setBannerText] = useState<string | null>(null);
  const [voiceBannerDismissed, setVoiceBannerDismissed] = useState(false);
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [highlightedItems] = useState<Set<string>>(() =>
    voiceWasUsed
      ? new Set(items.filter(i => (assignments[i.id] ?? []).length === 0).map(i => i.id))
      : new Set()
  );

  const currency = transaction?.currency ?? 'EUR';

  // All people who can be assigned: selected contacts + current user
  const people: Contact[] = useMemo(
    () => [...selectedContacts, CURRENT_USER],
    [selectedContacts]
  );

  // Per-person running totals
  const personTotals: PersonTotals = useMemo(() => {
    const totals: PersonTotals = {};
    for (const person of people) {
      totals[person.id] = items.reduce((sum, item) => {
        const assignees = assignments[item.id] ?? [];
        const idx = assignees.indexOf(person.id);
        if (idx === -1) return sum;
        return sum + splitCentsEvenly(item.price * item.quantity, assignees.length)[idx];
      }, 0);
    }
    return totals;
  }, [items, assignments, people]);

  const receiptTotal = useMemo(
    () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    [items]
  );

  const assignedTotal = useMemo(
    () => items.reduce((s, item) => {
      const hasAssignee = (assignments[item.id] ?? []).length > 0;
      return hasAssignee ? s + item.price * item.quantity : s;
    }, 0),
    [items, assignments]
  );

  const handleTogglePerson = (itemId: string, personId: string) => {
    const current = assignments[itemId] ?? [];
    const next = current.includes(personId)
      ? current.filter(id => id !== personId)
      : [...current, personId];
    dispatch({ type: 'ASSIGN_ITEM', itemId, contactIds: next });
    setBannerText(null);
    highlightedItems.delete(itemId);
  };

  const handleSplitEqually = (itemId: string) => {
    dispatch({ type: 'ASSIGN_ITEM', itemId, contactIds: people.map(p => p.id) });
    setBannerText(null);
    highlightedItems.delete(itemId);
  };

  const handleContinue = () => {
    const unassigned = items.filter(item => (assignments[item.id] ?? []).length === 0);
    if (unassigned.length > 0) {
      setBannerText(`${unassigned.length} item${unassigned.length === 1 ? '' : 's'} still need${unassigned.length === 1 ? 's' : ''} someone assigned`);
      return;
    }
    setBannerText(null);
    navigation.navigate('SpecifySplitConfirm');
  };

  const openEditSheet = (item: ReceiptItem) => {
    setEditTarget(item);
    setSheetVisible(true);
  };

  const openAddSheet = () => {
    setEditTarget(null);
    setSheetVisible(true);
  };

  const handleSheetSave = (item: ReceiptItem) => {
    if (editTarget === null) {
      dispatch({ type: 'ADD_ITEM', item });
    } else {
      dispatch({ type: 'UPDATE_ITEM', id: item.id, patch: item });
    }
    setSheetVisible(false);
  };

  const handleSheetDelete = (id: string) => {
    dispatch({ type: 'REMOVE_ITEM', id });
    setSheetVisible(false);
  };

  const handleClose = () => navigation.getParent()?.goBack();
  const bottomBarHeight = 72 + insets.bottom;

  if (!transaction) {
    return (
      <SafeAreaView style={styles.container}>
        <FlowHeader title="Who had what" onBack={() => navigation.goBack()} onClose={handleClose} />
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.accentPrimary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlowHeader
        title="Who had what"
        onBack={() => navigation.goBack()}
        onClose={handleClose}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarHeight + theme.spacing.base }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <TransactionSummaryCard transaction={transaction} />

        {/* Running totals strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.totalsStrip}
          contentContainerStyle={styles.totalsStripContent}
        >
          {people.map(person => (
            <TotalsCard
              key={person.id}
              person={person}
              totalCents={personTotals[person.id] ?? 0}
              currency={currency}
            />
          ))}
        </ScrollView>

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

        {/* Inline banner for unassigned warning */}
        {bannerText && (
          <View style={styles.banner}>
            <Ionicons name="warning-outline" size={14} color={theme.colors.negative} />
            <Text style={styles.bannerText}>{bannerText}</Text>
          </View>
        )}

        {/* Item list */}
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No items yet — add them below</Text>
          </View>
        ) : (
          items.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              assignees={assignments[item.id] ?? []}
              people={people}
              currency={currency}
              highlighted={highlightedItems.has(item.id)}
              onTogglePerson={handleTogglePerson}
              onSplitEqually={handleSplitEqually}
              onLongPress={openEditSheet}
            />
          ))
        )}

        <Pressable
          style={({ pressed }) => [styles.addItemButton, { opacity: pressed ? 0.8 : 1 }]}
          onPress={openAddSheet}
        >
          <Ionicons name="add" size={18} color={theme.colors.accentPrimary} />
          <Text style={styles.addItemText}>Add item</Text>
        </Pressable>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + theme.spacing.base }]}>
        <Text style={[
          styles.assignedLabel,
          assignedTotal < receiptTotal ? styles.assignedLabelNeg : styles.assignedLabelPos,
        ]}>
          Assigned: {formatCents(assignedTotal, currency)} / {formatCents(receiptTotal, currency)}
        </Text>
        <Pressable
          style={[styles.continueButton, items.length === 0 && styles.continueDisabled]}
          onPress={handleContinue}
          disabled={items.length === 0}
        >
          <Text style={styles.continueText}>Continue</Text>
        </Pressable>
      </View>

      <EditItemSheet
        visible={sheetVisible}
        item={editTarget}
        currency={currency}
        onSave={handleSheetSave}
        onDelete={handleSheetDelete}
        onCancel={() => setSheetVisible(false)}
      />
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
  },
  totalsStrip: {
    marginHorizontal: -theme.spacing.xl,
    marginTop: theme.spacing.base,
  },
  totalsStripContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  totalsCard: {
    width: 72,
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
    gap: 4,
  },
  totalsCardActive: {
    backgroundColor: theme.colors.accentSubtle,
  },
  totalsAvatar: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.full,
    overflow: 'hidden',
  },
  totalsAvatarImg: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.full,
  },
  totalsAvatarFallback: {
    backgroundColor: theme.colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalsAvatarInitial: {
    ...theme.typography.labelStrong,
    color: theme.colors.textPrimary,
  },
  totalsName: {
    ...theme.typography.micro,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  totalsAmount: {
    ...theme.typography.micro,
    color: theme.colors.textTertiary,
    textAlign: 'center',
  },
  totalsAmountActive: {
    color: theme.colors.textPrimary,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: 'rgba(255,92,92,0.12)',
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  bannerText: {
    ...theme.typography.label,
    color: theme.colors.negative,
    flex: 1,
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
    ...theme.typography.micro,
    color: theme.colors.accentPrimary,
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
  emptyState: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyStateText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
  },
  itemRow: {
    marginTop: theme.spacing.base,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.card,
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  itemRowHighlighted: {
    borderLeftColor: '#FF5C5C',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  itemLeft: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  itemMeta: {
    ...theme.typography.micro,
    color: theme.colors.textSecondary,
  },
  itemTotal: {
    ...theme.typography.moneySmall,
    color: theme.colors.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  chipScroll: {
    flex: 1,
  },
  chipScrollContent: {
    gap: theme.spacing.xs,
    paddingRight: theme.spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.bgElevated,
    borderRadius: theme.radii.full,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
  },
  chipSelected: {
    backgroundColor: theme.colors.accentPrimary,
  },
  chipAvatar: {
    width: 20,
    height: 20,
    borderRadius: theme.radii.full,
    overflow: 'hidden',
  },
  chipAvatarImg: {
    width: 20,
    height: 20,
    borderRadius: theme.radii.full,
  },
  chipAvatarFallback: {
    backgroundColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipInitial: {
    ...theme.typography.micro,
    color: theme.colors.textPrimary,
  },
  chipName: {
    ...theme.typography.micro,
    color: theme.colors.textSecondary,
    maxWidth: 50,
  },
  chipNameSelected: {
    color: theme.colors.onAccent,
  },
  splitAllChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.bgElevated,
  },
  splitAllChipActive: {
    backgroundColor: theme.colors.accentSubtle,
  },
  splitAllText: {
    ...theme.typography.micro,
    color: theme.colors.textSecondary,
  },
  splitAllTextActive: {
    color: theme.colors.accentPrimary,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.button,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.base,
    borderWidth: 1.5,
    borderColor: theme.colors.accentPrimary,
    minHeight: 44,
  },
  addItemText: {
    color: theme.colors.accentPrimary,
    fontSize: 15,
    fontWeight: theme.fonts.weights.semibold,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.base,
  },
  assignedLabel: {
    flex: 1,
    ...theme.typography.labelStrong,
  },
  assignedLabelNeg: {
    color: theme.colors.negative,
  },
  assignedLabelPos: {
    color: theme.colors.positive,
  },
  continueButton: {
    backgroundColor: theme.colors.accentPrimary,
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  continueDisabled: {
    opacity: 0.4,
  },
  continueText: {
    color: '#0A0A0A',
    fontSize: 15,
    fontWeight: theme.fonts.weights.bold,
  },
});
