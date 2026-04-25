import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

const SUGGESTIONS = [
  "How much did I spend this month?",
  "Who owes me money right now?",
  "Split my last transaction with Tom and Anna",
];

interface Props {
  onSelectPrompt: (text: string) => void;
}

export function WelcomeState({ onSelectPrompt }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="sparkles-outline" size={40} color={theme.colors.accents.cyan} />
      <Text style={styles.heading}>Ask me anything about your money</Text>
      <View style={styles.chips}>
        {SUGGESTIONS.map(s => (
          <Pressable
            key={s}
            style={({ pressed }) => [styles.chip, { opacity: pressed ? 0.75 : 1 }]}
            onPress={() => onSelectPrompt(s)}
          >
            <Text style={styles.chipText}>{s}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.base,
  },
  heading: {
    fontSize: 17,
    fontWeight: theme.fonts.weights.semibold,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
  chips: {
    gap: theme.spacing.sm,
    alignSelf: 'stretch',
    marginTop: theme.spacing.sm,
  },
  chip: {
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.full,
    borderWidth: 1,
    borderColor: theme.colors.bgElevated,
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
  },
  chipText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
});
