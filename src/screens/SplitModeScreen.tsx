import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { theme } from '../theme/theme';
import type { Transaction } from '../types/types';
import type { SplitFlowParamList } from '../navigation/types';
import * as api from '../api/client';
import { FlowHeader } from '../components/FlowHeader';
import { TransactionSummaryCard } from '../components/TransactionSummaryCard';
import { Text } from '../components/ui/Text';

type Props = NativeStackScreenProps<SplitFlowParamList, 'SplitMode'>;

interface OptionCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  primary?: boolean;
  onPress: () => void;
}

function OptionCard({ icon, title, subtitle, primary, onPress }: OptionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionCard,
        primary && styles.optionCardPrimary,
        pressed && styles.optionCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.optionIcon, primary && styles.optionIconPrimary]}>
        <Ionicons
          name={icon}
          size={22}
          color={primary ? theme.colors.accents.cyan : theme.colors.textSecondary}
        />
      </View>
      <View style={styles.optionText}>
        <Text variant="bodyStrong" color="primary">{title}</Text>
        <Text variant="label" color="secondary">{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.textTertiary} />
    </Pressable>
  );
}

export default function SplitModeScreen({ navigation, route }: Props) {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCurrentTransaction(route.params.transactionId)
      .then(setTransaction)
      .finally(() => setLoading(false));
  }, [route.params.transactionId]);

  const handleClose = () => navigation.getParent()?.goBack();
  const tid = route.params.transactionId;

  const handleOption = (mode: 'even' | 'specify' | 'voice' | 'none') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mode === 'none') { handleClose(); return; }
    if (mode === 'voice') {
      navigation.navigate('VoiceRecord', { mode: 'even', transactionId: tid });
      return;
    }
    navigation.navigate('ContactPicker', { transactionId: tid, mode });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <FlowHeader title="Split this?" onClose={handleClose} />
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.accents.cyan} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlowHeader title="Split this?" onClose={handleClose} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {transaction && <TransactionSummaryCard transaction={transaction} />}

        <View style={styles.options}>
          <OptionCard
            icon="people-outline"
            title="Split evenly"
            subtitle="Same amount from everyone"
            primary
            onPress={() => handleOption('even')}
          />
          <OptionCard
            icon="receipt-outline"
            title="Split by item"
            subtitle="Upload a receipt and assign items"
            onPress={() => handleOption('specify')}
          />
        </View>

        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text variant="micro" color="tertiary">or</Text>
          <View style={styles.orLine} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.voiceOption, pressed && styles.voiceOptionPressed]}
          onPress={() => handleOption('voice')}
        >
          <Ionicons name="mic-outline" size={16} color={theme.colors.textSecondary} />
          <Text variant="labelStrong" color="secondary">Speak to split</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.skipLink, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => handleOption('none')}
        >
          <Text variant="label" color="tertiary">Don't split</Text>
        </Pressable>
      </ScrollView>
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
    paddingBottom: theme.spacing.xxl,
  },
  options: {
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.base,
    gap: theme.spacing.md,
    minHeight: 72,
  },
  optionCardPrimary: {
    backgroundColor: theme.colors.accentTints.cyan,
  },
  optionCardPressed: {
    transform: [{ scale: 0.97 }],
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconPrimary: {
    backgroundColor: 'rgba(62,191,230,0.2)',
  },
  optionText: {
    flex: 1,
    gap: 3,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginVertical: theme.spacing.base,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: theme.colors.bgElevated,
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.bgElevated,
    marginBottom: theme.spacing.base,
  },
  voiceOptionPressed: {
    backgroundColor: theme.colors.bgRaised,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
});
