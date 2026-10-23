"use client";

/**
 * Moteur Hybride B2B & Synchronisation Hors-Ligne (Offline-First) Luumo
 * ====================================================================
 * Permet à la caisse d'encaisser, d'imprimer des reçus et de décrémenter
 * le stock même sans connexion Internet. Dès le retour du réseau, les
 * ventes accumulées sont envoyées en rafale au serveur Cloud de façon idempotente.
 */
import { useEffect, useState } from "react";
import { api } from "./api";
import type { Customer, Order, PaymentMethod, Product } from "./types";

export type OfflineOrder = {
  offline_uuid: string;
  created_at: string;
  partner_id: number | null;
  partner_name: string;
  payment: PaymentMethod;
  lines: {
    product_id: number;
    name: string;
    qty: number;
    price_unit: number;
    subtotal: number;
  }[];
  amount_total: number;
  synced: boolean;
};

const STORAGE_KEYS = {
  PENDING_ORDERS: "luumo.offline.pending_orders",
  CACHED_PRODUCTS: "luumo.offline.cached_products",
  CACHED_CUSTOMERS: "luumo.offline.cached_customers",
};

class OfflineSyncManager {
  private listeners: Set<() => void> = new Set();
  private isSyncing = false;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkChange());
      window.addEventListener("offline", () => this.handleNetworkChange());
    }
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch {
        // Ignorer les erreurs d'abonnés démontés
      }
    });
  }

  public isOnline(): boolean {
    if (typeof window === "undefined") return true;
    return window.navigator.onLine;
  }

  public getPendingOrders(): OfflineOrder[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.PENDING_ORDERS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public getPendingCount(): number {
    return this.getPendingOrders().length;
  }

  public cacheCatalog(products: Product[]) {
    if (typeof window === "undefined" || !products?.length) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.CACHED_PRODUCTS, JSON.stringify(products));
    } catch {
      // Dépassement de quota possible
    }
  }

  public getCachedCatalog(): Product[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.CACHED_PRODUCTS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public cacheCustomers(customers: Customer[]) {
    if (typeof window === "undefined" || !customers?.length) return;
    try {
      window.localStorage.setItem(STORAGE_KEYS.CACHED_CUSTOMERS, JSON.stringify(customers));
    } catch {
      // Quota
    }
  }

  public getCachedCustomers(): Customer[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEYS.CACHED_CUSTOMERS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  /**
   * Enregistre une vente locale hors-ligne et décrémente immédiatement le stock virtuel local.
   */
  public queueOfflineOrder(input: {
    partner_id: number | null;
    partner_name?: string;
    payment: PaymentMethod;
    lines: {
      product_id: number;
      name: string;
      qty: number;
      price_unit: number;
    }[];
  }): OfflineOrder {
    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
    const uuid = `LUUMO-OFFLINE-${dateStamp}-${rand}`;

    const total = input.lines.reduce((sum, l) => sum + l.qty * l.price_unit, 0);

    const offlineOrder: OfflineOrder = {
      offline_uuid: uuid,
      created_at: now.toISOString(),
      partner_id: input.partner_id,
      partner_name: input.partner_name || "Client comptoir",
      payment: input.payment,
      lines: input.lines.map((l) => ({
        ...l,
        subtotal: l.qty * l.price_unit,
      })),
      amount_total: total,
      synced: false,
    };

    const currentOrders = this.getPendingOrders();
    currentOrders.push(offlineOrder);
    try {
      window.localStorage.setItem(STORAGE_KEYS.PENDING_ORDERS, JSON.stringify(currentOrders));
    } catch (e) {
      console.error("Erreur de sauvegarde hors-ligne :", e);
    }

    // Décrémenter le stock local pour que la caissière voie les nouvelles quantités
    try {
      const cachedProds = this.getCachedCatalog();
      if (cachedProds.length) {
        input.lines.forEach((l) => {
          const p = cachedProds.find((prod) => prod.id === l.product_id);
          if (p && typeof p.qty_available === "number") {
            p.qty_available = Math.max(0, p.qty_available - l.qty);
          }
        });
        this.cacheCatalog(cachedProds);
      }
    } catch {
      // Ignorer
    }

    this.notify();
    return offlineOrder;
  }

  /**
   * Envoie toutes les ventes en attente vers le serveur Cloud dès que le réseau est disponible.
   */
  public async syncPendingOrders(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    const pending = this.getPendingOrders();
    if (!pending.length) return { synced: 0, failed: 0 };

    this.isSyncing = true;
    this.notify();

    try {
      const payload = pending.map((ord) => ({
        offline_uuid: ord.offline_uuid,
        reference: ord.offline_uuid,
        partner_id: ord.partner_id,
        payment: ord.payment,
        deliver: true,
        lines: ord.lines.map((l) => ({
          product_id: l.product_id,
          qty: l.qty,
          price_unit: l.price_unit,
        })),
      }));

      const res = await api.batchSyncOrders(payload);
      const syncedUuids = new Set(res.synced.map((s) => s.offline_uuid));

      // Conserver uniquement les commandes qui auraient échoué
      const remaining = pending.filter((ord) => !syncedUuids.has(ord.offline_uuid));
      window.localStorage.setItem(STORAGE_KEYS.PENDING_ORDERS, JSON.stringify(remaining));

      this.notify();
      return { synced: res.synced_count, failed: res.error_count };
    } catch (err) {
      console.warn("Synchronisation réseau différée :", err);
      return { synced: 0, failed: pending.length };
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  private handleNetworkChange() {
    this.notify();
    if (this.isOnline()) {
      // Si le réseau revient, on lance automatiquement la synchronisation
      setTimeout(() => this.syncPendingOrders(), 1500);
    }
  }

  public getSyncState() {
    return {
      isOnline: this.isOnline(),
      pendingCount: this.getPendingCount(),
      isSyncing: this.isSyncing,
    };
  }
}

export const offlineSyncManager = new OfflineSyncManager();

/**
 * Hook React pour afficher l'état du réseau et le compteur de synchronisation
 */
export function useOfflineSync() {
  const [state, setState] = useState(() => offlineSyncManager.getSyncState());

  useEffect(() => {
    setState(offlineSyncManager.getSyncState());
    return offlineSyncManager.subscribe(() => {
      setState(offlineSyncManager.getSyncState());
    });
  }, []);

  const triggerSync = async () => {
    return await offlineSyncManager.syncPendingOrders();
  };

  return {
    ...state,
    triggerSync,
  };
}
