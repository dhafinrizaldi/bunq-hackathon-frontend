// StatusStrip is now inlined in HomeScreen's header — this export kept for
// any screen that still imports it, but HomeScreen no longer uses it.
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export function StatusStrip() {
  return (
    <View style={styles.row}>
      <View style={styles.dot} />
      <Text style={styles.text}>Connected to bunq</Text>
    </View>
  );
}

export function StatusIndicator() {
  return (
    <View style={styles.row}>
      <View style={styles.dot} />
      <Text style={styles.text}>Connected</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.positive,
  },
  text: {
    ...theme.typography.micro,
    color: theme.colors.textTertiary,
  },
});
