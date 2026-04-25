import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { theme } from '../theme/theme';
import type { Transaction, Contact } from '../types/types';
import type { SplitFlowParamList } from '../navigation/types';
import * as api from '../api/client';
import { FlowHeader } from '../components/FlowHeader';
import { SectionHeader } from '../components/SectionHeader';
import { ContactCard } from '../components/ContactCard';
import { ContactRow } from '../components/ContactRow';

type Props = NativeStackScreenProps<SplitFlowParamList, 'ContactPicker'>;

export default function ContactPickerScreen({ navigation, route }: Props) {
  const { transactionId, mode } = route.params;
  const insets = useSafeAreaInsets();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const nearbyContacts = contacts.filter(
    c => c.distanceMeters !== undefined && c.distanceMeters < 500
  );
  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const showNearby = nearbyContacts.length > 0 && transaction?.location != null;

  useEffect(() => {
    Promise.all([
      api.getCurrentTransaction(transactionId),
      api.getContacts(),
    ])
      .then(([txn, allContacts]) => {
        setTransaction(txn);
        setContacts(allContacts);
      })
      .finally(() => setLoading(false));
  }, [transactionId]);

  const toggleContact = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleContinue = () => {
    if (selectedIds.size === 0) return;
    if (mode === 'even') {
      navigation.navigate('EvenSplitConfirm', {
        transactionId,
        selectedContactIds: Array.from(selectedIds),
      });
    } else {
      navigation.navigate('ReceiptUpload', {
        transactionId,
        selectedContactIds: Array.from(selectedIds),
      });
    }
  };

  const handleClose = () => navigation.getParent()?.goBack();
  const selectedCount = selectedIds.size;
  const bottomBarHeight = 72 + insets.bottom;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlowHeader
        title="Who was there?"
        onBack={() => navigation.goBack()}
        onClose={handleClose}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.accentPrimary} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomBarHeight + theme.spacing.base }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {showNearby && (
            <View>
              <View style={styles.nearbyHeading}>
                <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
                <Text style={styles.nearbyHeadingText}>
                  Near {transaction!.merchantName}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.nearbyScroll}
                contentContainerStyle={styles.nearbyScrollContent}
              >
                {nearbyContacts.map(c => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    selected={selectedIds.has(c.id)}
                    onPress={() => toggleContact(c.id)}
                  />
                ))}
              </ScrollView>
              <Text style={styles.disclaimer}>
                Based on approximate location · Mocked for demo
              </Text>
            </View>
          )}

          <SectionHeader title="All contacts" />
          <TextInput
            style={styles.searchBar}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search..."
            placeholderTextColor={theme.colors.textSecondary}
          />
          {filteredContacts.map(c => (
            <ContactRow
              key={c.id}
              contact={c}
              selected={selectedIds.has(c.id)}
              onPress={() => toggleContact(c.id)}
            />
          ))}
        </ScrollView>
      )}

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + theme.spacing.base }]}>
        <Text style={styles.selectionCount}>
          {selectedCount === 0
            ? 'No one selected'
            : `${selectedCount} ${selectedCount === 1 ? 'person' : 'people'} selected`}
        </Text>
        <Pressable
          style={[styles.continueButton, selectedCount === 0 && styles.continueDisabled]}
          onPress={handleContinue}
          disabled={selectedCount === 0}
        >
          <Text style={styles.continueText}>Continue</Text>
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
  loadingContainer: {
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
  nearbyHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
  nearbyHeadingText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontWeight: theme.fonts.weights.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  nearbyScroll: {
    marginHorizontal: -theme.spacing.xl,
  },
  nearbyScrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  disclaimer: {
    color: theme.colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: theme.spacing.sm,
  },
  searchBar: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.button,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: 15,
    marginBottom: theme.spacing.sm,
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
    justifyContent: 'space-between',
    gap: theme.spacing.base,
  },
  selectionCount: {
    color: theme.colors.textSecondary,
    fontSize: 13,
    flex: 1,
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
