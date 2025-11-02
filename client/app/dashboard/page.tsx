'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type BankItem = { id?: number; english: string; tamil: string; transliteration?: string };
type BankResponse =
  | BankItem[]
  | { items: BankItem[]; myListCount: number; defaultCount?: number };

const API = (process.env.NEXT_PUBLIC_SCAN_API || 'http://localhost:5000').replace(/\/$/, '');
const LS_KEY = 'tamilAR_bank_v1';


// -------------------- Proverb of the Day (Aathichoodi) --------------------
type Proverb = {
  ta: string;
  en: string;
  source: 'Aathichoodi';
  tag: string;
};

const PROVERBS: Proverb[] = [
  { ta: 'அறம் செய விரும்பு', en: 'Intend to do right deeds.', source: 'Aathichoodi', tag: 'Aathichoodi – அறம் செய விரும்பு' },
  { ta: 'ஆறுவது சினம்', en: 'Anger’s nature is to subside.', source: 'Aathichoodi', tag: 'Aathichoodi – ஆறுவது சினம்' },
  { ta: 'இயல்வது கரவேல்', en: 'Help others as much as you can.', source: 'Aathichoodi', tag: 'Aathichoodi – இயல்வது கரவேல்' },
  { ta: 'ஈவது விலக்கேல்', en: 'Do not shy away from charity.', source: 'Aathichoodi', tag: 'Aathichoodi – ஈவது விலக்கேல்' },
  { ta: 'உடையது விளம்பேல்', en: 'Do not boast of your possessions.', source: 'Aathichoodi', tag: 'Aathichoodi – உடையது விளம்பேல்' },
  { ta: 'ஊக்கமது கைவிடேல்', en: 'Never lose hope or motivation.', source: 'Aathichoodi', tag: 'Aathichoodi – ஊக்கமது கைவிடேல்' },
  { ta: 'எண் எழுத்து இகழேல்', en: 'Respect numbers and letters; learn them well.', source: 'Aathichoodi', tag: 'Aathichoodi – எண் எழுத்து இகழேல்' },
  { ta: 'ஐயம் இட்டு உண்', en: 'Give alms first; then eat.', source: 'Aathichoodi', tag: 'Aathichoodi – ஐயம் இட்டு உண்' },
  { ta: 'ஒப்புரவு ஒழுகு', en: 'Live in harmony with the world.', source: 'Aathichoodi', tag: 'Aathichoodi – ஒப்புரவு ஒழுகு' },
  { ta: 'ஓதுவது ஒழியேல்', en: 'Never stop learning.', source: 'Aathichoodi', tag: 'Aathichoodi – ஓதுவது ஒழியேல்' },
  { ta: 'ஔவியம் பேசேல்', en: 'Do not speak ill of others.', source: 'Aathichoodi', tag: 'Aathichoodi – ஔவியம் பேசேல்' },
  { ta: 'கண்டொன்று சொல்லேல்', en: 'Do not say one thing after seeing another.', source: 'Aathichoodi', tag: 'Aathichoodi – கண்டொன்று சொல்லேல்' },
  { ta: 'ஞயம்பட உரை', en: 'Speak sweetly and kindly.', source: 'Aathichoodi', tag: 'Aathichoodi – ஞயம்பட உரை' },
  { ta: 'இணக்கம் அறிந்து இணங்கு', en: 'Choose good company and be harmonious.', source: 'Aathichoodi', tag: 'Aathichoodi – இணக்கம் அறிந்து இணங்கு' },
  { ta: 'தந்தை தாய்ப் பேண்', en: 'Protect and care for your parents.', source: 'Aathichoodi', tag: 'Aathichoodi – தந்தை தாய்ப் பேண்' },
  { ta: 'நன்றி மறவேல்', en: 'Do not forget gratitude.', source: 'Aathichoodi', tag: 'Aathichoodi – நன்றி மறவேல்' },
  { ta: 'பருவத்தே பயிர் செய்', en: 'Do things in their proper season.', source: 'Aathichoodi', tag: 'Aathichoodi – பருவத்தே பயிர் செய்' },
  { ta: 'வஞ்சகம் பேசேல்', en: 'Do not speak deceitfully.', source: 'Aathichoodi', tag: 'Aathichoodi – வஞ்சகம் பேசேல்' },
  { ta: 'இளமையில் கல்', en: 'Learn when you are young.', source: 'Aathichoodi', tag: 'Aathichoodi – இளமையில் கல்' },
  { ta: 'அறனை மறவேல்', en: 'Never forget your moral duty.', source: 'Aathichoodi', tag: 'Aathichoodi – அறனை மறவேல்' },
  { ta: 'கடிவது மற', en: 'Refrain from scolding others.', source: 'Aathichoodi', tag: 'Aathichoodi – கடிவது மற' },
  { ta: 'குணமது கைவிடேல்', en: 'Do not give up good character.', source: 'Aathichoodi', tag: 'Aathichoodi – குணமது கைவிடேல்' },
  { ta: 'கூடிப் பிரியேல்', en: 'Make good friends and don’t leave them.', source: 'Aathichoodi', tag: 'Aathichoodi – கூடிப் பிரியேல்' },
  { ta: 'கேள்வி முயல்', en: 'Learn by asking questions.', source: 'Aathichoodi', tag: 'Aathichoodi – கேள்வி முயல்' },
  { ta: 'சான்றோர் இனத்து இரு', en: 'Keep company with the noble.', source: 'Aathichoodi', tag: 'Aathichoodi – சான்றோர் இனத்து இரு' },
  { ta: 'சீர்மை மறவேல்', en: 'Do not forget righteous conduct.', source: 'Aathichoodi', tag: 'Aathichoodi – சீர்மை மறவேல்' },
  { ta: 'சூது விரும்பேல்', en: 'Do not gamble.', source: 'Aathichoodi', tag: 'Aathichoodi – சூது விரும்பேல்' },
  { ta: 'செய்வன திருந்தச் செய்', en: 'Do your actions impeccably.', source: 'Aathichoodi', tag: 'Aathichoodi – செய்வன திருந்தச் செய்' },
  { ta: 'சோம்பித் திரியேல்', en: 'Do not be lazy.', source: 'Aathichoodi', tag: 'Aathichoodi – சோம்பித் திரியேல்' },
  { ta: 'தக்கோன் எனத் திரி', en: 'Live so the wise call you worthy.', source: 'Aathichoodi', tag: 'Aathichoodi – தக்கோன் எனத் திரி' },
];

