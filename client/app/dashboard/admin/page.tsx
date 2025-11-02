'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, Users, ClipboardList, BookOpen, Search, CheckCircle2, XCircle,
} from 'lucide-react';

/** --------------------------------
 * Types
 ---------------------------------*/
type Role = 'student' | 'teacher' | 'admin';

interface Me {
  id: number;
  name: string;
  role?: Role;
}

interface Student {
  id: number;
  name: string;
  email: string;
  wordsCount: number;
  lastActive?: string;
  status?: 'active' | 'suspended';
}

interface ReviewItem {
  id: number;
  english: string;
  tamil: string;
  transliteration?: string;
  submittedBy: { id: number; name: string };
  created_at?: string;
}

/** --------------------------------
 * Config / helpers
 ---------------------------------*/
const API = (process.env.NEXT_PUBLIC_SCAN_API || 'http://localhost:5000').replace(/\/$/, '');

function getAccessToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
}

async function apiJson<T>(path: string, init?: RequestInit): Promise<T> {
  const atk = getAccessToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(atk ? { Authorization: `Bearer ${atk}` } : {}),
      ...(init?.headers || {}),
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${text}`.trim());
  }
  return res.json();
}

async function safeLoad<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/** --------------------------------
 * Page
 ---------------------------------*/
export default function AdminPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // tabs
  const [tab, setTab] = useState<'overview' | 'students' | 'review' | 'quizzes'>('overview');

  // data
  const [students, setStudents] = useState<Student[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewItem[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let on = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const meRes = await apiJson<Me>('/api/me');
        if (!on) return;
        setMe(meRes);

        // Gate by role
        if (meRes.role !== 'teacher' && meRes.role !== 'admin') {
          setError('forbidden');
          return;
        }

        // hydrate initial data
        const [studentsRes, reviewRes] = await Promise.all([
          safeLoad<Student[]>(() => apiJson('/api/admin/students'), []),
          safeLoad<ReviewItem[]>(() => apiJson('/api/admin/review?status=pending'), []),
        ]);
        if (!on) return;
        setStudents(studentsRes);
        setReviewQueue(reviewRes);
      } catch (e: any) {
        setError(e?.message || 'Unable to load admin');
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return students;
    return students.filter((s) => [s.name, s.email].some((t) => t?.toLowerCase().includes(q)));
  }, [students, query]);

  // actions
  async function approveWord(id: number) {
    try {
      await apiJson(`/api/admin/review/${id}/approve`, { method: 'POST' });
      setReviewQueue((q) => q.filter((r) => r.id !== id));
    } catch (e: any) {
      alert(`Approve failed: ${e.message}`);
    }
  }
  async function rejectWord(id: number) {
    try {
      await apiJson(`/api/admin/review/${id}/reject`, { method: 'POST' });
      setReviewQueue((q) => q.filter((r) => r.id !== id));
    } catch (e: any) {
      alert(`Reject failed: ${e.message}`);
    }
  }
  async function resetPassword(userId: number) {
    try {
      await apiJson(`/api/admin/users/${userId}/reset-password`, { method: 'POST' });
      alert('Password reset link sent.');
    } catch (e: any) {
      alert(`Reset failed: ${e.message}`);
    }
  }
  async function toggleSuspend(s: Student) {
    try {
      const next = s.status === 'suspended' ? 'active' : 'suspended';
      await apiJson(`/api/admin/users/${s.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: next }),
      });
      setStudents((arr) => arr.map((x) => (x.id === s.id ? { ...x, status: next } : x)));
    } catch (e: any) {
      alert(`Update failed: ${e.message}`);
    }
  }

  // UI shells
  if (loading) return <Shell title="Teacher Admin"><div className="text-sm text-slate-600">Loading…</div></Shell>;

  if (error === 'forbidden' || (me && me.role !== 'teacher' && me.role !== 'admin')) {
    return (
      <Shell title="Teacher Admin">
        <Forbidden />
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell title="Teacher Admin">
        <ErrorBox message={error} />
      </Shell>
    );
  }

  return (
    <Shell title="Teacher Admin">
      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <Tab icon={<Shield className="w-4 h-4" />} selected={tab==='overview'} onClick={() => setTab('overview')}>Overview</Tab>
        <Tab icon={<Users className="w-4 h-4" />} selected={tab==='students'} onClick={() => setTab('students')}>Students</Tab>
        <Tab icon={<ClipboardList className="w-4 h-4" />} selected={tab==='review'} onClick={() => setTab('review')}>Word Review</Tab>
        <Tab icon={<BookOpen className="w-4 h-4" />} selected={tab==='quizzes'} onClick={() => setTab('quizzes')}>Quizzes</Tab>
      </div>

      {tab === 'overview' && (
        <Card>
          <h2 className="font-semibold text-lg mb-4">Overview</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <Stat label="Total Students" value={students.length} />
            <Stat label="Pending Reviews" value={reviewQueue.length} />
            <Stat label="Active (est.)" value={students.filter(s => s.status !== 'suspended').length} />
          </div>
          <div className="mt-6 text-sm text-slate-600">
            Quick links:
            <div className="mt-2 flex gap-3 flex-wrap">
              <Link className="text-cyan-700 underline" href="/dashboard/words">Browse Words</Link>
              <Link className="text-cyan-700 underline" href="/dashboard/quiz">Quizzes</Link>
              <Link className="text-cyan-700 underline" href="/dashboard/scan">Scan</Link>
            </div>
          </div>
        </Card>
      )}

      {tab === 'students' && (
        <Card>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-semibold text-lg">Students</h2>
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name/email"
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
              />
            </div>
          </div>

          <div className="overflow-x-auto -mx-2 md:mx-0">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500">
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Words</th>
                  <th className="px-2 py-2">Last Active</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="align-middle">
                    <td className="px-2 py-2 font-medium text-slate-900">{s.name}</td>
                    <td className="px-2 py-2 text-slate-700">{s.email}</td>
                    <td className="px-2 py-2">{s.wordsCount}</td>
                    <td className="px-2 py-2 text-slate-600">{s.lastActive ? new Date(s.lastActive).toLocaleString() : '—'}</td>
                    <td className="px-2 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${s.status === 'suspended' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {s.status === 'suspended' ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => resetPassword(s.id)} className="text-cyan-700 hover:underline">Reset PW</button>
                        <button onClick={() => toggleSuspend(s)} className="text-slate-700 hover:underline">
                          {s.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <Link href={`/dashboard/words?user=${s.id}`} className="text-slate-700 hover:underline">View Words</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'review' && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-lg">Word Review Queue</h2>
            <span className="text-sm text-slate-600">{reviewQueue.length} pending</span>
          </div>
          {reviewQueue.length === 0 ? (
            <div className="text-sm text-slate-600">No items to review.</div>
          ) : (
            <ul className="space-y-3">
              {reviewQueue.map((r) => (
                <li key={r.id} className="p-3 border border-slate-200 rounded-xl bg-white flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-900">
                      {r.tamil} <span className="text-slate-400">•</span> {r.english}
                    </div>
                    {r.transliteration && <div className="text-sm text-slate-600">{r.transliteration}</div>}
                    <div className="text-xs text-slate-500 mt-1">Submitted by {r.submittedBy.name}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => approveWord(r.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Approve
                    </button>
                    <button
                      onClick={() => rejectWord(r.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700"
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'quizzes' && (
        <Card>
          <h2 className="font-semibold text-lg mb-2">Quizzes</h2>
          <p className="text-sm text-slate-600">Coming soon: build, assign, and auto-grade quizzes from your word bank.</p>
          <div className="mt-3">
            <Link href="/dashboard/quiz" className="text-cyan-700 underline">Open student quiz page</Link>
          </div>
        </Card>
      )}
    </Shell>
  );
}

/** --------------------------------
 * Small UI bits
 ---------------------------------*/
function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-cyan-500 via-teal-500 to-cyan-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-cyan-50/90 text-sm">Manage students, review words, and oversee class progress.</p>
          </div>
          <Link href="/dashboard" className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/25">↩ Dashboard</Link>
        </div>
      </div>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-2xl border border-slate-200 p-5">{children}</div>;
}

function Tab({
  children, selected, onClick, icon,
}: { children: React.ReactNode; selected?: boolean; onClick: () => void; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition ${
        selected ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-400'
      }`}
    >
      {icon}{children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="p-4 rounded-xl border-2 border-slate-200 bg-slate-50">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-2xl font-semibold text-slate-900 mt-1">{value}</div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-800 text-sm">{message}</div>;
}

function Forbidden() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm">
      You don’t have permission to view this page. Ask your admin to grant the <b>teacher</b> role.
    </div>
  );
}
