import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMobileSession } from "@/context/session";
import { BrandAccentBar, LuumoLogo, PrimaryButton } from "@/components/ui";
import { colors, radii } from "@/theme";

export default function MobileLoginScreen() {
  const { login, startDemo } = useMobileSession();
  const router = useRouter();
  const [serverUrl, setServerUrl] = useState("http://192.168.1.10:8069");
  const [userLogin, setUserLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(serverUrl, userLogin, password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = () => {
    startDemo();
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.hero}>
        <BrandAccentBar />
        <View style={styles.heroInner}>
          <View style={styles.logoCard}>
            <LuumoLogo variant="dark-text" height={36} />
          </View>
          <Text style={styles.subtitle}>
            ERP Commercial, Caisse Tactile &amp; Suivi des Crédits
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.formContainer}>
        <View style={styles.demoCard}>
          <Text style={styles.demoTitle}>Découvrir en Mode Démo</Text>
          <Text style={styles.demoDesc}>
            Explorez immédiatement la caisse, le suivi des stocks et les comptes clients avec des données pré-chargées.
          </Text>
          <PrimaryButton
            tone="gold"
            label="Explorer en mode démo"
            onPress={handleDemo}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Connexion à votre espace</Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Text style={styles.label}>Adresse du serveur Luumo</Text>
          <TextInput
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="http://192.168.1.10:8069"
            style={styles.input}
          />

          <Text style={styles.label}>Identifiant</Text>
          <TextInput
            value={userLogin}
            onChangeText={setUserLogin}
            autoCapitalize="none"
            placeholder="contact@entreprise.gn"
            style={styles.input}
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            style={styles.input}
          />

          <PrimaryButton
            label={loading ? "Connexion..." : "Se connecter"}
            onPress={handleLogin}
            disabled={loading}
            style={{ marginTop: 14 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  hero: { backgroundColor: colors.primary, paddingBottom: 24, paddingTop: 44 },
  heroInner: { paddingHorizontal: 20, paddingTop: 16, alignItems: "flex-start" },
  logoCard: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginBottom: 10,
  },
  subtitle: { color: "#E8F2EE", fontSize: 13, marginTop: 4 },
  formContainer: { padding: 16, gap: 16 },
  demoCard: {
    backgroundColor: colors.goldSoft,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.gold,
    gap: 10,
  },
  demoTitle: { fontSize: 15, fontWeight: "800", color: colors.text },
  demoDesc: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: 10,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.text,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.sm,
    padding: 10,
    marginBottom: 8,
  },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: "600" },
});
