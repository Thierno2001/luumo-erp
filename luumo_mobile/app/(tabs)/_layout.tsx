import React from "react";
import { Tabs, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Package,
  LogOut,
} from "lucide-react-native";
import { useMobileSession } from "@/context/session";
import { TricolorBar } from "@/components/ui";
import { colors } from "@/theme";

export default function TabsLayout() {
  const { session, logout } = useMobileSession();
  const router = useRouter();

  const userRole = session?.user?.role ?? (session?.user?.is_admin ? "platform_admin" : "manager");
  const isPlatformAdmin = Boolean(session?.user?.is_admin || userRole === "platform_admin");

  // Privilèges de profil (RBAC mobile) croisés avec le Forfait entreprise actif
  const currentPlan = session?.user?.company?.plan;
  const planApps = currentPlan?.allowed_apps ?? ["pos", "orders", "dashboard", "inventory", "customers"];
  const userRoleApps = session?.user?.allowed_apps;
  const effectiveApps =
    userRoleApps && userRoleApps.length > 0
      ? userRoleApps.filter((a) => planApps.includes(a))
      : planApps;

  const canAccessPos = !isPlatformAdmin && effectiveApps.includes("pos");
  const canAccessCustomers = !isPlatformAdmin && effectiveApps.includes("customers");
  const canAccessStock = !isPlatformAdmin && effectiveApps.includes("inventory");

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontWeight: "800", fontSize: 17 },
        headerRight: () => (
          <View style={styles.headerRight}>
            {session?.mode === "demo" && (
              <View style={styles.demoPill}>
                <Text style={styles.demoPillText}>DÉMO</Text>
              </View>
            )}
            {session?.user?.is_admin && (
              <View style={styles.adminPill}>
                <Text style={styles.adminPillText}>👑 ADMIN</Text>
              </View>
            )}
            {session?.user?.role_name && !session?.user?.is_admin && (
              <View style={styles.rolePill}>
                <Text style={styles.rolePillText}>{session.user.role_name.toUpperCase()}</Text>
              </View>
            )}
            <Pressable
              hitSlop={12}
              onPress={() => {
                logout();
                router.replace("/login");
              }}
              style={styles.logoutBtn}
            >
              <LogOut size={18} color="#A7F3D0" />
            </Pressable>
          </View>
        ),
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Accueil",
          headerTitle: session?.user.company.name ?? "Luumo Guinée",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          href: canAccessPos ? "/(tabs)/pos" : null,
          title: "Caisse",
          headerTitle: "Caisse Comptoir (GNF)",
          tabBarIcon: ({ color, size }) => (
            <ShoppingBag size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="customers"
        options={{
          href: canAccessCustomers ? "/(tabs)/customers" : null,
          title: "Carnet Dettes",
          headerTitle: "Clients & Carnet de Dettes",
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          href: canAccessStock ? "/(tabs)/stock" : null,
          title: "Stock",
          headerTitle: "Inventaire & Articles",
          tabBarIcon: ({ color, size }) => <Package size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 14,
  },
  demoPill: {
    backgroundColor: colors.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  demoPillText: {
    color: colors.ink,
    fontSize: 10,
    fontWeight: "800",
  },
  adminPill: {
    backgroundColor: "#F3BC33",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminPillText: {
    color: "#071913",
    fontSize: 10,
    fontWeight: "800",
  },
  rolePill: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  rolePillText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  logoutBtn: {
    padding: 6,
  },
});
