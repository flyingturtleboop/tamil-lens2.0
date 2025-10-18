'use client';

import React, { useEffect, useMemo, useState } from 'react';

type BankItem = { english: string; tamil: string; transliteration?: string };
type Question = {
  english: string;
  correctTamil: string;
  options: string[];
  note?: string; // transliteration hint
};

type BankResponse = {
  items: BankItem[];     // user's saved words (empty when logged out)
  myListCount: number;   // number of saved words
  defaultCount: number;  // size of your default bank on the server (for display)
};

const API =
  (process.env.NEXT_PUBLIC_SCAN_API || 'http://localhost:5000').replace(/\/$/, '');
const LS_KEY = 'tamilAR_bank_v1';

function getAccessToken(): string | null {
  return localStorage.getItem('access_token'); // adjust if you store it elsewhere
}

// ---------- Default hardcoded 100-word bank ----------
const DEFAULT_WORDS: BankItem[] = [
  { english: 'apple', tamil: 'ஆப்பிள்' },
  { english: 'book', tamil: 'புத்தகம்' },
  { english: 'pen', tamil: 'பேனா' },
  { english: 'table', tamil: 'மேசை' },
  { english: 'chair', tamil: 'நாற்காலி' },
  { english: 'door', tamil: 'கதவு' },
  { english: 'window', tamil: 'ஜன்னல்' },
  { english: 'car', tamil: 'கார்' },
  { english: 'bus', tamil: 'பேருந்து' },
  { english: 'train', tamil: 'தொடருந்து' },
  { english: 'bicycle', tamil: 'மிதிவண்டி' },
  { english: 'road', tamil: 'சாலை' },
  { english: 'house', tamil: 'வீடு' },
  { english: 'school', tamil: 'பள்ளி' },
  { english: 'teacher', tamil: 'ஆசிரியர்' },
  { english: 'student', tamil: 'மாணவர்' },
  { english: 'mother', tamil: 'தாய்' },
  { english: 'father', tamil: 'தந்தை' },
  { english: 'brother', tamil: 'சகோதரன்' },
  { english: 'sister', tamil: 'சகோதரி' },
  { english: 'child', tamil: 'குழந்தை' },
  { english: 'water', tamil: 'தண்ணீர்' },
  { english: 'milk', tamil: 'பால்' },
  { english: 'rice', tamil: 'அரிசி' },
  { english: 'tea', tamil: 'தேநீர்' },
  { english: 'coffee', tamil: 'காப்பி' },
  { english: 'sugar', tamil: 'சர்க்கரை' },
  { english: 'salt', tamil: 'உப்பு' },
  { english: 'oil', tamil: 'எண்ணெய்' },
  { english: 'fish', tamil: 'மீன்' },
  { english: 'meat', tamil: 'மாமிசம்' },
  { english: 'egg', tamil: 'முட்டை' },
  { english: 'banana', tamil: 'வாழைப்பழம்' },
  { english: 'mango', tamil: 'மாம்பழம்' },
  { english: 'flower', tamil: 'பூ' },
  { english: 'tree', tamil: 'மரம்' },
  { english: 'leaf', tamil: 'இலை' },
  { english: 'sun', tamil: 'சூரியன்' },
  { english: 'moon', tamil: 'நிலா' },
  { english: 'star', tamil: 'நட்சத்திரம்' },
  { english: 'sky', tamil: 'வானம்' },
  { english: 'cloud', tamil: 'மேகம்' },
  { english: 'rain', tamil: 'மழை' },
  { english: 'wind', tamil: 'காற்று' },
  { english: 'fire', tamil: 'தீ' },
  { english: 'earth/soil', tamil: 'மண்' },
  { english: 'mountain', tamil: 'மலை' },
  { english: 'river', tamil: 'நதி' },
  { english: 'sea', tamil: 'கடல்' },
  { english: 'stone', tamil: 'கல்' },
  { english: 'sand', tamil: 'மணல்' },
  { english: 'bird', tamil: 'பறவை' },
  { english: 'dog', tamil: 'நாய்' },
  { english: 'cat', tamil: 'பூனை' },
  { english: 'cow', tamil: 'பசு' },
  { english: 'goat', tamil: 'ஆடு' },
  { english: 'horse', tamil: 'குதிரை' },
  { english: 'elephant', tamil: 'யானை' },
  { english: 'tiger', tamil: 'புலி' },
  { english: 'lion', tamil: 'சிங்கம்' },
  { english: 'monkey', tamil: 'குரங்கு' },
  { english: 'snake', tamil: 'பாம்பு' },
  { english: 'mouse (animal)', tamil: 'எலி' },
  { english: 'shoe', tamil: 'காலணி' },
  { english: 'shirt', tamil: 'சட்டை' },
  { english: 'dress/clothes', tamil: 'உடை' },
  { english: 'hat', tamil: 'தொப்பி' },
  { english: 'bag', tamil: 'பை' },
  { english: 'key', tamil: 'திறவுகோல்' },
  { english: 'phone', tamil: 'தொலைபேசி' },
  { english: 'clock', tamil: 'கடிகாரம்' },
  { english: 'watch', tamil: 'கைக்கடிகாரம்' },
  { english: 'bed', tamil: 'படுக்கை' },
  { english: 'pillow', tamil: 'தலையணை' },
  { english: 'blanket', tamil: 'போர்வை' },
  { english: 'wall', tamil: 'சுவர்' },
  { english: 'floor', tamil: 'தரை' },
  { english: 'lamp', tamil: 'விளக்கு' },
  { english: 'light', tamil: 'ஒளி' },
  { english: 'fan', tamil: 'விசிறி' },
  { english: 'computer', tamil: 'கணினி' },
  { english: 'laptop', tamil: 'மடிக்கணினி' },
  { english: 'keyboard', tamil: 'விசைப்பலகை' },
  { english: 'mouse (device)', tamil: 'மவுஸ்' },
  { english: 'screen', tamil: 'திரை' },
  { english: 'camera', tamil: 'கேமிரா' },
  { english: 'photo', tamil: 'புகைப்படம்' },
  { english: 'music', tamil: 'இசை' },
  { english: 'song', tamil: 'பாடல்' },
  { english: 'game', tamil: 'விளையாட்டு' },
  { english: 'color', tamil: 'நிறம்' },
  { english: 'red', tamil: 'சிவப்பு' },
  { english: 'blue', tamil: 'நீலம்' },
  { english: 'green', tamil: 'பச்சை' },
  { english: 'black', tamil: 'கருப்பு' },
  { english: 'white', tamil: 'வெಳ್ಳை' },
  { english: 'day', tamil: 'நாள்' },
  { english: 'night', tamil: 'இரவு' },
  { english: 'morning', tamil: 'காலை' },
  { english: 'evening', tamil: 'மாலை' },
  { english: 'yesterday', tamil: 'நேற்று' },
  { english: 'today', tamil: 'இன்று' },
  { english: 'tomorrow', tamil: 'நாளை' },
];

