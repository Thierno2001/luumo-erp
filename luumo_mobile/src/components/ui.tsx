import React from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, radii } from "@/theme";

/**
 * Filet d'accent Luumo inspiré du logo (Vert Pin #115040 -> Or #F3BC33 -> Ambre #E8A02B).
 */
export function BrandAccentBar() {
  return (
    <View style={styles.brandBar}>
      <View style={{ flex: 5, backgroundColor: colors.primary }} />
      <View style={{ flex: 3, backgroundColor: colors.gold }} />
      <View style={{ flex: 2, backgroundColor: colors.amber }} />
    </View>
  );
}

/** Alias de compatibilité */
export const TricolorBar = BrandAccentBar;

export function LuumoLogo({
  variant = "dark-text",
  height = 34,
}: {
  variant?: "dark-text" | "light-text";
  height?: number;
}) {
  const source =
    variant === "light-text"
      ? require("../../assets/luumo-logo-white.png")
      : require("../../assets/luumo-logo.png");
  const width = Math.round(height * (807 / 211));
  return (
    <Image
      source={source}
      style={{ width, height }}
      resizeMode="contain"
      accessibilityLabel="Logo LUUMO"
    />
  );
}

export function Badge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "neutral";
}) {
  const bg =
    tone === "success"
      ? colors.primarySoft
      : tone === "warning"
        ? colors.goldSoft
        : tone === "danger"
          ? colors.dangerSoft
          : colors.muted;
  const fg =
    tone === "success"
      ? colors.primary
      : tone === "warning"
        ? colors.goldText
        : tone === "danger"
          ? colors.danger
          : colors.textMuted;
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  tone = "primary",
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  tone?: "primary" | "gold" | "danger";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg =
    tone === "gold"
      ? colors.gold
      : tone === "danger"
        ? colors.danger
        : colors.primary;
  const fg = tone === "gold" ? colors.text : "#FFFFFF";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: "rgba(17, 80, 64, 0.16)" }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.9 : 1 },
        style,
      ]}
    >
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brandBar: {
    flexDirection: "row",
    height: 3,
    width: "100%",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    alignSelf: "flex-start",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  button: {
    minHeight: 50,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
