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
          title: "Carnet Dettes",
          headerTitle: "Clients & Carnet de Dettes",
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
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
  logoutBtn: {
    padding: 6,
  },
});
