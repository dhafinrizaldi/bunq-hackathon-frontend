import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme/theme';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profile</Text>
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