// ---------- Utils ----------
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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

async function apiLoad(): Promise<BankResponse> {
  const atk = getAccessToken();
  const res = await fetch(`${API}/api/bank`, {
    method: 'GET',
    credentials: 'include',
    headers: atk ? { Authorization: `Bearer ${atk}` } : {},
  });

  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error(`server ${res.status}`);

  const data = await res.json();
  if (Array.isArray(data)) {
    return {
      items: data as BankItem[],
      myListCount: data.length,
      defaultCount: DEFAULT_WORDS.length,
    };
  }
  const obj = data as Partial<BankResponse>;
  return {
    items: Array.isArray(obj.items) ? (obj.items as BankItem[]) : [],
    myListCount:
      typeof obj.myListCount === 'number' ? obj.myListCount : (obj.items?.length ?? 0),
    defaultCount:
      typeof obj.defaultCount === 'number' ? obj.defaultCount : DEFAULT_WORDS.length,
  };
}

async function apiCount(): Promise<number> {
  const atk = getAccessToken();
  const res = await fetch(`${API}/api/bank`, {
    method: 'GET',
    credentials: 'include',
    headers: atk ? { Authorization: `Bearer ${atk}` } : {},
  });

  if (!res.ok) throw new Error('server');
  const data = await res.json();

  if (Array.isArray(data)) return data.length;
  const obj = data as Partial<BankResponse>;
  if (typeof obj.myListCount === 'number') return obj.myListCount;
  return Array.isArray(obj.items) ? obj.items.length : 0;
}

