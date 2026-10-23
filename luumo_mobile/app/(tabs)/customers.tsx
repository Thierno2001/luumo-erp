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
import { UserPlus } from "lucide-react-native";
import { mobileApi } from "@/lib/api";
import { formatGNF } from "@/lib/format";
import { Badge, PrimaryButton, TricolorBar } from "@/components/ui";
import { colors, radii } from "@/theme";
import type { Customer, PaymentMethod } from "@/lib/types";

export default function MobileCustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [debtorsOnly, setDebtorsOnly] = useState(false);

  // Modal remboursement
  const [selected, setSelected] = useState<Customer | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] =
    useState<Exclude<PaymentMethod, "credit">>("cash");

  // Modal création
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+224 ");

  const load = useCallback(async () => {
    const res = await mobileApi.customers(search, debtorsOnly);
    setCustomers(res);
  }, [search, debtorsOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRepay = async () => {
    if (!selected) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return;
    await mobileApi.customerPayment(selected.id, amt, payMethod);
    setSelected(null);
    await load();
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    await mobileApi.createCustomer({ name: name.trim(), phone: phone.trim() });
    setShowCreate(false);
    setName("");
    setPhone("+224 ");
    await load();
  };

  return (
    <View style={styles.root}>
      <TricolorBar />

      <View style={styles.topBar}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher nom ou +224..."
          style={styles.searchInput}
        />
        <Pressable
          onPress={() => setDebtorsOnly((v) => !v)}
          style={[
            styles.filterBtn,
            debtorsOnly && {
              backgroundColor: colors.dangerSoft,
              borderColor: colors.danger,
            },
          ]}
        >
          <Text
            style={[
              styles.filterText,
              debtorsOnly && { color: colors.danger },
            ]}
          >
            Dettes
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setShowCreate(true)}
          style={styles.addBtn}
        >
          <UserPlus size={18} color="#FFFFFF" />
        </Pressable>
      </View>

      <FlatList
        data={customers}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => {
              setSelected(item);
              setPayAmount(item.credit > 0 ? String(item.credit) : "");
            }}
            android_ripple={{ color: "rgba(11,110,79,0.1)" }}
            style={styles.row}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>
                {item.phone || "Sans tél."} • {item.city || "Conakry"}
              </Text>
            </View>
            {item.credit > 0 ? (
              <Badge label={`Dette : ${formatGNF(item.credit)}`} tone="danger" />
            ) : (
              <Badge label="À jour" tone="success" />
            )}
          </Pressable>
        )}
      />

      {/* Modal Encaissement Dette */}
      <Modal visible={Boolean(selected)} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selected?.name}</Text>
            <Text style={styles.debtText}>
              Dette actuelle : {formatGNF(selected?.credit ?? 0)}
            </Text>

            <Text style={styles.label}>Montant remboursé (GNF)</Text>
            <TextInput
              value={payAmount}
              onChangeText={setPayAmount}
              keyboardType="numeric"
              style={styles.input}
            />

            <View style={styles.methodRow}>
              {(
                [
                  { id: "cash", label: "Espèces" },
                  { id: "mobile_money", label: "Orange/MTN" },
                ] as const
              ).map((m) => (
                <Pressable
                  key={m.id}
                  onPress={() => setPayMethod(m.id)}
                  style={[
                    styles.methodBtn,
                    payMethod === m.id && {
                      backgroundColor: colors.primarySoft,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text style={styles.methodText}>{m.label}</Text>
                </Pressable>
              ))}
            </View>

            <PrimaryButton
              tone="gold"
              label="Encaisser le remboursement"
              onPress={handleRepay}
            />
            <PrimaryButton
              label="Fermer"
              onPress={() => setSelected(null)}
              style={{ backgroundColor: colors.muted }}
            />
          </View>
        </View>
      </Modal>

      {/* Modal Nouveau Client */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Nouveau Client</Text>
            <Text style={styles.label}>Nom complet / Boutique</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="ex: Mamadou Bah"
              style={styles.input}
            />
            <Text style={styles.label}>Téléphone (+224)</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
            />
            <PrimaryButton label="Enregistrer" onPress={handleCreate} />
            <PrimaryButton
              label="Annuler"
              onPress={() => setShowCreate(false)}
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
  filterBtn: {
    paddingHorizontal: 12,
    justifyContent: "center",
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterText: { fontSize: 12, fontWeight: "700", color: colors.text },
  addBtn: {
    width: 44,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
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
  name: { fontSize: 14, fontWeight: "800", color: colors.text },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
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
  debtText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.danger,
    fontVariant: ["tabular-nums"],
  },
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
    fontSize: 15,
    fontWeight: "700",
  },
  methodRow: { flexDirection: "row", gap: 8 },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  methodText: { fontSize: 13, fontWeight: "700", color: colors.text },
});
