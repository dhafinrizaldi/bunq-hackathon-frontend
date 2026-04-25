import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme } from '../theme/theme';
import type { Transaction, PendingSplit } from '../types/types';
import type { TabParamList, RootStackParamList } from '../navigation/types';
import { mockTransactions } from '../mocks/mockTransactions';
import { mockUser } from '../mocks/mockUser';
import * as api from '../api/client';
import { TransactionRow } from '../components/TransactionRow';
import { PendingSplitRow } from '../components/PendingSplitRow';
import { SectionHeader } from '../components/SectionHeader';
import { Fab } from '../components/Fab';

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [pendingSplits, setPendingSplits] = useState<PendingSplit[]>([]);
  const [splitsLoading, setSplitsLoading] = useState(true);

  useEffect(() => {
    api.getSessions()
      .then(setPendingSplits)
      .finally(() => setSplitsLoading(false));
  }, []);

  const handleSplitPress = (transaction: Transaction) => {
    navigation.navigate('SplitFlowStack', {
      screen: 'SplitMode',
      params: { transactionId: transaction.id },
    });
  };

  const handleLongPressTransaction = (transaction: Transaction) => {
    console.log('Voice split triggered for transaction:', transaction.id);
  };

  const handlePendingSplitPress = (split: PendingSplit) => {
    navigation.navigate('SessionDetail', { splitId: split.id });
  };

  const handleFabPress = () => {
    navigation.navigate('SplitFlowStack', {
      screen: 'SplitMode',
      params: { transactionId: mockTransactions[0].id },
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.appName}>bunq split</Text>
          <View style={styles.headerRight}>
            {/* Inline connection status — micro text, top-right */}
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>Connected</Text>
            </View>
            <Pressable style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {mockUser.name.charAt(0).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader title="Recent Transactions" />
          {mockTransactions.map(t => (
            <TransactionRow
              key={t.id}
              transaction={t}
              onSplitPress={handleSplitPress}
              onLongPress={handleLongPressTransaction}
            />
          ))}

          <SectionHeader title="Pending Splits" />
          {splitsLoading ? (
            <ActivityIndicator color={theme.colors.accentPrimary} style={styles.loader} />
          ) : (
            pendingSplits.map(s => (
              <PendingSplitRow
                key={s.id}
                split={s}
                onPress={handlePendingSplitPress}
              />
            ))
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>

      <Fab onPress={handleFabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.base,
    paddingBottom: theme.spacing.md,
  },
  appName: {
    ...theme.typography.heading,
    color: theme.colors.textPrimary,
    fontSize: 22,
    fontWeight: theme.fonts.weights.bold,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.positive,
  },
  statusText: {
    ...theme.typography.micro,
    color: theme.colors.textTertiary,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.accentPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...theme.typography.labelStrong,
    color: theme.colors.onAccent,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
  },
  loader: {
    marginTop: theme.spacing.base,
  },
});
