import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export default function ActivityScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Activity</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: theme.colors.textPrimary,
    fontSize: 24,
    fontWeight: theme.fonts.weights.bold,
  },
});
