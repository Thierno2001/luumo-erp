import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Lock,
  ShieldCheck,
  Sparkles,
  User as UserIcon,
  Server,
  KeyRound,
  Phone,
  X,
  Building2,
  Store,
  Briefcase,
  Mail,
  CheckCircle2,
} from "lucide-react-native";
import { useMobileSession } from "@/context/session";
import { mobileApi } from "@/lib/api";
import { BrandAccentBar, LuumoLogo, PrimaryButton } from "@/components/ui";
import { colors, radii } from "@/theme";

export default function MobileLoginScreen() {
  const { login, register, startDemo } = useMobileSession();
  const router = useRouter();
  const [serverUrl, setServerUrl] = useState("http://192.168.1.10:8069");
  const [showServerInput, setShowServerInput] = useState(false);
  const [userLogin, setUserLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal Inscription Entreprise avec OTP Obligatoire (Mobile)
  const [registerOpen, setRegisterOpen] = useState(false);
  const [regStep, setRegStep] = useState<1 | 2>(1);
  const [regCompanyName, setRegCompanyName] = useState("");
  const [regAdminName, setRegAdminName] = useState("");
  const [regLogin, setRegLogin] = useState("");
  const [regPhone, setRegPhone] = useState("+224 ");
  const [regPassword, setRegPassword] = useState("");
  const [regProfile, setRegProfile] = useState<"retail" | "wholesale" | "services">("retail");
  const [regCode, setRegCode] = useState("");
  const [regMaskedEmail, setRegMaskedEmail] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regSmsCooldown, setRegSmsCooldown] = useState(0);

  React.useEffect(() => {
    if (regSmsCooldown <= 0) return;
    const t = setInterval(() => setRegSmsCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [regSmsCooldown]);

  // Modal Mot de passe oublié avec OTP (Mobile)
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotLogin, setForgotLogin] = useState("");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [smsCooldown, setSmsCooldown] = useState(0);

  React.useEffect(() => {
    if (smsCooldown <= 0) return;
    const t = setInterval(() => setSmsCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [smsCooldown]);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await login(serverUrl, userLogin.trim(), password);
      router.replace("/(tabs)");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Échec de connexion");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequestOtp = async () => {
    if (!forgotLogin.trim()) {
      setForgotError("Email commerçant obligatoire.");
      return;
    }
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);
    try {
      const res = await mobileApi.requestOtp(serverUrl, {
        login: forgotLogin.trim(),
        purpose: "password_reset",
        channel: "email",
        phone: forgotPhone.trim() || undefined,
      });
      setForgotSuccess(res.message);
      setForgotStep(2);
      setSmsCooldown(45);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Échec d'envoi du code");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResendSms = async () => {
    if (smsCooldown > 0 || forgotLoading) return;
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);
    try {
      const res = await mobileApi.requestOtp(serverUrl, {
        login: forgotLogin.trim(),
        purpose: "password_reset",
        channel: "sms",
        phone: forgotPhone.trim() || undefined,
      });
      setForgotSuccess(res.message);
      setSmsCooldown(45);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Échec d'envoi du SMS");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotConfirm = async () => {
    if (forgotCode.trim().length !== 6) {
      setForgotError("Saisissez le code à 6 chiffres.");
      return;
    }
    setForgotError(null);
    setForgotSuccess(null);
    setForgotLoading(true);
    try {
      const res = await mobileApi.resetPassword(serverUrl, {
        login: forgotLogin.trim(),
        code: forgotCode.trim(),
        phone: forgotPhone.trim() || undefined,
        new_password: forgotNewPassword,
      });
      setForgotSuccess(res.message);
      setUserLogin(forgotLogin.trim());
      setPassword(forgotNewPassword);
      setTimeout(() => {
        setForgotOpen(false);
        setForgotStep(1);
        setForgotCode("");
        setForgotSuccess(null);
      }, 2500);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Échec de réinitialisation");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleRegisterRequestOtp = async () => {
    if (!regCompanyName.trim() || !regAdminName.trim() || !regLogin.trim() || !regPassword.trim()) {
      setRegError("Tous les champs obligatoires doivent être renseignés.");
      return;
    }
    if (regPassword.length < 8) {
      setRegError("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }
    setRegError(null);
    setRegSuccess(null);
    setRegLoading(true);
    try {
      const res = await mobileApi.requestRegisterOtp(serverUrl, {
        company_name: regCompanyName.trim(),
        admin_name: regAdminName.trim(),
        login: regLogin.trim(),
        phone: regPhone.trim(),
        password: regPassword,
        business_profile: regProfile,
      });
      setRegMaskedEmail(res.masked_email || regLogin.trim());
      setRegSmsCooldown(res.cooldown_sms || 45);
      setRegSuccess(res.message);
      setRegStep(2);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Échec d'envoi du code d'activation");
    } finally {
      setRegLoading(false);
    }
  };

  const handleRegisterResendSms = async () => {
    if (regSmsCooldown > 0 || regSmsLoading) return;
    setRegError(null);
    setRegSuccess(null);
    setRegSmsLoading(true);
    try {
      const res = await mobileApi.resendRegisterSms(serverUrl, {
        login: regLogin.trim(),
        phone: regPhone.trim(),
      });
      setRegSuccess(res.message);
      setRegSmsCooldown(res.cooldown || 45);
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Échec d'envoi du SMS de secours");
    } finally {
      setRegSmsLoading(false);
    }
  };

  const handleRegisterConfirm = async () => {
    if (regCode.trim().length !== 6) {
      setRegError("Saisissez le code d'activation à 6 chiffres.");
      return;
    }
    setRegError(null);
    setRegSuccess(null);
    setRegLoading(true);
    try {
      await register(serverUrl, {
        company_name: regCompanyName.trim(),
        admin_name: regAdminName.trim(),
        login: regLogin.trim(),
        phone: regPhone.trim(),
        password: regPassword,
        business_profile: regProfile,
        code: regCode.trim(),
      });
      setRegisterOpen(false);
      router.replace("/(tabs)");
    } catch (err) {
      setRegError(err instanceof Error ? err.message : "Échec d'activation du compte");
    } finally {
      setRegLoading(false);
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
      <BrandAccentBar />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header avec Logo et Badge de sécurité */}
        <View style={styles.header}>
          <LuumoLogo variant="light-text" height={32} />
          <View style={styles.secureBadge}>
            <ShieldCheck size={13} color="#34D399" />
            <Text style={styles.secureBadgeText}>Connexion sécurisée Luumo Guinée</Text>
          </View>
        </View>

        {/* Carte de Connexion Principale */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Connexion à votre espace</Text>
          <Text style={styles.cardSubtitle}>
            Accédez à votre caisse comptoir, stocks en temps réel et carnet de dettes.
          </Text>

          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Identifiant */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email ou identifiant</Text>
            <View style={styles.inputWrapper}>
              <UserIcon size={16} color="#708F83" style={styles.inputIcon} />
              <TextInput
                value={userLogin}
                onChangeText={setUserLogin}
                autoCapitalize="none"
                placeholder="contact@entreprise.gn"
                placeholderTextColor="#526B63"
                style={styles.input}
              />
            </View>
          </View>

          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Mot de passe</Text>
              <Pressable
                onPress={() => {
                  setForgotLogin(userLogin.trim());
                  setForgotError(null);
                  setForgotSuccess(null);
                  setForgotOpen(true);
                }}
              >
                <Text style={styles.forgotLink}>Mot de passe oublié ?</Text>
              </Pressable>
            </View>
            <View style={styles.inputWrapper}>
              <Lock size={16} color="#708F83" style={styles.inputIcon} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor="#526B63"
                style={styles.input}
              />
            </View>
          </View>

          {/* Option Serveur URL (dépliable) */}
          <View style={styles.serverSection}>
            <Pressable
              onPress={() => setShowServerInput(!showServerInput)}
              style={styles.serverToggle}
            >
              <Server size={12} color="#708F83" />
              <Text style={styles.serverToggleText}>
                {showServerInput ? "Masquer l'adresse serveur" : "Configurer l'adresse serveur"}
              </Text>
            </Pressable>

            {showServerInput && (
              <TextInput
                value={serverUrl}
                onChangeText={setServerUrl}
                autoCapitalize="none"
                keyboardType="url"
                placeholder="http://192.168.1.10:8069"
                placeholderTextColor="#526B63"
                style={[styles.input, styles.serverInput]}
              />
            )}
          </View>

          {/* Bouton de Connexion Vert Forêt */}
          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
          >
            <Text style={styles.submitBtnText}>
              {loading ? "Connexion en cours..." : "Se connecter"}
            </Text>
          </Pressable>

          {/* Nouveau commerçant */}
          <View style={styles.registerRow}>
            <Text style={styles.registerPromptText}>Nouveau commerçant ?</Text>
            <Pressable
              onPress={() => {
                setRegError(null);
                setRegSuccess(null);
                setRegStep(1);
                setRegisterOpen(true);
              }}
            >
              <Text style={styles.registerLinkText}>Créer un compte</Text>
            </Pressable>
          </View>
        </View>

        {/* Carte Mode Démo */}
        <View style={styles.demoCard}>
          <View style={styles.demoHeader}>
            <Sparkles size={16} color="#F3BC33" />
            <Text style={styles.demoTitle}>Mode Démonstration</Text>
          </View>
          <Text style={styles.demoDesc}>
            Testez immédiatement la caisse, les stocks et les dettes clients avec des données de
            Conakry sans compte backend.
          </Text>
          <Pressable onPress={handleDemo} style={styles.demoBtn}>
            <Text style={styles.demoBtnText}>Explorer en mode démo →</Text>
          </Pressable>
        </View>

        <Text style={styles.footerText}>
          © {new Date().getFullYear()} LUUMO ERP • République de Guinée
        </Text>
      </ScrollView>

      {/* Modal Réinitialisation Mot de passe (Mobile) */}
      <Modal visible={forgotOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <KeyRound size={18} color="#F3BC33" />
                <Text style={styles.modalTitle}>Réinitialiser mot de passe</Text>
              </View>
              <Pressable onPress={() => setForgotOpen(false)} hitSlop={12}>
                <X size={18} color="#8FAEA1" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              {forgotStep === 1
                ? "Étape 1/2 : Renseignez votre email pour recevoir le code de sécurité."
                : "Étape 2/2 : Saisissez le code à 6 chiffres et votre nouveau mot de passe."}
            </Text>

            {forgotError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{forgotError}</Text>
              </View>
            )}

            {forgotSuccess && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{forgotSuccess}</Text>
              </View>
            )}

            {forgotStep === 1 ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Email commerçant</Text>
                  <TextInput
                    value={forgotLogin}
                    onChangeText={setForgotLogin}
                    autoCapitalize="none"
                    placeholder="contact@entreprise.gn"
                    placeholderTextColor="#526B63"
                    style={styles.input}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Téléphone (+224 ... pour SMS Nimba)</Text>
                  <TextInput
                    value={forgotPhone}
                    onChangeText={setForgotPhone}
                    keyboardType="phone-pad"
                    placeholder="+224 620 00 00 00"
                    placeholderTextColor="#526B63"
                    style={styles.input}
                  />
                </View>

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => setForgotOpen(false)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleForgotRequestOtp}
                    disabled={forgotLoading}
                    style={[styles.saveBtn, forgotLoading && styles.submitBtnDisabled]}
                  >
                    <Text style={styles.saveBtnText}>
                      {forgotLoading ? "Envoi..." : "Envoyer le code →"}
                    </Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Code de vérification (6 chiffres)</Text>
                  <TextInput
                    value={forgotCode}
                    onChangeText={(t) => setForgotCode(t.replace(/\D/g, ""))}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="• • • • • •"
                    placeholderTextColor="#526B63"
                    style={[styles.input, { textAlign: "center", fontSize: 20, letterSpacing: 4, fontWeight: "800" }]}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Nouveau mot de passe</Text>
                  <TextInput
                    value={forgotNewPassword}
                    onChangeText={setForgotNewPassword}
                    secureTextEntry
                    placeholder="Min. 12 car, 1 Maj, 1 Chiffre, 1 Symbole"
                    placeholderTextColor="#526B63"
                    style={styles.input}
                  />
                </View>

                <Pressable
                  disabled={smsCooldown > 0 || forgotLoading}
                  onPress={handleForgotResendSms}
                  style={{ paddingVertical: 6 }}
                >
                  <Text style={{ fontSize: 11, color: smsCooldown > 0 ? "#708F83" : "#F3BC33", fontWeight: "700" }}>
                    {smsCooldown > 0
                      ? `Pas reçu l'email ? SMS Nimba dans ${smsCooldown}s`
                      : "Recevoir le code par SMS Nimba (+224)"}
                  </Text>
                </Pressable>

                <View style={styles.modalActions}>
                  <Pressable
                    onPress={() => setForgotStep(1)}
                    style={styles.cancelBtn}
                  >
                    <Text style={styles.cancelBtnText}>Retour</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleForgotConfirm}
                    disabled={forgotLoading || forgotCode.length !== 6}
                    style={[styles.saveBtn, (forgotLoading || forgotCode.length !== 6) && styles.submitBtnDisabled]}
                  >
                    <Text style={styles.saveBtnText}>
                      {forgotLoading ? "Validation..." : "Valider"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Inscription Entreprise avec OTP (Mobile) */}
      <Modal visible={registerOpen} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { maxHeight: "90%" }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Building2 size={18} color="#F3BC33" />
                <Text style={styles.modalTitle}>Créer une entreprise</Text>
              </View>
              <Pressable onPress={() => setRegisterOpen(false)} hitSlop={12}>
                <X size={18} color="#8FAEA1" />
              </Pressable>
            </View>

            <Text style={styles.modalSubtitle}>
              {regStep === 1
                ? "Étape 1/2 : Renseignez vos coordonnées pour recevoir votre code d'activation."
                : "Étape 2/2 : Saisissez le code à 6 chiffres pour valider et créer votre entreprise."}
            </Text>

            {regError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{regError}</Text>
              </View>
            )}

            {regSuccess && (
              <View style={styles.successBox}>
                <Text style={styles.successText}>{regSuccess}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {regStep === 1 ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nom de l'entreprise / boutique</Text>
                    <TextInput
                      value={regCompanyName}
                      onChangeText={setRegCompanyName}
                      placeholder="Ex: Boutique Kaloum Prestige"
                      placeholderTextColor="#526B63"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nom du gérant / commerçant</Text>
                    <TextInput
                      value={regAdminName}
                      onChangeText={setRegAdminName}
                      placeholder="Ex: Thierno Cissoko"
                      placeholderTextColor="#526B63"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email professionnel (identifiant)</Text>
                    <TextInput
                      value={regLogin}
                      onChangeText={setRegLogin}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      placeholder="contact@boutique.gn"
                      placeholderTextColor="#526B63"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Téléphone (+224 pour SMS de secours)</Text>
                    <TextInput
                      value={regPhone}
                      onChangeText={setRegPhone}
                      keyboardType="phone-pad"
                      placeholder="+224 620 00 00 00"
                      placeholderTextColor="#526B63"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Secteur d'activité</Text>
                    <View style={styles.profileSelector}>
                      {(
                        [
                          { id: "retail", label: "Détail" },
                          { id: "wholesale", label: "Grossiste" },
                          { id: "services", label: "Services" },
                        ] as const
                      ).map((p) => (
                        <Pressable
                          key={p.id}
                          onPress={() => setRegProfile(p.id)}
                          style={[
                            styles.profileOption,
                            regProfile === p.id && styles.profileOptionActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.profileOptionText,
                              regProfile === p.id && styles.profileOptionTextActive,
                            ]}
                          >
                            {p.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Mot de passe (min. 8 caractères)</Text>
                    <TextInput
                      value={regPassword}
                      onChangeText={setRegPassword}
                      secureTextEntry
                      placeholder="••••••••"
                      placeholderTextColor="#526B63"
                      style={styles.input}
                    />
                  </View>

                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={() => setRegisterOpen(false)}
                      style={styles.cancelBtn}
                    >
                      <Text style={styles.cancelBtnText}>Annuler</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleRegisterRequestOtp}
                      disabled={regLoading}
                      style={[styles.saveBtn, regLoading && styles.submitBtnDisabled]}
                    >
                      <Text style={styles.saveBtnText}>
                        {regLoading ? "Envoi..." : "Continuer et recevoir le code →"}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.infoBox}>
                    <Mail size={16} color="#34D399" />
                    <Text style={styles.infoText}>
                      Code envoyé par email à{" "}
                      <Text style={{ fontWeight: "700", color: "#FFFFFF" }}>{regMaskedEmail}</Text>{" "}
                      (Gratuit 0 GNF).
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Code d'activation (6 chiffres)</Text>
                    <TextInput
                      value={regCode}
                      onChangeText={(t) => setRegCode(t.replace(/\D/g, ""))}
                      keyboardType="number-pad"
                      maxLength={6}
                      placeholder="• • • • • •"
                      placeholderTextColor="#526B63"
                      style={[
                        styles.input,
                        { textAlign: "center", fontSize: 24, letterSpacing: 6, fontWeight: "800" },
                      ]}
                    />
                  </View>

                  <Pressable
                    disabled={regSmsCooldown > 0 || regSmsLoading}
                    onPress={handleRegisterResendSms}
                    style={{ paddingVertical: 6 }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        color: regSmsCooldown > 0 ? "#708F83" : "#F3BC33",
                        fontWeight: "700",
                      }}
                    >
                      {regSmsCooldown > 0
                        ? `Pas reçu l'email ? SMS de secours Nimba dans ${regSmsCooldown}s`
                        : "Recevoir le même code par SMS Nimba (+224)"}
                    </Text>
                  </Pressable>

                  <View style={styles.modalActions}>
                    <Pressable
                      onPress={() => setRegStep(1)}
                      style={styles.cancelBtn}
                    >
                      <Text style={styles.cancelBtnText}>Retour</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleRegisterConfirm}
                      disabled={regLoading || regCode.length !== 6}
                      style={[
                        styles.saveBtn,
                        (regLoading || regCode.length !== 6) && styles.submitBtnDisabled,
                      ]}
                    >
                      <Text style={styles.saveBtnText}>
                        {regLoading ? "Activation..." : "Valider et créer mon entreprise"}
                      </Text>
                    </Pressable>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#071913",
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  forgotLink: {
    fontSize: 11,
    color: "#34D399",
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#0B231B",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1E4D3B",
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#8FAEA1",
    lineHeight: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E4D3B",
  },
  cancelBtnText: {
    color: "#8FAEA1",
    fontSize: 12,
    fontWeight: "700",
  },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#0B6E4F",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  successBox: {
    backgroundColor: "#0E3827",
    borderWidth: 1,
    borderColor: "#1E7B54",
    borderRadius: 12,
    padding: 10,
  },
  successText: {
    color: "#7EE7B8",
    fontSize: 12,
    fontWeight: "600",
  },
  container: {
    padding: 20,
    gap: 16,
    paddingTop: 32,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#11382A",
    borderWidth: 1,
    borderColor: "#1E523F",
  },
  secureBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7EE7B8",
  },
  card: {
    backgroundColor: "#0B231B",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1C4D3C",
    gap: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  cardSubtitle: {
    fontSize: 12,
    color: "#8FAEA1",
    lineHeight: 16,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D1E2DB",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#071913",
    borderWidth: 1,
    borderColor: "#1E4D3B",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 11,
    fontSize: 13,
    color: "#FFFFFF",
  },
  serverSection: {
    gap: 8,
  },
  serverToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  serverToggleText: {
    fontSize: 11,
    color: "#708F83",
    fontWeight: "600",
  },
  serverInput: {
    backgroundColor: "#071913",
    borderWidth: 1,
    borderColor: "#1E4D3B",
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  submitBtn: {
    backgroundColor: "#0B6E4F",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  errorBox: {
    backgroundColor: "#3E1116",
    borderWidth: 1,
    borderColor: "#7A232D",
    borderRadius: 12,
    padding: 10,
  },
  errorText: {
    color: "#FFA1A8",
    fontSize: 12,
    fontWeight: "600",
  },
  demoCard: {
    backgroundColor: "#112E23",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1E4D3B",
    gap: 8,
  },
  demoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#F3BC33",
  },
  demoDesc: {
    fontSize: 11,
    color: "#8FAEA1",
    lineHeight: 16,
  },
  demoBtn: {
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  demoBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F3BC33",
  },
  footerText: {
    textAlign: "center",
    fontSize: 11,
    color: "#526B63",
    marginTop: 8,
  },
  registerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 6,
  },
  registerPromptText: {
    fontSize: 12,
    color: "#8FAEA1",
  },
  registerLinkText: {
    fontSize: 12,
    color: "#F3BC33",
    fontWeight: "700",
  },
  profileSelector: {
    flexDirection: "row",
    gap: 8,
  },
  profileOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#071913",
    borderWidth: 1,
    borderColor: "#1E4D3B",
    alignItems: "center",
  },
  profileOptionActive: {
    backgroundColor: "#0B6E4F",
    borderColor: "#34D399",
  },
  profileOptionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8FAEA1",
  },
  profileOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0A2D21",
    borderWidth: 1,
    borderColor: "#195C45",
    borderRadius: 12,
    padding: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: "#A7F3D0",
    lineHeight: 15,
  },
});
