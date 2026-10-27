import React, { createContext, useContext, useEffect, useState } from "react";
import { mobileApi, setOnTrialExpired, type MobileSession } from "@/lib/api";
import type { CompanySubscriptionInfo } from "@/lib/types";

type SessionContextValue = {
  session: MobileSession | null;
  isTrialExpired: boolean;
  subscription: CompanySubscriptionInfo | null;
  login: (serverUrl: string, user: string, pass: string) => Promise<void>;
  startDemo: () => void;
  logout: () => void;
  paySubscription: (input: { provider: string; phone: string; months?: number }) => Promise<void>;
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
        startDemo,
        logout,
        paySubscription,
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
