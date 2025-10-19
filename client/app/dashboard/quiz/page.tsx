'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, X, RotateCcw, Trophy, Volume2 } from 'lucide-react';

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
    const j = Math.floor(Math.random() * (i + 1));
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

  const [pool, setPool] = useState<BankItem[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      const defaults = DEFAULT_WORDS.map((w) => ({ english: w.english, tamil: w.tamil }));
      try {
        const server = await apiLoad();
        if (!mounted) return;
        setSavedCount(server.myListCount || 0);
        const merged = includeSaved ? mergePool(defaults, server.items || []) : defaults;
        setPool(merged);
      } catch (e) {
        const local = lsLoad();
        if (!mounted) return;
        setSavedCount(local.length);
        const merged = includeSaved ? mergePool(defaults, local) : defaults;
        setPool(merged);
        setError('Using local words (server unavailable)');
      }
    })();
    return () => {
      mounted = false;
    };
  }, [includeSaved]);

  const ping = useCallback((freq = 880, dur = 0.06, vol = 0.03) => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch (e) {
      console.error('Audio error:', e);
    }
  }, []);

  const speakTamil = useCallback((text?: string) => {
    if (!text) return;
    try {
      const utter = new SpeechSynthesisUtterance(text);
      const trySpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const ta = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ta'));
        if (ta) utter.voice = ta;
        utter.lang = (ta && ta.lang) || 'ta-IN';
        utter.rate = 0.9;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      };
      const voices = window.speechSynthesis.getVoices();
      if (!voices?.length) {
        const onVoices = () => {
          trySpeak();
          window.speechSynthesis.removeEventListener('voiceschanged', onVoices);
        };
        window.speechSynthesis.addEventListener('voiceschanged', onVoices);
        setTimeout(trySpeak, 300);
      } else {
        trySpeak();
      }
    } catch (e) {
      console.error('Speech synthesis error:', e);
    }
  }, []);

  const startQuiz = () => {
    if (pool.length === 0) {
      alert('No words available. Please add some words first!');
      return;
    }
    const qs = buildQuiz(qCount, pool);
    setQuestions(qs);
    setIndex(0);
    setScore(0);
    setSelected(null);
    setDone(false);
    setShowAnswer(false);
    setStarted(true);
    ping(660, 0.09, 0.03);
  };

  const handleSelect = (option: string) => {
    if (selected) return;
    setSelected(option);
    setShowAnswer(true);
    
    const correct = option === questions[index].correctTamil;
    if (correct) {
      setScore(score + 1);
      ping(880, 0.08, 0.04);
    } else {
      ping(420, 0.08, 0.04);
    }
  };

  const handleNext = () => {
    if (index < questions.length - 1) {
      setIndex(index + 1);
      setSelected(null);
      setShowAnswer(false);
      ping(520, 0.05, 0.02);
    } else {
      setDone(true);
      ping(990, 0.12, 0.05);
    }
  };

  const restart = () => {
    setStarted(false);
    setDone(false);
    setIndex(0);
    setScore(0);
    setSelected(null);
    setShowAnswer(false);
    ping(660, 0.09, 0.03);
  };

  if (!started) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Practice Quiz</h1>
          <p className="text-slate-600 mb-8">
            Choose the correct <span className="font-semibold text-purple-600">Tamil</span> word for each{' '}
            <span className="font-semibold text-blue-600">English</span> word shown.
          </p>

          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 mb-6">
              ⚠️ {error}
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Number of questions
              </label>
              <select
                value={qCount}
                onChange={(e) => setQCount(parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-cyan-500 focus:outline-none text-slate-900"
              >
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
                <option value={15}>15 questions</option>
                <option value={20}>20 questions</option>
              </select>
            </div>

            <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-4 border border-cyan-200">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSaved}
                  onChange={(e) => setIncludeSaved(e.target.checked)}
                  className="w-5 h-5 text-cyan-500 rounded mt-0.5"
                />
                <div className="flex-1">
                  <div className="font-medium text-slate-900">Include "My List" words</div>
                  <div className="text-sm text-slate-600">
                    Combine your saved words with default vocabulary
                  </div>
                  <div className="text-sm text-cyan-600 font-medium mt-1">
                    {savedCount} saved word{savedCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </label>
            </div>

            <div className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4">
              <div className="font-medium text-slate-700 mb-1">Quiz Pool:</div>
              Default bank: {DEFAULT_WORDS.length} • My List: {savedCount}
              {!includeSaved && ' (disabled)'}
            </div>

            <button
              onClick={startQuiz}
              disabled={pool.length === 0}
              className="w-full px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Start Quiz
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200 p-8 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Quiz Complete!</h2>
            <p className="text-slate-600 mb-8">Great job practicing your Tamil vocabulary</p>

            <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-2xl p-6 mb-8">
              <div className="text-6xl font-bold text-cyan-600 mb-2">{percentage}%</div>
              <div className="text-lg text-slate-700">
                {score} out of {questions.length} correct
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={restart}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                <RotateCcw className="w-5 h-5" />
                Try Again
              </button>
              <a
                href="/dashboard"
                className="w-full block text-center px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-all"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const isCorrect = selected === q.correctTamil;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span>Question {index + 1} of {questions.length}</span>
            <span>Score: {score}/{questions.length}</span>
          </div>
          <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-300"
              style={{ width: `${((index + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-200 p-8 mb-6">
          <div className="text-center mb-8">
            <div className="text-sm font-medium text-slate-500 mb-3">What is the Tamil word for:</div>
            <div className="text-5xl font-bold text-slate-900 mb-4">{q.english}</div>
            {q.note && showAnswer && (
              <div className="text-lg text-slate-500">{q.note}</div>
            )}
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 gap-3">
            {q.options.map((opt, i) => {
              const isSelected = selected === opt;
              const isCorrectAnswer = opt === q.correctTamil;
              
              let bgColor = 'bg-white border-slate-300 hover:border-cyan-500 hover:bg-cyan-50';
              if (showAnswer) {
                if (isCorrectAnswer) {
                  bgColor = 'bg-emerald-100 border-emerald-500';
                } else if (isSelected && !isCorrect) {
                  bgColor = 'bg-rose-100 border-rose-500';
                } else {
                  bgColor = 'bg-slate-50 border-slate-200';
                }
              } else if (isSelected) {
                bgColor = 'bg-cyan-100 border-cyan-500';
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelect(opt)}
                  disabled={!!selected}
                  className={`flex items-center justify-between px-6 py-5 rounded-xl border-2 transition-all text-left ${bgColor} ${
                    selected ? 'cursor-default' : 'cursor-pointer hover:scale-102'
                  }`}
                >
                  <span className="text-3xl font-bold text-slate-900">{opt}</span>
                  {showAnswer && (
                    <span>
                      {isCorrectAnswer && <Check className="w-7 h-7 text-emerald-600" />}
                      {isSelected && !isCorrect && <X className="w-7 h-7 text-rose-600" />}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        {showAnswer && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => speakTamil(q.correctTamil)}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-white border-2 border-slate-200 hover:border-cyan-500 text-slate-700 rounded-xl font-medium transition-all hover:scale-105"
            >
              <Volume2 className="w-5 h-5" />
              Hear Pronunciation
            </button>
            <button
              onClick={handleNext}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all hover:scale-105 active:scale-95"
            >
              {index < questions.length - 1 ? 'Next Question' : 'Finish Quiz'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}