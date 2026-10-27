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
    if (typeof window !== "undefined") {
      window.addEventListener("luumo:trial_expired", onTrialExpiredEvent);
      return () => {
        window.removeEventListener("luumo:trial_expired", onTrialExpiredEvent);
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
      router.replace("/");
    }
  }, [ready, session, pathname, router]);

  const login = async (userLogin: string, password: string) => {
    const s = await api.login(userLogin, password);
    setSession(s);
    router.replace("/");
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

  const upgradePlan = async (planId: BusinessPlanId) => {
    const res = await api.upgradeCompanyPlan(planId);
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
    if (session?.mode === "live") {
      try {
        const subInfo = await api.getCompanySubscription();
        if (
          subInfo.status === "active" ||
          (subInfo.status === "trial" && subInfo.days_remaining > 0)
        ) {
          setForceTrialExpired(false);
        }
        const updated: Session = {
          ...session,
          user: {
            ...session.user,
            company: {
              ...session.user.company,
              plan: subInfo.current_plan,
              enabled_apps: subInfo.enabled_apps,
              subscription: subInfo,
            },
          },
        };
        writeSession(updated);
        setSession(updated);
      } catch {
        // Silencieux
      }
    }
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
