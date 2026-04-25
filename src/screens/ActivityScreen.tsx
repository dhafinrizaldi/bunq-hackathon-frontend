import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme/theme';
import { Text } from '../components/ui/Text';

export default function ActivityScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="title" color="primary">Activity</Text>
      </View>
      <View style={styles.emptyState}>
        <Ionicons name="time-outline" size={48} color={theme.colors.textTertiary} />
        <Text variant="heading" color="primary" style={styles.emptyTitle}>No activity yet</Text>
        <Text variant="body" color="secondary" style={styles.emptySubtitle}>
          Completed and pending splits will appear here.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.base,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xxl,
    gap: theme.spacing.sm,
  },
  emptyTitle: {
    marginTop: theme.spacing.sm,
  },
  emptySubtitle: {
    textAlign: 'center',
  },
});
