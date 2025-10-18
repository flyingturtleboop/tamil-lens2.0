'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiFetch } from '@/lib/api';

export default function Topbar() {
  const router = useRouter();
  const { user, setAccessToken, setUser } = useAuth() as any;

  const handleLogout = async () => {
    try {
      // If you have a logout endpoint that clears refresh cookies – great:
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore network/API failures on logout
    }
    // Clear local state/client tokens
    try { localStorage.removeItem('auth_token'); } catch {}
    setAccessToken?.(null);
    setUser?.(null);

    router.replace('/auth/signin');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6">
      <div className="flex-1">
        <input
          placeholder="Search…"
          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden sm:block text-sm text-slate-600">
          {user?.email || 'User'}
        </span>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 text-white flex items-center justify-center font-semibold">
          {user?.email ? user.email[0]?.toUpperCase() : 'U'}
        </div>
        <button
          onClick={handleLogout}
          className="ml-2 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
