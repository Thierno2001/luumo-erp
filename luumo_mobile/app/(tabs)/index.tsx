import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useMobileSession } from "@/context/session";
import { mobileApi } from "@/lib/api";
import { formatCompact, formatGNF } from "@/lib/format";
import { Badge, PrimaryButton, TricolorBar } from "@/components/ui";
import { colors, radii } from "@/theme";
import type { Dashboard } from "@/lib/types";

export default function HomeScreen() {
  const { session } = useMobileSession();
  const [data, setData] = useState<Dashboard | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const userRole = session?.user?.role ?? (session?.user?.is_admin ? "platform_admin" : "manager");
  const isPlatformAdmin = Boolean(session?.user?.is_admin || userRole === "platform_admin");
  const canAccessPos = !isPlatformAdmin && (userRole === "manager" || userRole === "cashier");

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await mobileApi.dashboard();
      setData(res);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxBar = Math.max(1, ...(data?.sales_7d.map((d) => d.total) ?? [1]));

  return (
    <View style={styles.root}>
      <TricolorBar />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
      >
        {isPlatformAdmin ? (
          <View style={styles.adminHeroCard}>
            <View style={styles.adminHeroBadge}>
              <Text style={styles.adminHeroBadgeText}>👑 SUPER-ADMIN PLATEFORME</Text>
            </View>
            <Text style={styles.adminHeroTitle}>Tour de Contrôle SaaS</Text>
            <Text style={styles.adminHeroDesc}>
              Votre compte administrateur racine supervise l&apos;ensemble des commerces et abonnements Luumo en Guinée. La gestion des abonnements, validation Orange Money et attribution des rôles se fait sur le Backoffice Web.
            </Text>
            <View style={styles.adminNoticeBox}>
              <Text style={styles.adminNoticeText}>
                Accédez au portail complet sur votre navigateur :
              </Text>
              <Text style={styles.adminNoticeUrl}>http://localhost:3000/admin</Text>
            </View>
          </View>
        ) : (
          /* Hero Card Ventes du jour pour les commerçants */
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>VENTES DU JOUR</Text>
            <Text style={styles.heroAmount}>
              {data ? formatGNF(data.kpis.sales_today) : "—"}
            </Text>
            <Text style={styles.heroSub}>
              {data?.kpis.orders_today ?? 0} vente(s) confirmée(s) • Mois :{" "}
              {data ? formatGNF(data.kpis.sales_month) : "—"}
            </Text>
            {canAccessPos && (
              <PrimaryButton
                tone="gold"
                label="+ Nouvelle vente au comptoir"
                onPress={() => router.push("/(tabs)/pos")}
                style={{ marginTop: 14 }}
              />
            )}
          </View>
        )}

        {/* 2 KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={[styles.kpiCard, { borderLeftColor: colors.danger }]}>
            <Text style={styles.kpiLabel}>CARNET DE DETTES</Text>
            <Text style={[styles.kpiValue, { color: colors.danger }]}>
              {data ? formatGNF(data.kpis.receivables) : "—"}
            </Text>
            <Text style={styles.kpiSub}>
              {data?.kpis.debtors ?? 0} client(s) débiteur(s)
            </Text>
          </View>

          <View style={[styles.kpiCard, { borderLeftColor: colors.gold }]}>
            <Text style={styles.kpiLabel}>STOCK BAS (&lt; 5)</Text>
            <Text style={styles.kpiValue}>
              {data?.kpis.low_stock_count ?? 0} art.
            </Text>
            <Text style={styles.kpiSub}>À réapprovisionner</Text>
          </View>
        </View>

        {/* Mini graphe 7 jours */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ventes sur 7 jours</Text>
          <View style={styles.chartRow}>
            {(data?.sales_7d ?? []).map((d, idx, arr) => {
              const h = Math.max(8, Math.round((d.total / maxBar) * 90));
              const isToday = idx === arr.length - 1;
              return (
                <View key={d.date} style={styles.barCol}>
                  <Text style={styles.barValue}>
                    {d.total > 0 ? formatCompact(d.total) : "0"}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: h,
                          backgroundColor: isToday ? colors.gold : colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.barDay,
                      isToday && { fontWeight: "800", color: colors.text },
                    ]}
                  >
                    {d.date.slice(-4)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Principaux débiteurs */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Principaux débiteurs (Crédit)</Text>
          {(data?.top_debtors ?? []).map((c) => (
            <View key={c.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{c.name}</Text>
                <Text style={styles.rowSub}>{c.phone || c.city}</Text>
              </View>
              <Badge label={formatGNF(c.credit)} tone="danger" />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 14, gap: 14 },
  heroCard: {
    backgroundColor: colors.ink,
    borderRadius: radii.lg,
    padding: 18,
  },
  heroLabel: {
    color: "#A7F3D0",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroAmount: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  heroSub: { color: "#A7F3D0", fontSize: 12, marginTop: 4 },
  kpiRow: { flexDirection: "row", gap: 10 },
  kpiCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.text,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  kpiSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  adminBanner: {
    backgroundColor: "#071913",
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(243, 188, 51, 0.4)",
  },
  adminBannerTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#F3BC33",
    marginBottom: 4,
  },
  adminBannerSub: {
    fontSize: 11,
    color: "#A7F3D0",
    lineHeight: 16,
  },
  adminHeroCard: {
    backgroundColor: "#071913",
    borderRadius: radii.lg,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "rgba(243, 188, 51, 0.5)",
    gap: 8,
  },
  adminHeroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F3BC33",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adminHeroBadgeText: {
    color: "#071913",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  adminHeroTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
  },
  adminHeroDesc: {
    fontSize: 12,
    color: "#D1E2DB",
    lineHeight: 18,
  },
  adminNoticeBox: {
    backgroundColor: "#0B231B",
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1E4D3B",
    marginTop: 6,
    gap: 4,
  },
  adminNoticeText: {
    fontSize: 11,
    color: "#8FAEA1",
  },
  adminNoticeUrl: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F3BC33",
    fontFamily: "monospace",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.text,
    marginBottom: 12,
  },
  chartRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 130,
  },
  barCol: { alignItems: "center", flex: 1 },
  barValue: { fontSize: 9, color: colors.textMuted, marginBottom: 4 },
  barTrack: {
    width: 24,
    height: 92,
    backgroundColor: colors.muted,
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: { width: "100%", borderRadius: 6 },
  barDay: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowTitle: { fontSize: 13, fontWeight: "700", color: colors.text },
  rowSub: { fontSize: 11, color: colors.textMuted },
});
