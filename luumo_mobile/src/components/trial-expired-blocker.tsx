import React, { useState } from "react";
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  Lock,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  LogOut,
  ShieldCheck,
  Sparkles,
  PhoneCall,
} from "lucide-react-native";
import { useMobileSession } from "@/context/session";
import { BrandAccentBar, LuumoLogo } from "@/components/ui";
import { formatGNF } from "@/lib/format";
import { colors, radii, spacing, typography } from "@/theme";
import type { BusinessPlanId } from "@/lib/types";

const PLANS = [
  { id: "retail" as BusinessPlanId, name: "Boutique", price: 150000 },
  { id: "services" as BusinessPlanId, name: "Services", price: 250000 },
  { id: "wholesale" as BusinessPlanId, name: "Grossiste", price: 450000 },
];

export function MobileTrialExpiredBlocker() {
  const { session, isTrialExpired, paySubscription, logout } = useMobileSession();

  const [provider, setProvider] = useState<"orange_money" | "mtn_momo">("orange_money");
  const [phone, setPhone] = useState("+224 620 00 00 00");
  const [months, setMonths] = useState<number>(1);
  const [selectedPlanId, setSelectedPlanId] = useState<BusinessPlanId>("retail");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!session || !isTrialExpired) return null;

  const currentPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[0];
  const totalAmount = months === 12 ? currentPlan.price * 10 : currentPlan.price * months;

  const handleDialUSSD = async () => {
    // Code marchand Luumo Guinée
    const merchantCode = "620145";
    const ussdString =
      provider === "orange_money"
        ? `*144*4*1*${merchantCode}*${totalAmount}#`
        : `*440*1*${merchantCode}*${totalAmount}#`;

    const encoded = `tel:${encodeURIComponent(ussdString)}`;
    try {
      const supported = await Linking.canOpenURL(encoded);
      if (supported) {
        await Linking.openURL(encoded);
      } else {
        Alert.alert(
          "Code USSD",
          `Composez manuellement sur votre téléphone :\n${ussdString}`
        );
      }
    } catch {
      Alert.alert(
        "Code USSD",
        `Composez manuellement sur votre téléphone :\n${ussdString}`
      );
    }
  };

  const handleConfirmPayment = async () => {
    setError(null);
    setPaying(true);
    try {
      await paySubscription({
        provider,
        phone: phone.trim(),
        months,
      });
      Alert.alert(
        "Abonnement activé !",
        "Votre paiement Mobile Money a été validé. Votre application est immédiatement débloquée."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Le paiement a échoué. Veuillez vérifier votre solde Mobile Money."
      );
    } finally {
      setPaying(false);
    }
  };

  return (
    <Modal visible={isTrialExpired} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <BrandAccentBar />

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View>
                <LuumoLogo variant="dark-text" height={24} />
                <View style={styles.alertPill}>
                  <Lock size={12} color="#C8102E" />
                  <Text style={styles.alertPillText}>Essai 14 jours terminé</Text>
                </View>
              </View>
              <Pressable onPress={logout} style={styles.logoutBtn}>
                <LogOut size={14} color={colors.inkMuted} />
                <Text style={styles.logoutBtnText}>Quitter</Text>
              </Pressable>
            </View>

            {/* Reassurance */}
            <View style={styles.reassuranceBox}>
              <View style={styles.reassuranceTitleRow}>
                <ShieldCheck size={16} color={colors.primary} />
                <Text style={styles.reassuranceTitle}>Données en sécurité</Text>
              </View>
              <Text style={styles.reassuranceDesc}>
                Vos stocks, ventes et dettes sont intacts. Activez votre forfait par Orange Money pour
                débloquer l&apos;accès.
              </Text>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <AlertCircle size={16} color="#C8102E" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* 1. Forfait */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. FORFAIT MENSUEL</Text>
              <View style={styles.plansRow}>
                {PLANS.map((plan) => {
                  const active = selectedPlanId === plan.id;
                  return (
                    <Pressable
                      key={plan.id}
                      onPress={() => setSelectedPlanId(plan.id)}
                      style={[styles.planCard, active && styles.planCardActive]}
                    >
                      <Text style={[styles.planName, active && styles.planNameActive]}>
                        {plan.name}
                      </Text>
                      <Text style={styles.planPrice}>{formatGNF(plan.price)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 2. Durée */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. DURÉE D&apos;ABONNEMENT</Text>
              <View style={styles.durationRow}>
                {[
                  { value: 1, label: "1 mois" },
                  { value: 3, label: "3 mois" },
                  { value: 12, label: "1 an (-2 mois)" },
                ].map((d) => {
                  const active = months === d.value;
                  return (
                    <Pressable
                      key={d.value}
                      onPress={() => setMonths(d.value)}
                      style={[styles.durationChip, active && styles.durationChipActive]}
                    >
                      <Text
                        style={[styles.durationChipText, active && styles.durationChipTextActive]}
                      >
                        {d.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 3. Opérateur */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. OPÉRATEUR MOBILE MONEY</Text>
              <View style={styles.operatorRow}>
                <Pressable
                  onPress={() => setProvider("orange_money")}
                  style={[
                    styles.operatorBtn,
                    provider === "orange_money" && styles.operatorBtnOrangeActive,
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: "#FF6600" }]} />
                  <Text style={styles.operatorText}>Orange Money</Text>
                </Pressable>

                <Pressable
                  onPress={() => setProvider("mtn_momo")}
                  style={[
                    styles.operatorBtn,
                    provider === "mtn_momo" && styles.operatorBtnMtnActive,
                  ]}
                >
                  <View style={[styles.dot, { backgroundColor: "#FFCC00" }]} />
                  <Text style={styles.operatorText}>MTN MoMo</Text>
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>
                Numéro débité ({provider === "orange_money" ? "Orange" : "MTN"} Guinée) :
              </Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+224 6xx xx xx xx"
                placeholderTextColor={colors.inkMuted}
                style={styles.input}
              />
            </View>

            {/* Total & Action USSD */}
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total à régler :</Text>
              <Text style={styles.totalAmount}>{formatGNF(totalAmount)}</Text>
            </View>

            <Pressable onPress={handleDialUSSD} style={styles.ussdBtn}>
              <PhoneCall size={16} color="#FF6600" />
              <Text style={styles.ussdBtnText}>
                Composer le code USSD ({provider === "orange_money" ? "*144*4*1*...#" : "*440*1*...#"})
              </Text>
            </Pressable>

            <Pressable
              onPress={handleConfirmPayment}
              disabled={paying}
              style={[styles.payBtn, paying && { opacity: 0.6 }]}
            >
              <Sparkles size={16} color="#FFFFFF" />
              <Text style={styles.payBtnText}>
                {paying ? "Validation en cours..." : "Débloquer mon compte Luumo"}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(6, 35, 26, 0.85)",
    justifyContent: "center",
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    overflow: "hidden",
    maxHeight: "92%",
    borderWidth: 1,
    borderColor: colors.border,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  alertPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF0F2",
    borderColor: "#FCDADF",
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    marginTop: spacing.xs,
  },
  alertPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#C8102E",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutBtnText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: "600",
  },
  reassuranceBox: {
    backgroundColor: colors.muted,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reassuranceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  reassuranceTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.ink,
  },
  reassuranceDesc: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF0F2",
    borderRadius: radii.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: "#FCDADF",
  },
  errorText: {
    fontSize: 11,
    color: "#C8102E",
    flex: 1,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: 0.5,
  },
  plansRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  planCard: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  planCardActive: {
    borderColor: colors.primary,
    backgroundColor: "#E8F5EE",
  },
  planName: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
  },
  planNameActive: {
    color: colors.primary,
  },
  planPrice: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: "600",
  },
  durationRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  durationChip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  durationChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  durationChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
  },
  durationChipTextActive: {
    color: "#FFFFFF",
  },
  operatorRow: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  operatorBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  operatorBtnOrangeActive: {
    borderColor: "#FF6600",
    backgroundColor: "#FFF5EE",
  },
  operatorBtnMtnActive: {
    borderColor: "#FFCC00",
    backgroundColor: "#FFFDF0",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 999,
  },
  operatorText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.ink,
  },
  inputLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    fontSize: 12,
    color: colors.ink,
    backgroundColor: colors.card,
  },
  totalBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
  },
  ussdBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "#FF6600",
    backgroundColor: "#FFF5EE",
  },
  ussdBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D35400",
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radii.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  payBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
