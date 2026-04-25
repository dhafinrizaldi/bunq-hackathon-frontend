import { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
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

type Props = NativeStackScreenProps<SplitFlowParamList, 'SplitMode'>;

interface OptionCardProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle: string;
  accent?: boolean;
  onPress: () => void;
}

function OptionCard({ icon, title, subtitle, accent, onPress }: OptionCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionCard,
        accent && styles.optionCardAccent,
        pressed && styles.optionCardPressed,
      ]}
      onPress={onPress}
    >
      <View style={[styles.optionIcon, accent && styles.optionIconAccent]}>
        <Ionicons
          name={icon}
          size={22}
          color={accent ? theme.colors.accentPrimary : theme.colors.textSecondary}
        />
      </View>
      <View style={styles.optionText}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
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
          <ActivityIndicator color={theme.colors.accentPrimary} size="large" />
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
            accent
            onPress={() => handleOption('even')}
          />
          <OptionCard
            icon="receipt-outline"
            title="Split by item"
            subtitle="Upload a receipt and assign items"
            onPress={() => handleOption('specify')}
          />
        </View>

        {/* Voice option — demoted, beneath "or" divider */}
        <View style={styles.orRow}>
          <View style={styles.orLine} />
          <Text style={styles.orLabel}>or</Text>
          <View style={styles.orLine} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.voiceOption, pressed && styles.voiceOptionPressed]}
          onPress={() => handleOption('voice')}
        >
          <Ionicons name="mic-outline" size={16} color={theme.colors.textSecondary} />
          <Text style={styles.voiceOptionText}>Speak to split</Text>
        </Pressable>

        {/* Don't split */}
        <Pressable
          style={({ pressed }) => [styles.skipLink, { opacity: pressed ? 0.6 : 1 }]}
          onPress={() => handleOption('none')}
        >
          <Text style={styles.skipText}>Don't split</Text>
        </Pressable>
      </ScrollView>
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
  optionCardAccent: {
    backgroundColor: theme.colors.accentSubtle,
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
  optionIconAccent: {
    backgroundColor: 'rgba(0,220,120,0.2)',
  },
  optionText: {
    flex: 1,
    gap: 3,
  },
  optionTitle: {
    ...theme.typography.bodyStrong,
    color: theme.colors.textPrimary,
  },
  optionSubtitle: {
    ...theme.typography.label,
    color: theme.colors.textSecondary,
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
    backgroundColor: theme.colors.divider,
  },
  orLabel: {
    ...theme.typography.micro,
    color: theme.colors.textTertiary,
  },
  voiceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.base,
  },
  voiceOptionPressed: {
    backgroundColor: theme.colors.bgRaised,
  },
  voiceOptionText: {
    ...theme.typography.labelStrong,
    color: theme.colors.textSecondary,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  skipText: {
    ...theme.typography.label,
    color: theme.colors.textTertiary,
  },
});
