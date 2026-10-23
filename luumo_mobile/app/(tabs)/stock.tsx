import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { mobileApi } from "@/lib/api";
import { formatGNF } from "@/lib/format";
import { Badge, PrimaryButton, TricolorBar } from "@/components/ui";
import { colors, radii } from "@/theme";
import type { Product } from "@/lib/types";

export default function MobileStockScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Product | null>(null);
  const [qtyInput, setQtyInput] = useState("");

  const load = useCallback(async () => {
    const res = await mobileApi.products(search);
    setProducts(res);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveStock = async () => {
    if (!selected) return;
    await mobileApi.setStock(selected.id, Number(qtyInput) || 0);
    setSelected(null);
    await load();
  };

  return (
    <View style={styles.root}>
      <TricolorBar />

      <View style={styles.topBar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un article ou code-barres..."
          style={styles.searchInput}
        />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const qty = item.qty_available ?? 0;
          return (
            <Pressable
              onPress={() => {
                setSelected(item);
                setQtyInput(String(qty));
              }}
              android_ripple={{ color: "rgba(11,110,79,0.1)" }}
              style={styles.row}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>
                  {formatGNF(item.list_price)} / {item.uom} • {item.default_code}
                </Text>
              </View>
              <Badge
                label={`${qty} ${item.uom}`}
                tone={qty <= 0 ? "danger" : qty < 5 ? "warning" : "success"}
              />
            </Pressable>
          );
        }}
      />

      <Modal visible={Boolean(selected)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ajuster le stock physique</Text>
            <Text style={styles.sub}>{selected?.name}</Text>
            <Text style={styles.label}>
              Nouvelle quantité ({selected?.uom})
            </Text>
            <TextInput
              value={qtyInput}
              onChangeText={setQtyInput}
              keyboardType="numeric"
              style={styles.input}
            />
            <PrimaryButton
              tone="gold"
              label="Mettre à jour l'inventaire"
              onPress={handleSaveStock}
            />
            <PrimaryButton
              label="Annuler"
              onPress={() => setSelected(null)}
              style={{ backgroundColor: colors.muted }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    padding: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
  },
  listContent: { padding: 12, gap: 10 },
  row: {
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
  name: { fontSize: 14, fontWeight: "700", color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 3 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(6,35,26,0.65)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: 20,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  label: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
    fontWeight: "800",
  },
});
