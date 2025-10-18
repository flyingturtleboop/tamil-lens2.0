"use client";
import React, { createContext, useContext, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api";

interface AuthContextType {
  accessToken: string | null;
  setAccessToken: (t: string | null) => void;
  refresh: () => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await apiFetch("/auth/refresh", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setAccessToken(data.access_token);
      return data.access_token as string;
    }
    setAccessToken(null);
    return null;
  }, []);

  const logout = useCallback(async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    setAccessToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{ accessToken, setAccessToken, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
