import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Camera, Minus, Plus, Trash2 } from "lucide-react-native";
import { mobileApi } from "@/lib/api";
import { formatGNF } from "@/lib/format";
import { Badge, PrimaryButton, TricolorBar } from "@/components/ui";
import { colors, radii } from "@/theme";
import type { Customer, Order, PaymentMethod, Product } from "@/lib/types";

type CartItem = { product: Product; qty: number };

export default function MobilePosScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [partnerId, setPartnerId] = useState<number | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Order | null>(null);

  // Scanner code-barres
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const load = useCallback(async () => {
    const [p, c] = await Promise.all([
      mobileApi.products(""),
      mobileApi.customers(""),
    ]);
    setProducts(p);
    setCustomers(c);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q) ||
        p.default_code.toLowerCase().includes(q)
    );
  }, [products, search]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx]!, qty: copy[idx]!.qty + 1 };
        return copy;
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const changeQty = (productId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId ? { ...i, qty: i.qty + delta } : i
        )
        .filter((i) => i.qty > 0)
    );
  };

  const total = useMemo(
    () => cart.reduce((s, i) => s + i.qty * i.product.list_price, 0),
    [cart]
  );

  const openScanner = async () => {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setScannerOpen(true);
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    setScannerOpen(false);
    const match = products.find((p) => p.barcode === data);
    if (match) {
      addToCart(match);
    } else {
      setSearch(data);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (payment === "credit" && !partnerId) {
      setError("Sélectionnez un client pour vendre à crédit.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const order = await mobileApi.createOrder({
        partner_id: partnerId,
        payment,
        deliver: true,
        lines: cart.map((i) => ({
          product_id: i.product.id,
          qty: i.qty,
          price_unit: i.product.list_price,
        })),
      });
      setReceipt(order);
      setCart([]);
      setPartnerId(null);
      setPayment("cash");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur validation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <TricolorBar />

      {/* Recherche + bouton Caméra Code-barres */}
      <View style={styles.searchBar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Article ou code-barres..."
          style={styles.searchInput}
        />
        <Pressable
          onPress={openScanner}
          android_ripple={{ color: "rgba(255,255,255,0.2)" }}
          style={styles.scanBtn}
        >
          <Camera size={20} color={colors.gold} />
          <Text style={styles.scanBtnText}>Scanner</Text>
        </Pressable>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Liste des articles en FlatList */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const inCart = cart.find((c) => c.product.id === item.id);
          return (
            <Pressable
              onPress={() => addToCart(item)}
              android_ripple={{ color: "rgba(11, 110, 79, 0.12)" }}
              style={[
                styles.productRow,
                inCart && { borderColor: colors.primary, borderWidth: 2 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.prodName}>{item.name}</Text>
                <Text style={styles.prodPrice}>
                  {formatGNF(item.list_price)} / {item.uom}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                <Badge
                  label={`${item.qty_available ?? 0} en stock`}
                  tone={
                    (item.qty_available ?? 0) <= 0
                      ? "danger"
                      : (item.qty_available ?? 0) < 5
                        ? "warning"
                        : "success"
                  }
                />
                {inCart && (
                  <View style={styles.stepper}>
                    <Pressable
                      hitSlop={10}
                      onPress={() => changeQty(item.id, -1)}
                      style={styles.stepBtn}
                    >
                      <Minus size={14} color={colors.text} />
                    </Pressable>
                    <Text style={styles.stepQty}>{inCart.qty}</Text>
                    <Pressable
                      hitSlop={10}
                      onPress={() => changeQty(item.id, 1)}
                      style={styles.stepBtn}
                    >
                      <Plus size={14} color={colors.text} />
                    </Pressable>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
      />

      {/* Panneau d'encaissement en bas */}
      {cart.length > 0 && (
        <View style={styles.checkoutSheet}>
          {/* Sélecteur rapide client */}
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={[{ id: 0, name: "Client comptoir" }, ...customers]}
            keyExtractor={(item) => String(item.id)}
            style={{ marginBottom: 8 }}
            renderItem={({ item }) => {
              const selected = (partnerId ?? 0) === item.id;
              return (
                <Pressable
                  onPress={() => setPartnerId(item.id === 0 ? null : item.id)}
                  style={[
                    styles.chip,
                    selected && { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      selected && { color: "#FFFFFF" },
                    ]}
                  >
                    {item.name}
                  </Text>
                </Pressable>
              );
            }}
          />

          {/* Mode de paiement */}
          <View style={styles.payModes}>
            {(
              [
                { id: "cash", label: "Espèces" },
                { id: "mobile_money", label: "Orange/MTN" },
                { id: "credit", label: "À Crédit" },
              ] as const
            ).map((m) => {
              const active = payment === m.id;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => setPayment(m.id)}
                  style={[
                    styles.payModeBtn,
                    active && {
                      backgroundColor:
                        m.id === "credit" ? colors.dangerSoft : colors.primarySoft,
                      borderColor:
                        m.id === "credit" ? colors.danger : colors.primary,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.payModeText,
                      active && {
                        color:
                          m.id === "credit"
                            ? colors.danger
                            : colors.primaryStrong,
                      },
                    ]}
                  >
                    {m.label}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              hitSlop={10}
              onPress={() => setCart([])}
              style={styles.clearBtn}
            >
              <Trash2 size={18} color={colors.danger} />
            </Pressable>
          </View>

          <PrimaryButton
            tone="gold"
            disabled={submitting}
            label={
              submitting
                ? "Validation..."
                : `Encaisser ${formatGNF(total)} (${cart.reduce(
                    (s, i) => s + i.qty,
                    0
                  )})`
            }
            onPress={handleCheckout}
          />
        </View>
      )}

      {/* Modal Scanner Code-barres */}
      <Modal visible={scannerOpen} animationType="slide">
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView
            style={{ flex: 1 }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={{ padding: 20, backgroundColor: colors.ink }}>
            <PrimaryButton
              tone="gold"
              label="Fermer la caméra"
              onPress={() => setScannerOpen(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Reçu */}
      <Modal visible={Boolean(receipt)} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Vente {receipt?.name} confirmée !
            </Text>
            <Text style={styles.modalSub}>
              Client : {receipt?.partner.name}
            </Text>
            <Text style={styles.modalTotal}>
              {formatGNF(receipt?.amount_total ?? 0)}
            </Text>
            <PrimaryButton
              label="Nouvelle vente"
              onPress={() => setReceipt(null)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  searchBar: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
  },
  scanBtn: {
    backgroundColor: colors.ink,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  scanBtnText: { color: colors.gold, fontWeight: "700", fontSize: 13 },
  errorBanner: {
    backgroundColor: colors.dangerSoft,
    padding: 10,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: radii.sm,
  },
  errorText: { color: colors.danger, fontSize: 12, fontWeight: "700" },
  listContent: { padding: 12, gap: 10, paddingBottom: 210 },
  productRow: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  prodName: { fontSize: 14, fontWeight: "700", color: colors.text },
  prodPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.muted,
    borderRadius: radii.sm,
    padding: 4,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  stepQty: {
    fontSize: 13,
    fontWeight: "800",
    minWidth: 20,
    textAlign: "center",
  },
  checkoutSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 2,
    borderTopColor: colors.ink,
    padding: 12,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.muted,
    marginRight: 6,
  },
  chipText: { fontSize: 12, fontWeight: "700", color: colors.text },
  payModes: { flexDirection: "row", alignItems: "center", gap: 6 },
  payModeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  payModeText: { fontSize: 12, fontWeight: "700", color: colors.text },
  clearBtn: { padding: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(6,35,26,0.65)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: 22,
    gap: 12,
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  modalSub: { fontSize: 13, color: colors.textMuted },
  modalTotal: {
    fontSize: 26,
    fontWeight: "800",
    color: colors.primary,
    fontVariant: ["tabular-nums"],
  },
});
