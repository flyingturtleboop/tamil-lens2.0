'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Camera, BookOpen, Brain, Menu, LogOut, Search, ChevronLeft, ChevronRight, Flame, Settings } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Protected from '@/components/Protected';

const API = (process.env.NEXT_PUBLIC_SCAN_API || 'http://localhost:5000').replace(/\/$/, '');

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: <Home className="w-5 h-5" />, exact: true },
  { href: '/dashboard/scan', label: 'Scan & Learn', icon: <Camera className="w-5 h-5" />, exact: false },
  { href: '/dashboard/flashcards', label: 'Flashcards', icon: <BookOpen className="w-5 h-5" />, exact: false },
  { href: '/dashboard/words', label: 'My Word List', icon: <BookOpen className="w-5 h-5" />, exact: false },
  { href: '/dashboard/quiz', label: 'Quiz', icon: <Brain className="w-5 h-5" />, exact: false },
  { href: '/dashboard/settings', label: 'Settings', icon: <Settings className="w-5 h-5" />, exact: false },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, setAccessToken, setUser } = useAuth() as any;

  const displayName = useMemo(() => {
    if (user?.name && user.name.trim()) return user.name.trim();
    if (typeof window !== 'undefined') {
      const ls = localStorage.getItem('user_name');
      if (ls && ls.trim()) return ls.trim();
    }
    if (user?.email) {
      const base = user.email.split('@')[0] || 'Learner';
      return base.charAt(0).toUpperCase() + base.slice(1);
    }
    return 'Learner';
  }, [user?.name, user?.email]);

  const initials = useMemo(() => (displayName?.[0] || 'L').toUpperCase(), [displayName]);

  // Fetch user stats
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const userRes = await fetch(`${API}/auth/me`, {
          method: 'GET',
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (userRes.ok) {
          const data = await userRes.json();
          if (!cancelled && data?.user) {
            setUser?.(data.user);
            if (data.user.name) {
              localStorage.setItem('user_name', data.user.name);
            }
          }
        }

        const statsRes = await fetch(`${API}/api/stats`, {
          method: 'GET',
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
        });

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (!cancelled) setStats(statsData);
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [setUser]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (token) {
        await fetch(`${API}/auth/logout`, {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
    try { 
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_name');
    } catch {}
    setAccessToken?.(null);
    setUser?.(null);
    router.replace('/auth/signin');
  };

  const isActive = (href: string, exact: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href) && pathname !== '/dashboard';
  };

  return (
    <Protected>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static inset-y-0 left-0 z-40
            ${sidebarCollapsed ? 'w-20' : 'w-64'}
            bg-white border-r border-slate-200
            transform transition-[transform,width] duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="h-16 px-4 flex items-center gap-3 border-b border-slate-200">
              <div className={`rounded-xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white flex items-center justify-center font-bold shadow-lg
                ${sidebarCollapsed ? 'w-10 h-10 text-base' : 'w-10 h-10 text-lg'}`}>
                Ta
              </div>
              {!sidebarCollapsed && (
                <div className="leading-tight">
                  <h1 className="font-bold text-lg text-slate-900">Tamil Lens</h1>
                  <p className="text-xs text-slate-500">Learn visually</p>
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="ml-auto hidden lg:inline-flex p-2 rounded-lg hover:bg-slate-100 transition"
                aria-label="Collapse sidebar"
              >
                {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>

            {/* Streak Display */}
            {stats && !sidebarCollapsed && (
              <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-amber-50">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <div>
                    <div className="text-lg font-bold text-orange-600">{stats.currentStreak} day{stats.currentStreak !== 1 ? 's' : ''}</div>
                    <div className="text-xs text-slate-600">Current streak</div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <nav className="flex-1 px-3 py-6 overflow-y-auto">
              <div className="space-y-2">
                {nav.map((item) => {
                  const active = isActive(item.href, item.exact);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        group flex items-center gap-3 rounded-xl px-3 py-3
                        text-sm font-medium transition-all
                        ${active
                          ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg'
                          : 'text-slate-700 hover:bg-cyan-50 hover:text-cyan-700'}
                      `}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>

              {/* Quick Tip */}
              {!sidebarCollapsed && (
                <div className="mt-6 px-1">
                  <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-cyan-700 mb-1">💡 Quick Tip</p>
                    <p className="text-xs text-slate-600">
                      Review flashcards daily to boost retention!
                    </p>
                  </div>
                </div>
              )}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 px-4 py-2.5 text-sm font-semibold transition-all border border-slate-200 hover:border-rose-300"
              >
                <LogOut className="w-4 h-4" />
                {!sidebarCollapsed && <span>Logout</span>}
              </button>
              {!sidebarCollapsed && (
                <div className="mt-3 text-xs text-center text-slate-400">
                  © {new Date().getFullYear()} Tamil Lens
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top bar */}
          <header className="h-16 bg-white/90 backdrop-blur-lg border-b border-slate-200 shadow-sm z-20">
            <div className="h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-xl hover:bg-slate-100 transition-colors lg:hidden"
                  aria-label="Toggle sidebar"
                >
                  <Menu className="w-6 h-6" />
                </button>

                <div className="relative flex-1 max-w-md hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-full px-4 py-2">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                    {initials}
                  </div>
                  <span className="text-sm font-medium text-slate-700 truncate max-w-[180px]">
                    {displayName}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white px-3 sm:px-4 py-2 text-sm font-medium text-slate-700 hover:border-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </Protected>
  );
}