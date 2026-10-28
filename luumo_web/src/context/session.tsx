"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, readSession, writeSession, type Session } from "@/lib/api";
import type { BusinessPlanId, CompanySubscriptionInfo, RegisterCompanyInput } from "@/lib/types";

type SessionContextValue = {
  session: Session | null;
  ready: boolean;
  isTrialExpired: boolean;
  subscription: CompanySubscriptionInfo | null;
  login: (login: string, password: string) => Promise<void>;
  registerCompany: (input: RegisterCompanyInput) => Promise<void>;
  startDemo: () => void;
  logout: () => Promise<void>;
  updateEnabledApps: (apps: string[]) => Promise<void>;
  upgradePlan: (planId: BusinessPlanId) => Promise<void>;
  paySubscription: (input: { provider: string; phone: string; months?: number }) => Promise<void>;
  refreshSubscription: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [forceTrialExpired, setForceTrialExpired] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const existing = readSession();
    setSession(existing);
    setReady(true);
  }, []);

  useEffect(() => {
    const onTrialExpiredEvent = () => {
      setForceTrialExpired(true);
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "luumo_session") {
        const fresh = readSession();
        setSession(fresh);
      }
    };
    const onPlanChanged = () => {
      const fresh = readSession();
      if (fresh) setSession(fresh);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("luumo:trial_expired", onTrialExpiredEvent);
      window.addEventListener("storage", onStorage);
      window.addEventListener("luumo:plan_changed", onPlanChanged);
      return () => {
        window.removeEventListener("luumo:trial_expired", onTrialExpiredEvent);
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("luumo:plan_changed", onPlanChanged);
      };
    }
  }, []);

  const sub = session?.user?.company?.subscription ?? null;
  const isTrialExpired =
    forceTrialExpired ||
    (session?.mode === "live" &&
      sub != null &&
      (sub.status === "expired" ||
        sub.status === "past_due" ||
        (sub.status === "trial" && sub.days_remaining <= 0)));

  useEffect(() => {
    if (!ready) return;
    const isPublicPage =
      pathname === "/" || pathname?.startsWith("/login") || pathname?.startsWith("/register");
    if (!session && !isPublicPage) {
      router.replace("/login");
    } else if (session && (pathname?.startsWith("/login") || pathname?.startsWith("/register"))) {
      if (session.user.is_admin) {
        router.replace("/admin");
      } else {
        router.replace("/");
      }
    }
  }, [ready, session, pathname, router]);

  const login = async (userLogin: string, password: string) => {
    const s = await api.login(userLogin, password);
    setSession(s);
    if (s.user.is_admin) {
      router.replace("/admin");
    } else {
      router.replace("/");
    }
  };

  const registerCompany = async (input: RegisterCompanyInput) => {
    const s = await api.registerCompany(input);
    setSession(s);
    router.replace("/");
  };

  const startDemo = () => {
    const s = api.startDemo();
    setSession(s);
    router.replace("/");
  };

  const logout = async () => {
    await api.logout();
    setSession(null);
    router.replace("/login");
  };

  const updateEnabledApps = async (apps: string[]) => {
    const res = await api.updateCompanyApps(apps);
    if (session) {
      const updated: Session = {
        ...session,
        user: {
          ...session.user,
          company: {
            ...session.user.company,
            plan: res.current_plan,
            enabled_apps: res.enabled_apps,
          },
        },
      };
      writeSession(updated);
      setSession(updated);
    }
  };

  const refreshSession = async () => {
    if (!session) return;
    if (session.mode === "live") {
      try {
        const fresh = await api.me();
        if (fresh?.user) {
          const updated: Session = {
            ...session,
            user: fresh.user,
            currency: fresh.currency ?? session.currency,
          };
          writeSession(updated);
          setSession(updated);
          if (
            fresh.user.company.subscription?.status === "active" ||
            (fresh.user.company.subscription?.status === "trial" &&
              fresh.user.company.subscription.days_remaining > 0)
          ) {
            setForceTrialExpired(false);
          }
        }
      } catch {
        // Silencieux
      }
    } else if (session.mode === "demo") {
      const demoPlan = session.user.company.plan;
      if (demoPlan) {
        const updated: Session = {
          ...session,
          user: {
            ...session.user,
            allowed_apps: [...demoPlan.allowed_apps],
            company: {
              ...session.user.company,
              plan: demoPlan,
              enabled_apps: [...demoPlan.allowed_apps],
            },
          },
        };
        writeSession(updated);
        setSession(updated);
      }
    }
  };

  useEffect(() => {
    if (!ready || !session) return;
    const onFocus = () => {
      refreshSession();
    };
    const onVisibilityChange = () => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        refreshSession();
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus);
      document.addEventListener("visibilitychange", onVisibilityChange);
      const timer = setInterval(refreshSession, 30000);
      return () => {
        window.removeEventListener("focus", onFocus);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        clearInterval(timer);
      };
    }
  }, [ready, session?.user?.id, session?.mode]);

  const upgradePlan = async (planId: BusinessPlanId) => {
    const res = await api.upgradeCompanyPlan(planId);
    if (session) {
      const newPlan = res.current_plan;
      const updatedAllowedApps = newPlan.allowed_apps;

      const updated: Session = {
        ...session,
        user: {
          ...session.user,
          allowed_apps: updatedAllowedApps,
          company: {
            ...session.user.company,
            plan: newPlan,
            enabled_apps: res.enabled_apps,
            subscription: res,
          },
        },
      };
      writeSession(updated);
      setSession(updated);

      if (session.mode === "live") {
        try {
          const fresh = await api.me();
          if (fresh?.user) {
            const finalSession: Session = {
              ...session,
              user: fresh.user,
              currency: fresh.currency ?? session.currency,
            };
            writeSession(finalSession);
            setSession(finalSession);
          }
        } catch {
          // Silencieux
        }
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("luumo:plan_changed", { detail: { planId } }));
      }
    }
  };

  const paySubscription = async (input: { provider: string; phone: string; months?: number }) => {
    const res = await api.payCompanySubscription(input);
    setForceTrialExpired(false);
    if (session) {
      const updated: Session = {
        ...session,
        user: {
          ...session.user,
          company: {
            ...session.user.company,
            plan: res.current_plan,
            enabled_apps: res.enabled_apps,
            subscription: res,
          },
        },
      };
      writeSession(updated);
      setSession(updated);
    }
  };

  const refreshSubscription = async () => {
    await refreshSession();
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        ready,
        isTrialExpired,
        subscription: sub,
        login,
        registerCompany,
        startDemo,
        logout,
        updateEnabledApps,
        upgradePlan,
        paySubscription,
        refreshSubscription,
        refreshSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
}
