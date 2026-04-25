import { useEffect, useState } from 'react';
import {
  View,
  ScrollView,
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
import { Text } from '../components/ui/Text';
import { Button } from '../components/ui/Button';

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
  const bottomBarHeight = 88 + insets.bottom;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlowHeader
        title="Who was there?"
        onBack={() => navigation.goBack()}
        onClose={handleClose}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.accents.cyan} size="large" />
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
                <Text variant="micro" color="secondary">Near {transaction!.merchantName}</Text>
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
              <Text variant="micro" color="tertiary" style={styles.disclaimer}>
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
            placeholderTextColor={theme.colors.textTertiary}
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
        <Text variant="label" color="secondary" style={styles.selectionCount}>
          {selectedCount === 0
            ? 'No one selected'
            : `${selectedCount} ${selectedCount === 1 ? 'person' : 'people'} selected`}
        </Text>
        <Button
          label="Continue"
          onPress={handleContinue}
          variant="accent"
          accent="cyan"
          disabled={selectedCount === 0}
          fullWidth={false}
          style={styles.continueButton}
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
  nearbyScroll: {
    marginHorizontal: -theme.spacing.xl,
  },
  nearbyScrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.sm,
  },
  disclaimer: {
    marginBottom: theme.spacing.sm,
  },
  searchBar: {
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.full,
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
    backgroundColor: theme.colors.bgRaised,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.base,
  },
  selectionCount: {
    flex: 1,
  },
  continueButton: {
    height: 48,
    paddingHorizontal: theme.spacing.xl,
  },
});
