import React, { createContext, useContext, useState } from "react";
import { mobileApi, type MobileSession } from "@/lib/api";

type SessionContextValue = {
  session: MobileSession | null;
  login: (serverUrl: string, user: string, pass: string) => Promise<void>;
  startDemo: () => void;
  logout: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function MobileSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<MobileSession | null>(() =>
    mobileApi.startDemo()
  );

  const login = async (serverUrl: string, user: string, pass: string) => {
    const s = await mobileApi.login(serverUrl, user, pass);
    setSession(s);
  };

  const startDemo = () => {
    const s = mobileApi.startDemo();
    setSession(s);
  };

  const logout = () => {
    mobileApi.logout();
    setSession(null);
  };

  return (
    <SessionContext.Provider value={{ session, login, startDemo, logout }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useMobileSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useMobileSession must be used inside MobileSessionProvider");
  return ctx;
}
