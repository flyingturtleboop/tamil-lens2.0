'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

type User = { id: number; email: string; name: string };
type Ctx = {
  user: User | null;
  accessToken: string | null;
  setAccessToken: (t: string | null) => void;
  logout: () => void;
};
const AuthCtx = createContext<Ctx>({
  user: null, accessToken: null, setAccessToken: () => {}, logout: () => {}
});
export const useAuth = () => useContext(AuthCtx);

const API = (process.env.NEXT_PUBLIC_SCAN_API || 'http://localhost:5000').replace(/\/$/, '');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAT] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const setAccessToken = (t: string | null) => {
    setAT(t);
    if (t) localStorage.setItem('access_token', t);
    else localStorage.removeItem('access_token');
  };

  const logout = () => {
    setAccessToken(null);
    setUser(null);
    window.location.href = '/';
  };

  // bootstrap from localStorage & load /me
  useEffect(() => {
    const t = localStorage.getItem('access_token');
    if (!t) return;
    setAT(t);
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : null)
      .then(u => u && setUser(u))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!accessToken) return setUser(null);
    fetch(`${API}/me`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then(r => r.ok ? r.json() : null)
      .then(u => u && setUser(u))
      .catch(() => {});
  }, [accessToken]);

  return (
    <AuthCtx.Provider value={{ user, accessToken, setAccessToken, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
