import { Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return <Text style={styles.text}>{title.toUpperCase()}</Text>;
}

const styles = StyleSheet.create({
  text: {
    ...theme.typography.micro,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xl,
    marginBottom: theme.spacing.sm,
  },
});
