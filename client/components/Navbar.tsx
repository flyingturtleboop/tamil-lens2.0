'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Role = 'student' | 'teacher' | 'admin' | null;

const API = (process.env.NEXT_PUBLIC_SCAN_API || 'http://localhost:5000').replace(/\/$/, '');

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function useRole(): Role {
  const [role, setRole] = useState<Role>(null);

  useEffect(() => {
    let on = true;
    const atk = getAccessToken();
    fetch(`${API}/api/me`, {
      credentials: 'include',
      headers: atk ? { Authorization: `Bearer ${atk}` } : {},
    })
      .then(async (r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (!on) return;
        setRole((m?.role as Role) ?? null);
      })
      .catch(() => {
        if (on) setRole(null);
      });
    return () => {
      on = false;
    };
  }, []);

  return role;
}

export default function Navbar() {
  const role = useRole();

  return (
    <header className="w-full border-b border-slate-200 bg-white/70 backdrop-blur">
      <nav className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-slate-900">Tamil Lens</Link>

        <div className="flex items-center gap-4 text-sm">
          <Link href="/dashboard" className="hover:text-cyan-700">Dashboard</Link>
          <Link href="/dashboard/scan" className="hover:text-cyan-700">Scan</Link>
          <Link href="/dashboard/words" className="hover:text-cyan-700">Words</Link>
          <Link href="/dashboard/quiz" className="hover:text-cyan-700">Quiz</Link>
          <Link href="/dashboard/flashcards" className="hover:text-cyan-700">Flashcards</Link>

          {(role === 'teacher' || role === 'admin') && (
            <Link
              href="/dashboard/admin"
              className="rounded-lg px-3 py-1.5 bg-cyan-600 text-white hover:bg-cyan-700"
            >
              Admin
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
