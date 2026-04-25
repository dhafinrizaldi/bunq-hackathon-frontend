import { useEffect, useState } from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { theme, accentForKey } from '../theme/theme';
import type { Transaction, PendingSplit } from '../types/types';
import type { TabParamList, RootStackParamList } from '../navigation/types';
import { mockTransactions } from '../mocks/mockTransactions';
import { mockUser } from '../mocks/mockUser';
import * as api from '../api/client';
import { TransactionRow } from '../components/TransactionRow';
import { PendingSplitRow } from '../components/PendingSplitRow';
import { SectionHeader } from '../components/SectionHeader';
import { Fab } from '../components/Fab';
import { Text } from '../components/ui/Text';
import { RainbowStripe } from '../components/ui/RainbowStripe';
import { CategoryIcon } from '../components/ui/CategoryIcon';

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

  const handleLongPressTransaction = (_transaction: Transaction) => {};

  const handlePendingSplitPress = (split: PendingSplit) => {
    navigation.navigate('SessionDetail', { splitId: split.id });
  };

  const handleFabPress = () => {
    navigation.navigate('SplitFlowStack', {
      screen: 'SplitMode',
      params: { transactionId: mockTransactions[0].id },
    });
  };

  const userAccent = accentForKey(mockUser.name);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text variant="micro" color="tertiary">bunq split</Text>
            <Text variant="title" color="primary">Hi, {mockUser.name.split(' ')[0]}</Text>
          </View>
          <CategoryIcon
            initials={mockUser.name.slice(0, 2)}
            accent={userAccent}
            size={38}
          />
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
            <ActivityIndicator color={theme.colors.accents.cyan} style={styles.loader} />
          ) : pendingSplits.length === 0 ? (
            <Text variant="label" color="tertiary" style={styles.emptyState}>No pending splits</Text>
          ) : (
            pendingSplits.map(s => (
              <PendingSplitRow
                key={s.id}
                split={s}
                onPress={handlePendingSplitPress}
              />
            ))
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>

      <RainbowStripe height={3} />
      <Fab onPress={handleFabPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
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
  emptyState: {
    marginTop: theme.spacing.md,
  },
});
