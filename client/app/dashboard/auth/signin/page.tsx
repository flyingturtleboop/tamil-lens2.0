'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

export default function SignInPage() {
  const router = useRouter();
  const search = useSearchParams();
  const urlMode = search.get('mode');

  // 1) default to /dashboard, and map legacy short paths
  const rawNext = search.get('next') || '/dashboard';
  const mapNext = (n: string) => {
    if (!n) return '/dashboard';
    if (n === '/scan') return '/dashboard/scan';
    if (n === '/quiz') return '/dashboard/quiz';
    return n.startsWith('/') ? n : `/${n}`;
  };
  const nextUrl = mapNext(rawNext);

  const [isSignUp, setIsSignUp] = useState(urlMode === 'signup');
  const { setAccessToken } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    remember: true,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => setIsSignUp(urlMode === 'signup'), [urlMode]);

  const heading = useMemo(() => (isSignUp ? 'Create account' : 'Welcome back!'), [isSignUp]);
  const sub = useMemo(
    () =>
      isSignUp
        ? 'Start learning Tamil with audio, transliteration, and quizzes.'
        : 'Sign in to continue building your Tamil vocabulary.',
    [isSignUp]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (isSignUp && formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      setLoading(false);
      return;
    }

    try {
      const path = isSignUp ? '/auth/register' : '/auth/login';
      const res = await apiFetch(path, {
        method: 'POST',
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          remember: formData.remember,
        }),
      });

      let data: any = {};
      try { data = await res.json(); } catch {}

      if (!res.ok) throw new Error(data?.message || 'Authentication failed');

      if (isSignUp) {
        setIsSignUp(false);
        setFormData((d) => ({ ...d, password: '', confirmPassword: '' }));
        return;
      }

      if (data?.access_token) setAccessToken(data.access_token);
      router.replace(nextUrl);
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const googleSignIn = () => setError('Google sign-in isn’t configured yet.');

  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-white">
      {/* Left gradient panel */}
      <div className="relative hidden md:block">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-400" />
        <div className="absolute inset-0 bg-white/5" />
        <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none">
          <defs>
            <linearGradient id="g1" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="white" stopOpacity="0.45" />
              <stop offset="100%" stopColor="white" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          {Array.from({ length: 8 }).map((_, i) => (
            <path
              key={i}
              d={`M-20 ${60 + i * 40} C 180 ${20 + i * 30}, 360 ${120 + i * 35}, 640 ${40 + i * 45}`}
              fill="none"
              stroke="url(#g1)"
              strokeWidth="2"
            />
          ))}
        </svg>

        <div className="relative h-full min-h-screen flex items-center justify-center px-10">
          <div className="max-w-md text-white">
            <div className="inline-flex items-center gap-3 bg-white/15 rounded-xl px-3 py-2 mb-6 backdrop-blur-sm">
              <span className="text-xl">👋</span>
              <span className="text-sm font-semibold tracking-wide">Vanakkam!</span>
            </div>
            <h1 className="text-5xl font-extrabold leading-tight drop-shadow-sm">
              Hello, <br /> Tamil Learner!
            </h1>
            <p className="mt-5 text-white/90 text-lg leading-relaxed">
              Point, hear, and practice with spaced repetition. Get productive with Tamil—fast.
            </p>
            <p className="mt-12 text-sm text-white/80">© {new Date().getFullYear()} Tamil Lens</p>
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center px-6 sm:px-10 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-700 bg-cyan-50 border border-cyan-200 px-2.5 py-1 rounded">
              Learn faster • Speak better
            </span>
          </div>

          <h2 className="text-3xl font-bold text-slate-900">{heading}</h2>
          <p className="text-slate-600 mt-1">{sub}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-800">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-800">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="••••••••"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
              />
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-800">
                  Confirm password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            )}

            {!isSignUp && (
              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                    checked={formData.remember}
                    onChange={(e) => setFormData({ ...formData, remember: e.target.checked })}
                  />
                  Remember for 30 days
                </label>
                <button
                  type="button"
                  className="text-sm text-cyan-700 hover:text-cyan-800 font-medium"
                  onClick={() => alert('Add reset flow later')}
                >
                  Forgot password
                </button>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-cyan-600 text-white py-2.5 font-semibold hover:bg-cyan-700 transition disabled:opacity-50"
            >
              {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>

            <button
              type="button"
              onClick={() => setError('Google sign-in isn’t configured yet.')}
              className="w-full rounded-md border border-slate-300 bg-white text-slate-700 py-2.5 font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-600">
            {isSignUp ? 'Already have an account?' : "Don’t have an account?"}{' '}
            <button
              className="font-semibold text-teal-700 hover:text-teal-800"
              onClick={() => {
                setIsSignUp((v) => !v);
                setError('');
                setFormData({ email: '', password: '', confirmPassword: '', remember: true });
              }}
            >
              {isSignUp ? 'Sign in' : 'Create one'}
            </button>
          </p>

          <div className="mt-4">
            <Link href="/#home" className="text-sm text-slate-500 hover:text-slate-700">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
