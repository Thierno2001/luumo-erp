import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { MobileSessionProvider } from "@/context/session";
import { colors } from "@/theme";

export default function RootLayout() {
  return (
    <MobileSessionProvider>
      <StatusBar style="light" backgroundColor={colors.ink} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
      </Stack>
    </MobileSessionProvider>
  );
}
