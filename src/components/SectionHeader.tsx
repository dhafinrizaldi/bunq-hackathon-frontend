import { theme } from '../theme/theme';
import { Text } from './ui/Text';

interface SectionHeaderProps {
  title: string;
}

export function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <Text
      variant="micro"
      color="tertiary"
      style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }}
    >
      {title.toUpperCase()}
    </Text>
  );
}
