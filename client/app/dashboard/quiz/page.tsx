'use client';

import React, { useEffect, useMemo, useState } from 'react';

type BankItem = { english: string; tamil: string; transliteration?: string };
type Question = {
  english: string;
  correctTamil: string;
  options: string[];
  note?: string;
};

type BankResponse = {
  items: BankItem[];
  myListCount: number;
  defaultCount: number;
};

const API = (process.env.NEXT_PUBLIC_SCAN_API || 'http://localhost:5000').replace(/\/$/, '');
const LS_KEY = 'tamilAR_bank_v1';

const DEFAULT_WORDS: BankItem[] = [
  { english: 'apple', tamil: 'ஆப்பிள்' },
  { english: 'book', tamil: 'புத்தகம்' },
  { english: 'pen', tamil: 'பேனா' },
  { english: 'table', tamil: 'மேசை' },
  { english: 'chair', tamil: 'நாற்காலி' },
  { english: 'door', tamil: 'கதவு' },
  { english: 'window', tamil: 'ஜன்னல்' },
  { english: 'water', tamil: 'தண்ணீர்' },
  { english: 'milk', tamil: 'பால்' },
  { english: 'rice', tamil: 'அரிசி' },
];

function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}

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
    myListCount: typeof obj.myListCount === 'number' ? obj.myListCount : (obj.items?.length ?? 0),
    defaultCount: typeof obj.defaultCount === 'number' ? obj.defaultCount : DEFAULT_WORDS.length,
  };
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
        setError('Using local words (server unavailable).');
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
      alert('Not enough words to build options. Add more words to "My List" first.');
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
    setStarted(true);
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
      <h1 className="text-2xl font-bold text-slate-900">Practice Quiz</h1>

      {!started && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div className="bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4">
            <p className="text-slate-700">
              Choose the correct <span className="font-bold text-violet-700">Tamil</span> word for each{' '}
              <span className="font-bold text-violet-700">English</span> word shown.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <label className="text-slate-700 font-medium">Number of questions</label>
              <select
                value={qCount}
                onChange={(e) =>
                  setQCount(Math.min(Math.max(parseInt(e.target.value, 10), 5), 800))
                }
                className="rounded-lg border-2 border-slate-300 px-4 py-2 focus:border-cyan-500 focus:outline-none"
              >
                {[10, 15, 20, 25, 30, 40, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <label className="inline-flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-cyan-500 hover:bg-cyan-50 transition-all cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                checked={includeSaved}
                onChange={(e) => setIncludeSaved(e.target.checked)}
              />
              <div className="flex-1">
                <div className="font-medium text-slate-900">Include "My List" words</div>
                <div className="text-sm text-slate-600">
                  Combine your saved words with default vocabulary
                </div>
              </div>
              <div className="bg-cyan-100 text-cyan-700 rounded-full px-3 py-1 text-sm font-medium">
                {savedCount} words
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-slate-500">
              Default bank: {defaultCountForDisplay} • My List: {savedCount}
            </div>
            <button
              onClick={startQuiz}
              disabled={pool.length < 4}
              className={`px-8 py-3 rounded-full font-bold text-white transition-all ${
                pool.length < 4
                  ? 'bg-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:shadow-lg hover:scale-105 active:scale-95'
              }`}
            >
              Start Quiz
            </button>
          </div>

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              {error}
            </div>
          )}
          {pool.length < 4 && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm text-rose-700">
              You need at least 4 words to generate choices. Add more to "My List" on the Scan page.
            </div>
          )}
        </div>
      )}

      {started && !done && current && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-slate-600">
                Question <span className="font-bold text-cyan-600">{index + 1}</span>/{questions.length}
              </span>
              <span className="text-sm text-slate-600">
                Score: <span className="font-bold text-cyan-600">{score}</span>
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>

          <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border-2 border-cyan-200 rounded-2xl p-6 text-center">
            <div className="text-sm uppercase tracking-wide text-cyan-600 mb-2 font-medium">English</div>
            <div className="text-4xl font-bold text-slate-900">{current.english}</div>
            {current.note && (
              <div className="mt-3 text-sm text-slate-600 bg-white/60 rounded-full px-4 py-1.5 inline-block">
                Hint: {current.note}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {current.options.map((opt) => {
              const picked = selected === opt;
              const isCorrect = opt === current.correctTamil;
              const show = !!selected;
              const classes = [
                'w-full text-left rounded-xl border-2 px-6 py-4 font-semibold transition-all',
                show && isCorrect
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-lg scale-105'
                  : show && picked && !isCorrect
                  ? 'border-rose-500 bg-rose-50 text-rose-800'
                  : 'border-slate-300 hover:border-cyan-500 hover:bg-cyan-50 bg-white text-slate-900 hover:scale-102',
              ].join(' ');
              return (
                <button key={opt} onClick={() => choose(opt)} className={classes} disabled={!!selected}>
                  <span className="text-2xl">{opt}</span>
                  {show && isCorrect && <span className="ml-2 text-emerald-600">✓</span>}
                  {show && picked && !isCorrect && <span className="ml-2 text-rose-600">✗</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {done && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl p-8 text-white shadow-xl">
            <div className="text-center">
              <div className="text-6xl mb-3">
                {score / questions.length >= 0.9 ? '🎉' : score / questions.length >= 0.7 ? '👏' : '💪'}
              </div>
              <h2 className="text-3xl font-bold mb-2">Quiz Complete!</h2>
              <div className="text-5xl font-bold my-4">
                {score}/{questions.length}
              </div>
              <div className="text-xl text-cyan-50">
                {Math.round((score / questions.length) * 100)}% correct
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Review</h3>
            <div className="space-y-2">
              {review.map((r, i) => {
                const correct = r.picked === r.correct;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 ${
                      correct
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-rose-200 bg-rose-50'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white bg-slate-400">
                      {i + 1}
                    </div>
                    <div className="flex-1 grid sm:grid-cols-3 gap-2">
                      <div>
                        <div className="text-xs text-slate-600">English</div>
                        <div className="font-medium">{r.english}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600">Your answer</div>
                        <div className={`font-medium ${correct ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {r.picked ?? '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-600">Correct answer</div>
                        <div className="font-bold text-slate-900">{r.correct}</div>
                      </div>
                    </div>
                    <div className="text-2xl">
                      {correct ? '✓' : '✗'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={startQuiz}
              className="px-6 py-3 rounded-full bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold hover:shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              Try Again
            </button>
            <button
              onClick={reset}
              className="px-6 py-3 rounded-full border-2 border-slate-300 bg-white font-semibold hover:border-cyan-500 hover:bg-cyan-50 transition-all"
            >
              Change Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}