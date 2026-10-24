"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api, readSession, writeSession, type Session } from "@/lib/api";
import type { RegisterCompanyInput } from "@/lib/types";

type SessionContextValue = {
  session: Session | null;
  ready: boolean;
  login: (login: string, password: string) => Promise<void>;
  registerCompany: (input: RegisterCompanyInput) => Promise<void>;
  startDemo: () => void;
  logout: () => Promise<void>;
  updateEnabledApps: (apps: string[]) => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const existing = readSession();
    setSession(existing);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const onAuthPage =
      pathname?.startsWith("/login") || pathname?.startsWith("/register");
    if (!session && !onAuthPage) {
      router.replace("/login");
    } else if (session && onAuthPage) {
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
            enabled_apps: res.enabled_apps,
          },
        },
      };
      writeSession(updated);
      setSession(updated);
    }
  };

  return (
    <SessionContext.Provider
      value={{
        session,
        ready,
        login,
        registerCompany,
        startDemo,
        logout,
        updateEnabledApps,
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
