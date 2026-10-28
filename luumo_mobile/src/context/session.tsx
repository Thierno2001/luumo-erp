import React, { createContext, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import { mobileApi, setOnTrialExpired, type MobileSession } from "@/lib/api";
import type { BusinessPlanId, CompanySubscriptionInfo } from "@/lib/types";

type SessionContextValue = {
  session: MobileSession | null;
  isTrialExpired: boolean;
  subscription: CompanySubscriptionInfo | null;
  login: (serverUrl: string, user: string, pass: string) => Promise<void>;
  register: (
    serverUrl: string,
    input: {
      company_name: string;
      admin_name: string;
      login: string;
      phone: string;
      city?: string;
      password: string;
      business_profile?: string;
      code: string;
    }
  ) => Promise<void>;
  startDemo: () => void;
  logout: () => void;
  upgradePlan: (planId: BusinessPlanId) => Promise<void>;
  paySubscription: (input: { provider: string; phone: string; months?: number }) => Promise<void>;
  refreshSession: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function MobileSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<MobileSession | null>(() =>
    mobileApi.startDemo()
  );
  const [forceTrialExpired, setForceTrialExpired] = useState(false);

  useEffect(() => {
    setOnTrialExpired(() => {
      setForceTrialExpired(true);
    });
    return () => {
      setOnTrialExpired(null);
    };
  }, []);

  const refreshSession = async () => {
    if (!session) return;
    if (session.mode === "live") {
      try {
        const fresh = await mobileApi.me();
        if (fresh?.user) {
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  user: fresh.user,
                  currency: fresh.currency ?? prev.currency,
                }
              : prev
          );
        }
      } catch {
        // Silencieux si réseau instable
      }
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        refreshSession();
      }
    });
    const interval = setInterval(() => {
      refreshSession();
    }, 30000);
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [session?.mode]);

  const sub = session?.user?.company?.subscription ?? null;
  const isTrialExpired =
    forceTrialExpired ||
    (session?.mode === "live" &&
      sub != null &&
      (sub.status === "expired" ||
        sub.status === "past_due" ||
        (sub.status === "trial" && sub.days_remaining <= 0)));

  const login = async (serverUrl: string, user: string, pass: string) => {
    const s = await mobileApi.login(serverUrl, user, pass);
    setForceTrialExpired(false);
    setSession(s);
  };

  const register = async (
    serverUrl: string,
    input: {
      company_name: string;
      admin_name: string;
      login: string;
      phone: string;
      city?: string;
      password: string;
      business_profile?: string;
      code: string;
    }
  ) => {
    const s = await mobileApi.registerCompany(serverUrl, input);
    setForceTrialExpired(false);
    setSession(s);
  };

  const startDemo = () => {
    const s = mobileApi.startDemo();
    setForceTrialExpired(false);
    setSession(s);
  };

  const logout = () => {
    mobileApi.logout();
    setForceTrialExpired(false);
    setSession(null);
  };

  const upgradePlan = async (planId: BusinessPlanId) => {
    const res = await mobileApi.upgradePlan(planId);
    setForceTrialExpired(false);
    if (session) {
      const updated: MobileSession = {
        ...session,
        user: {
          ...session.user,
          allowed_apps: res.current_plan.allowed_apps,
          company: {
            ...session.user.company,
            plan: res.current_plan,
            enabled_apps: res.enabled_apps,
            subscription: res,
          },
        },
      };
      setSession(updated);
    }
    await refreshSession();
  };

  const paySubscription = async (input: { provider: string; phone: string; months?: number }) => {
    const res = await mobileApi.paySubscription(input);
    setForceTrialExpired(false);
    if (session) {
      const updated: MobileSession = {
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
      setSession(updated);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        isTrialExpired,
        subscription: sub,
        login,
        register,
        startDemo,
        logout,
        upgradePlan,
        paySubscription,
        refreshSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useMobileSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useMobileSession must be used inside MobileSessionProvider");
  return ctx;
}
