import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { theme, accentForKey } from '../theme/theme';
import type { TabParamList } from '../navigation/types';
import type { MonetaryAccount } from '../types/types';
import { mockUser } from '../mocks/mockUser';
import { useProfileData } from '../hooks/useProfileData';
import { useProfileInsights } from '../hooks/useProfileInsights';
import { Text } from '../components/ui/Text';
import { Money } from '../components/ui/Money';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { RainbowStripe } from '../components/ui/RainbowStripe';

type Props = BottomTabScreenProps<TabParamList, 'Profile'>;

function formatIban(iban: string): string {
  if (iban.length < 8) return iban;
  return `${iban.slice(0, 4)} ${iban.slice(4, 8)} ••• ${iban.slice(-4)}`;
}

function AccountCard({ account }: { account: MonetaryAccount }) {
  const accent = accentForKey(account.description || 'Main');
  const name = account.description || 'Main';
  return (
    <Card variant="solid" accent={accent} style={styles.accountCard}>
      <Text variant="bodyMedium" color="inverse" numberOfLines={1}>{name}</Text>
      <View style={styles.accountBalance}>
        <Money amountCents={account.balance} currency={account.currency} size="medium" color="inverse" />
      </View>
      <Text variant="label" color="inverse" style={styles.accountCurrency}>{account.currency}</Text>
    </Card>
  );
}

export default function ProfileScreen({ navigation }: Props) {
  const { user, accounts, netBalance, loading, refetch: refetchProfile } = useProfileData();
  const { insights, loading: insightsLoading, refetch: refetchInsights } = useProfileInsights();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const displayName = user?.name ?? (loading ? mockUser.name : 'You');
  const accent = accentForKey(displayName);
  const initials = displayName.slice(0, 2);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    refetchProfile();
    refetchInsights();
    setTimeout(() => setIsRefreshing(false), 1200);
  }, [refetchProfile, refetchInsights]);

  const handleSignOut = () => {
    navigation.getParent()?.dispatch(
      CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
    );
  };

  const showNetBalance = !loading && netBalance !== null;
  const isSettledUp = netBalance !== null && netBalance.owedToYou === 0 && netBalance.youOwe === 0;
  const netPositive = (netBalance?.net ?? 0) >= 0;

  const showAccounts = !loading && accounts !== null && accounts.length > 0;
  const showInsights = insightsLoading || insights !== null;

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.textSecondary}
            />
          }
        >
          {/* Identity header */}
          <View style={styles.header}>
            <CategoryIcon initials={initials} accent={accent} size={72} />
            <Text variant="title" color="primary" style={styles.name}>{displayName}</Text>
            {user?.iban ? (
              <Text variant="micro" color="tertiary">{formatIban(user.iban)}</Text>
            ) : null}
          </View>

          {/* Net balance */}
          {showNetBalance && (
            <View style={styles.section}>
              {isSettledUp ? (
                <Text variant="body" color="secondary" style={styles.settledUp}>All settled up</Text>
              ) : (
                <Card
                  variant="default"
                  style={{ backgroundColor: netPositive ? theme.colors.positiveSoft : theme.colors.negativeSoft }}
                >
                  <View style={styles.balanceRow}>
                    <View style={styles.balanceCol}>
                      <Text variant="micro" color="tertiary">YOU'RE OWED</Text>
                      <View style={styles.balanceAmount}>
                        <Money amountCents={netBalance!.owedToYou} size="large" color="positive" />
                      </View>
                    </View>
                    <View style={styles.balanceDivider} />
                    <View style={styles.balanceCol}>
                      <Text variant="micro" color="tertiary">YOU OWE</Text>
                      <View style={styles.balanceAmount}>
                        <Money amountCents={netBalance!.youOwe} size="large" color="negative" />
                      </View>
                    </View>
                  </View>
                  <View style={styles.netRow}>
                    <Text variant="micro" color="tertiary" style={styles.netLabel}>NET</Text>
                    <Money
                      amountCents={Math.abs(netBalance!.net)}
                      size="hero"
                      color={netPositive ? 'positive' : 'negative'}
                    />
                  </View>
                </Card>
              )}
            </View>
          )}

          {/* Accounts */}
          {showAccounts && (
            <View style={styles.section}>
              <Text variant="labelUpper" color="tertiary" style={styles.sectionLabel}>Accounts</Text>
              {accounts!.length === 1 ? (
                <AccountCard account={accounts![0]} />
              ) : (
                <View style={styles.accountsGrid}>
                  {accounts!.map(acc => (
                    <View key={acc.id} style={styles.accountsGridItem}>
                      <AccountCard account={acc} />
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Insights */}
          {showInsights && (
            <View style={styles.section}>
              <Text variant="labelUpper" color="tertiary" style={styles.sectionLabel}>
                What I know about you
              </Text>
              <Card variant="default">
                {insightsLoading ? (
                  <View style={styles.insightsLoading}>
                    <ActivityIndicator size="small" color={theme.colors.textTertiary} />
                    <Text variant="label" color="tertiary" style={styles.thinkingText}>Thinking…</Text>
                  </View>
                ) : (
                  <View style={styles.insightsList}>
                    {insights!.split('\n').filter(l => l.trim()).map((line, i) => (
                      <Text key={i} variant="body" color="secondary">{line}</Text>
                    ))}
                  </View>
                )}
              </Card>
            </View>
          )}

          {/* Sign out */}
          <View style={styles.signOut}>
            <Button label="Sign out" variant="ghost" onPress={handleSignOut} fullWidth={false} />
          </View>
        </ScrollView>
      </SafeAreaView>
      <RainbowStripe height={3} />
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xxxl,
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing.xxl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.sm,
  },
  name: {
    marginTop: theme.spacing.sm,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionLabel: {
    marginBottom: theme.spacing.sm,
  },
  settledUp: {
    textAlign: 'center',
    paddingVertical: theme.spacing.base,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.base,
  },
  balanceCol: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  balanceAmount: {
    marginTop: theme.spacing.xs,
  },
  balanceDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginTop: theme.spacing.lg,
  },
  netRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.base,
    paddingTop: theme.spacing.base,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  netLabel: {
    alignSelf: 'flex-end',
    marginBottom: 6,
  },
  accountCard: {
    gap: theme.spacing.xs,
  },
  accountBalance: {
    marginTop: theme.spacing.xs,
  },
  accountCurrency: {
    opacity: 0.65,
  },
  accountsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  accountsGridItem: {
    width: '48%',
  },
  insightsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  thinkingText: {
    fontStyle: 'italic',
  },
  insightsList: {
    gap: theme.spacing.sm,
  },
  signOut: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
  },
});