function mergePool(defaults: BankItem[], saved: BankItem[]) {
  const seen = new Set<string>();
  const out: BankItem[] = [];
  for (const w of [...saved, ...defaults]) {
    const key = `${(w.english || '').trim().toLowerCase()}|${(w.tamil || '').trim()}`;
    if (!w.english || !w.tamil) continue;
    if (!seen.has(key)) {
      seen.add(key);
      out.push({ english: w.english, tamil: w.tamil, transliteration: w.transliteration });
    }
  }
  return out.slice(0, 800);
}

function pickDistractors(correct: string, pool: string[], n = 3): string[] {
  const candidates = pool.filter((t) => t !== correct);
  return shuffle(candidates).slice(0, n);
}

function buildQuiz(total: number, pool: BankItem[]): Question[] {
  const usable = pool.filter((w) => w.tamil && w.english);
  const chosen = shuffle(usable).slice(0, Math.min(total, usable.length));
  const tamilPool = usable.map((w) => w.tamil);
  return chosen.map((w) => {
    const distractors = pickDistractors(w.tamil, tamilPool, 3);
    const options = shuffle([w.tamil, ...distractors]);
    return {
      english: w.english,
      correctTamil: w.tamil,
      options,
      note: w.transliteration,
    };
  });
}

export default function QuizPage() {
  const DEFAULT_COUNT = 10;

  const [started, setStarted] = useState(false);
  const [qCount, setQCount] = useState(DEFAULT_COUNT);
  const [includeSaved, setIncludeSaved] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [serverDefaultCount, setServerDefaultCount] = useState<number | null>(null);

  const [pool, setPool] = useState<BankItem[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<
    { english: string; correct: string; picked: string | null }[]
  >([]);

  // load counts & candidate pool (prefer server)
  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      const defaults = DEFAULT_WORDS.map((w) => ({ english: w.english, tamil: w.tamil }));
      try {
        const server = await apiLoad();
        if (!mounted) return;
        setSavedCount(server.myListCount || 0);
        setServerDefaultCount(server.defaultCount ?? DEFAULT_WORDS.length);
        const merged = includeSaved ? mergePool(defaults, server.items || []) : defaults;
        setPool(merged);
      } catch (e) {
        const local = lsLoad();
        if (!mounted) return;
        setSavedCount(local.length);
        setServerDefaultCount(DEFAULT_WORDS.length);
        const merged = includeSaved ? mergePool(defaults, local) : defaults;
        setPool(merged);
        setError('Using local words (server unavailable or unauthorized).');
      }
      const savedQ = localStorage.getItem('quiz_qcount');
      if (mounted && savedQ) {
        const n = parseInt(savedQ, 10);
        if (!Number.isNaN(n)) setQCount(Math.min(Math.max(n, 5), 800));
      }
    })();
    return () => {
      mounted = false;
    };
  }, [includeSaved]);

  const startQuiz = () => {
    if (pool.length < 4) {
      alert('Not enough words to build options. Add more words to “My List” first.');
      return;
    }
    const q = buildQuiz(qCount, pool);
    if (q.length === 0) {
      alert('No valid questions could be generated. Please add more words.');
      return;
    }
    setQuestions(q);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setDone(false);
    setReview([]);
    setStarted(true); // <-- important: actually enters quiz mode
    localStorage.setItem('quiz_qcount', String(qCount));
  };

  const current = questions[index];

  const choose = (opt: string) => {
    if (!current || selected) return;
    setSelected(opt);
    const correct = opt === current.correctTamil;
    setScore((s) => s + (correct ? 1 : 0));
    setReview((r) => [
      ...r,
      { english: current.english, correct: current.correctTamil, picked: opt },
    ]);
    setTimeout(() => {
      const next = index + 1;
      if (next >= questions.length) setDone(true);
      else {
        setIndex(next);
        setSelected(null);
      }
    }, 650);
  };

  const reset = () => {
    setStarted(false);
    setQuestions([]);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setDone(false);
    setReview([]);
  };

  const pct = useMemo(
    () =>
      questions.length > 0
        ? Math.round(((index + (selected ? 1 : 0)) / questions.length) * 100)
        : 0,
    [index, selected, questions.length]
  );

  const defaultCountForDisplay = serverDefaultCount ?? DEFAULT_WORDS.length;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Quiz</h1>

      {!started && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <p className="text-slate-600">
            Choose the correct <span className="font-semibold">Tamil</span> word for the given{' '}
            <span className="font-semibold">English</span> word.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <label className="text-slate-700 font-medium">Number of questions</label>
            <select
              value={qCount}
              onChange={(e) =>
                setQCount(Math.min(Math.max(parseInt(e.target.value, 10), 5), 800))
              }
              className="rounded-lg border border-slate-300 px-3 py-2"
            >
              {[10, 15, 20, 25, 30, 40, 50, 75, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>

            <label className="ml-4 inline-flex items-center gap-2 text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={includeSaved}
                onChange={(e) => setIncludeSaved(e.target.checked)}
              />
              Include “My List”
              <span className="ml-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-[2px] text-xs">
                {savedCount}
              </span>
            </label>

            <button
              onClick={startQuiz}
              disabled={pool.length < 4}
              className={`ml-auto rounded-lg text-white font-semibold px-4 py-2 ${
                pool.length < 4
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              Start Quiz
            </button>
          </div>

          <p className="text-sm text-slate-500">
            Default bank: {defaultCountForDisplay} • My List: {savedCount}
          </p>
          {error && <p className="text-sm text-amber-600">Note: {error}</p>}
          {pool.length < 4 && (
            <p className="text-sm text-rose-600">
              You need at least 4 words to generate choices. Add more to “My List” on the Scan page.
            </p>
          )}
        </div>
      )}

      {started && !done && current && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="mb-4">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>
                Question {index + 1}/{questions.length}
              </span>
              <span>Score: {score}</span>
            </div>
            <div className="h-2 w-full rounded bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="text-slate-800">
            <div className="text-sm uppercase tracking-wide text-slate-500">English</div>
            <div className="text-2xl font-bold">{current.english}</div>
            {current.note && (
              <div className="mt-1 text-xs text-slate-500">
                Hint (transliteration): {current.note}
              </div>
            )}
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            {current.options.map((opt) => {
              const picked = selected === opt;
              const isCorrect = opt === current.correctTamil;
              const show = !!selected;
              const classes = [
                'w-full text-left rounded-xl border px-4 py-3 font-semibold transition',
                show && isCorrect
                  ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                  : show && picked && !isCorrect
                  ? 'border-rose-600 bg-rose-50 text-rose-800'
                  : 'border-slate-300 hover:border-slate-400 bg-white text-slate-900',
              ].join(' ');
              return (
                <button key={opt} onClick={() => choose(opt)} className={classes}>
                  <span className="text-xl">{opt}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-4 text-sm text-slate-500">
            Tip: Options lock after you pick. Next question auto-advances.
          </div>
        </div>
      )}

      {done && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Results</h2>
            <div className="text-slate-700 font-semibold">
              Score: {score}/{questions.length} (
              {Math.round((score / questions.length) * 100)}%)
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600">
                  <th className="py-2 pr-4">#</th>
                  <th className="py-2 pr-4">English</th>
                  <th className="py-2 pr-4">Your choice</th>
                  <th className="py-2 pr-4">Correct</th>
                </tr>
              </thead>
              <tbody>
                {review.map((r, i) => {
                  const correct = r.picked === r.correct;
                  return (
                    <tr key={i} className="border-t border-slate-200">
                      <td className="py-2 pr-4">{i + 1}</td>
                      <td className="py-2 pr-4">{r.english}</td>
                      <td
                        className={`py-2 pr-4 ${
                          correct ? 'text-emerald-700' : 'text-rose-700'
                        }`}
                      >
                        {r.picked ?? '—'}
                      </td>
                      <td className="py-2 pr-4 font-semibold">{r.correct}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={startQuiz}
              className="rounded-lg bg-sky-600 text-white font-semibold px-4 py-2 hover:bg-sky-700"
            >
              Retry (same settings)
            </button>
            <button
              onClick={reset}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold hover:border-slate-400"
            >
              Back to setup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
