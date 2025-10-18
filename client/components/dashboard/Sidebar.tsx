'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/dashboard/scan', label: 'Scan & Learn', icon: '📸' },
  { href: '/dashboard/quiz', label: 'Quiz', icon: '📝' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { setAccessToken, setUser } = useAuth() as any;

  const logout = async () => {
    try { await apiFetch('/auth/logout', { method: 'POST' }); } catch {}
    try { localStorage.removeItem('auth_token'); } catch {}
    setAccessToken?.(null);
    setUser?.(null);
    router.replace('/auth/signin');
  };

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-slate-900 text-slate-200">
      <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-teal-500 text-white font-bold flex items-center justify-center">Ta</div>
        <div className="leading-tight">
          <div className="font-semibold text-white">Tamil Lens</div>
          <div className="text-xs text-slate-400">Dashboard</div>
        </div>
      </div>

      <nav className="p-3 space-y-1">
        {nav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium',
                active ? 'bg-slate-800 text-white' : 'text-slate-300 hover:bg-slate-800/70 hover:text-white',
              ].join(' ')}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-3">
        <button
          onClick={logout}
          className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 px-3 py-2 text-sm font-semibold"
        >
          Logout
        </button>
        <div className="mt-3 text-xs text-slate-500">
          © {new Date().getFullYear()} Tamil Lens
        </div>
      </div>
    </aside>
  );
}
