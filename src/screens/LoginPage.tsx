import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { loginUser } from '../api/client';
import { theme } from '../theme/theme';
import { Text } from '../components/ui/Text';
import { RainbowStripe } from '../components/ui/RainbowStripe';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export default function LoginPage({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await loginUser({ email, password });
      navigation.replace('MainTabs');
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ?? 'Login failed. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      <View style={styles.header}>
        <RainbowStripe height={4} style={styles.stripe} />
        <Text variant="hero" color="primary" style={styles.brand}>bunq</Text>
        <Text variant="label" color="tertiary">split</Text>
      </View>

      <View style={styles.form}>
        <Text variant="micro" color="tertiary" style={styles.fieldLabel}>EMAIL</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={theme.colors.textTertiary}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <Text variant="micro" color="tertiary" style={[styles.fieldLabel, styles.fieldLabelGap]}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={theme.colors.textTertiary}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text variant="bodyStrong" color="inverse">Log in</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text variant="label" color="tertiary">Don't have an account? </Text>
        <Pressable onPress={() => navigation.navigate('Register')}>
          <Text variant="labelStrong" color="primary">Sign up</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bgBase,
    paddingHorizontal: theme.spacing.xl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.xxl + theme.spacing.base,
    gap: theme.spacing.xs,
  },
  stripe: {
    borderRadius: theme.radii.full,
    marginBottom: theme.spacing.base,
    width: 48,
    height: 4,
  },
  brand: {
    letterSpacing: -1,
  },
  form: {
    gap: theme.spacing.xs,
  },
  fieldLabel: {
    marginBottom: theme.spacing.xs,
  },
  fieldLabelGap: {
    marginTop: theme.spacing.base,
  },
  input: {
    height: 52,
    backgroundColor: theme.colors.bgRaised,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.base,
    fontSize: 16,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  button: {
    height: 56,
    backgroundColor: theme.colors.accents.cyan,
    borderRadius: theme.radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.base,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: theme.spacing.xxl,
  },
});