// Deterministic "random" pick per local day using a date-seeded PRNG.
// This gives a new proverb each day but remains stable within the day.
function pickDailyProverb(list: Proverb[]): Proverb | null {
  if (!list || list.length === 0) return null;
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const seed = y * 10000 + m * 100 + d; // YYYYMMDD
  // Simple pseudo-random derived from Math.sin; stable for a given seed.
  const frac = Math.abs(Math.sin(seed) * 10000) % 1;
  const idx = Math.floor(frac * list.length);
  return list[idx];
}

// ---- helpers copied to match Quiz workflow ----
function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

function lsLoad(): BankItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? (JSON.parse(raw) as BankItem[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function loadBank(): Promise<{ items: BankItem[]; myListCount: number }> {
  const atk = getAccessToken();
  const res = await fetch(`${API}/api/bank`, {
    method: 'GET',
    credentials: 'include',
    headers: atk ? { Authorization: `Bearer ${atk}` } : {},
  });

  // If unauthorized, let caller fall back to local storage
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error(`server ${res.status}`);

  const data: BankResponse = await res.json();
  if (Array.isArray(data)) {
    return { items: data, myListCount: data.length };
  }
  return {
    items: Array.isArray(data.items) ? data.items : [],
    myListCount:
      typeof data.myListCount === 'number'
        ? data.myListCount
        : Array.isArray(data.items)
        ? data.items.length
        : 0,
  };
}

// ---- Dashboard ----
export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<BankItem[]>([]);
  const [totalWords, setTotalWords] = useState(0);

  useEffect(() => {
    let on = true;
    (async () => {
      setError(null);
      try {
        const { items, myListCount } = await loadBank();
        if (!on) return;
        setItems(items);
        setTotalWords(myListCount);
      } catch {
        // logged out or network/server issue → show device words if any
        const ls = lsLoad();
        if (!on) return;
        setItems(ls);
        setTotalWords(ls.length);
        setError('Showing local words (not signed in or server unavailable).');
      } finally {
        if (on) setLoading(false);
      }
    })();
    return () => {
      on = false;
    };
  }, []);

  const recent = useMemo(
    () =>
      items.slice(0, 6).map((w) => ({
        word: w.tamil,
        english: w.english,
        translit: w.transliteration || '',
      })),
    [items]
  );

  const thresholds = [50, 100, 200] as const;
  const proverb = useMemo(() => pickDailyProverb(PROVERBS), []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-cyan-500 via-teal-500 to-cyan-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
            <p className="text-cyan-50 text-lg">Your personal Tamil word bank is growing.</p>
            {error && <p className="mt-2 text-amber-100/90 text-sm">{error}</p>}
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 text-center">
            <div className="text-4xl font-bold">{loading ? '—' : totalWords}</div>
            <div className="text-sm text-cyan-50 mt-1">Total Words</div>
          </div>
        </div>
      </div>

      {/* Quick Actions + Recent */}

            {/* Proverb of the Day */}
      {proverb && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-medium px-2 py-1 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                📜 Proverb of the Day
              </div>
              <h3 className="font-bold text-xl mt-3 text-slate-900 leading-snug">{proverb.ta}</h3>
              <p className="text-slate-600 mt-1">{proverb.en}</p>
              <div className="mt-3 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 border border-slate-200">
                  Source: {proverb.source} · {proverb.tag}
                </span>
              </div>
            </div>
            <div className="shrink-0 hidden sm:block">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-500 text-white flex items-center justify-center text-3xl shadow">
                🔅
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-lg mb-4 text-slate-900">Quick Actions</h3>
          <div className="space-y-3">
            <Link
              href="/dashboard/scan"
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl">📸</div>
              <div className="flex-1 text-left">
                <div className="font-semibold">Scan Object</div>
                <div className="text-sm text-cyan-50">Point & learn new words</div>
              </div>
              <div className="text-2xl group-hover:translate-x-1 transition-transform">→</div>
            </Link>

            <Link
              href="/dashboard/quiz"
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-cyan-500 hover:bg-cyan-50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center text-2xl">🧠</div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-slate-900">Take Quiz</div>
                <div className="text-sm text-slate-600">Test your knowledge</div>
              </div>
              <div className="text-2xl group-hover:translate-x-1 transition-transform">→</div>
            </Link>

            <Link
              href="/dashboard/flashcards"
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-cyan-500 hover:bg-cyan-50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-2xl">🎴</div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-slate-900">Flashcards</div>
                <div className="text-sm text-slate-600">Review & memorize</div>
              </div>
              <div className="text-2xl group-hover:translate-x-1 transition-transform">→</div>
            </Link>

            <Link
              href="/dashboard/words"
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-cyan-500 hover:bg-cyan-50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-2xl">📚</div>
              <div className="flex-1 text-left">
                <div className="font-semibold text-slate-900">My Word List</div>
                <div className="text-sm text-slate-600">Review & manage words</div>
              </div>
              <div className="text-2xl group-hover:translate-x-1 transition-transform">→</div>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="font-bold text-lg mb-4 text-slate-900">Recent Activity</h3>
          <div className="space-y-3">
            {loading && <div className="text-slate-500 text-sm">Loading…</div>}
            {!loading && recent.length === 0 && (
              <div className="text-slate-500 text-sm">
                No words yet. Try{' '}
                <Link href="/dashboard/scan" className="text-cyan-700 font-medium underline">
                  scanning your first object
                </Link>
                .
              </div>
            )}
            {recent.map((r, i) => (
              <div
                key={`${r.english}-${i}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-cyan-50 transition-all border border-transparent hover:border-cyan-200"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 flex items-center justify-center text-white font-bold">
                  {r.english?.[0]?.toUpperCase() || '·'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900">{r.word}</div>
                  <div className="text-sm text-slate-600 truncate">
                    {r.english} {r.translit ? `• ${r.translit}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Milestones – live progress */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 className="font-bold text-lg mb-4 text-slate-900">Learning Milestones</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {thresholds.map((t) => {
            const achieved = totalWords >= t;
            const progress = achieved ? 100 : Math.min(100, Math.round((totalWords / t) * 100));
            return (
              <div
                key={t}
                className={`p-4 rounded-xl border-2 ${
                  achieved ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      achieved ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-slate-600'
                    }`}
                  >
                    {achieved ? '✓' : '○'}
                  </div>
                  <div className="font-semibold text-slate-900">{t} Words</div>
                </div>
                {!achieved && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-slate-600 mb-1">
                      <span>{progress}%</span>
                      <span>
                        {Math.min(totalWords, t)}/{t}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}