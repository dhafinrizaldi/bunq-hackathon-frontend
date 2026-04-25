import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/types";
import { registerUser } from "../api/client";

type Props = NativeStackScreenProps<RootStackParamList, "Register">;

export default function RegisterPage({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await registerUser({ email, password });
      navigation.replace("MainTabs");
    } catch (err: any) {
      console.log("Registration error:", err);
      const message =
        err?.response?.data?.detail ?? "Registration failed. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View style={styles.logoMark} />
        <Text style={styles.brand}>bunq</Text>
        <Text style={styles.tagline}>Create your account</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#aaa"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Text style={styles.label}>Confirm password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#aaa"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Pressable onPress={() => navigation.navigate("Login")}>
          <Text style={styles.footerLink}>Log in</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const BUNQ_GREEN = "#00D48A";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 28,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: BUNQ_GREEN,
    marginBottom: 12,
  },
  brand: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111",
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: "#888",
    marginTop: 4,
  },
  form: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#444",
    marginBottom: 2,
    marginTop: 12,
  },
  input: {
    height: 50,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#111",
    backgroundColor: "#FAFAFA",
  },
  button: {
    height: 52,
    backgroundColor: BUNQ_GREEN,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 48,
  },
  footerText: {
    fontSize: 14,
    color: "#888",
  },
  footerLink: {
    fontSize: 14,
    color: BUNQ_GREEN,
    fontWeight: "600",
  },
});
