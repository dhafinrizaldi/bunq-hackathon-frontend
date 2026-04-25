import { useMemo, useState } from 'react';
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
import type { ReceiptItem, Contact } from '../types/types';
import type { SplitFlowParamList } from '../navigation/types';
import { useSplitFlow } from '../context/SplitFlowContext';
import { mockUser } from '../mocks/mockUser';
import { splitCentsEvenly, formatCents } from '../lib/money';
import { FlowHeader } from '../components/FlowHeader';
import { TransactionSummaryCard } from '../components/TransactionSummaryCard';
import { EditItemSheet } from '../components/EditItemSheet';
import { Text } from '../components/ui/Text';
import { Money } from '../components/ui/Money';
import { Button } from '../components/ui/Button';
import { CategoryIcon } from '../components/ui/CategoryIcon';

type Props = NativeStackScreenProps<SplitFlowParamList, 'ItemAssignment'>;

const CURRENT_USER: Contact = {
  id: mockUser.id,
  email: mockUser.email,
  name: 'You',
  avatarUrl: mockUser.avatarUrl,
};

// ─── Running Totals Card ────────────────────────────────────────
interface TotalsCardProps {
  person: Contact;
  totalCents: number;
  currency: string;
}

function TotalsCard({ person, totalCents, currency }: TotalsCardProps) {
  const accent = accentForKey(person.name);
  const hasAmount = totalCents > 0;

  return (
    <View style={[styles.totalsCard, hasAmount && { backgroundColor: theme.colors.accentTints[accent] }]}>
      <CategoryIcon initials={person.name.slice(0, 2)} accent={accent} size={32} />
      <Text variant="micro" color="secondary" style={styles.totalsName} numberOfLines={1}>
        {person.name}
      </Text>
      <Text
        variant="micro"
        color={hasAmount ? 'primary' : 'tertiary'}
        style={styles.totalsAmount}
        numberOfLines={1}
      >
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
  const accent = accentForKey(person.name);

  return (
    <Pressable
      style={[
        styles.chip,
        selected && { backgroundColor: theme.colors.accents[accent] },
      ]}
      onPress={onPress}
    >
      <CategoryIcon initials={person.name.slice(0, 2)} accent={accent} size={20} />
      <Text
        variant="micro"
        color={selected ? 'inverse' : 'secondary'}
        style={styles.chipName}
        numberOfLines={1}
      >
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
          <Text variant="bodyStrong" color="primary">{item.name}</Text>
          <Text variant="micro" color="secondary">{item.quantity} × {formatCents(item.price, currency)}</Text>
        </View>
        <Money amountCents={total} currency={currency} size="small" color="primary" />
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
          <Text variant="micro" color={allSelected ? 'primary' : 'tertiary'}>All</Text>
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

  const people: Contact[] = useMemo(
    () => [...selectedContacts, CURRENT_USER],
    [selectedContacts]
  );

  const personTotals = useMemo(() => {
    const totals: Record<string, number> = {};
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

  const openEditSheet = (item: ReceiptItem) => { setEditTarget(item); setSheetVisible(true); };
  const openAddSheet = () => { setEditTarget(null); setSheetVisible(true); };

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
          <ActivityIndicator color={theme.colors.accents.cyan} size="large" />
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

        {voiceWasUsed && !voiceBannerDismissed && (
          <View style={styles.voiceBanner}>
            <Text variant="label" color="secondary" style={styles.flex1}>
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
              <Text variant="body" color="secondary" style={styles.transcriptText}>"{lastTranscript}"</Text>
            )}
          </Pressable>
        )}

        {bannerText && (
          <View style={styles.banner}>
            <Ionicons name="warning-outline" size={14} color={theme.colors.negative} />
            <Text variant="label" color="negative" style={styles.flex1}>{bannerText}</Text>
          </View>
        )}

        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="label" color="secondary">No items yet — add them below</Text>
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
          <Ionicons name="add" size={18} color={theme.colors.accents.cyan} />
          <Text variant="labelStrong" color="primary">Add item</Text>
        </Pressable>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + theme.spacing.base }]}>
        <Text
          variant="labelStrong"
          color={assignedTotal < receiptTotal ? 'negative' : 'positive'}
          style={styles.flex1}
        >
          {formatCents(assignedTotal, currency)} / {formatCents(receiptTotal, currency)}
        </Text>
        <Button
          label="Continue"
          onPress={handleContinue}
          variant="accent"
          accent="cyan"
          disabled={items.length === 0}
          fullWidth={false}
          style={styles.continueBtn}
        />
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
    backgroundColor: theme.colors.bgBase,
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
  totalsName: {
    textAlign: 'center',
  },
  totalsAmount: {
    textAlign: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.negativeSoft,
    borderRadius: theme.radii.sm,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    marginTop: theme.spacing.sm,
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
  flex1: {
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
  emptyState: {
    paddingVertical: theme.spacing.xxl,
    alignItems: 'center',
  },
  itemRow: {
    marginTop: theme.spacing.base,
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.base,
    gap: theme.spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  itemRowHighlighted: {
    borderLeftColor: theme.colors.negative,
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
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  chipScroll: { flex: 1 },
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
  chipName: {
    maxWidth: 50,
  },
  splitAllChip: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 5,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.bgElevated,
  },
  splitAllChipActive: {
    backgroundColor: theme.colors.bgElevated,
    borderWidth: 1,
    borderColor: theme.colors.accents.cyan,
  },
  addItemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.full,
    paddingVertical: theme.spacing.md,
    marginTop: theme.spacing.base,
    borderWidth: 1.5,
    borderColor: theme.colors.accents.cyan,
    minHeight: 44,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: theme.colors.bgRaised,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.base,
  },
  continueBtn: {
    height: 48,
    paddingHorizontal: theme.spacing.xl,
  },
});
