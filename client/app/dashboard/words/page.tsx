'use client';

import { useEffect, useState } from 'react';
import { Trash2, Volume2 } from 'lucide-react';

type Item = { id: number; english: string; tamil: string; transliteration?: string };

const API = (process.env.NEXT_PUBLIC_SCAN_API || 'http://localhost:5000').replace(/\/$/, '');
const LS_KEY = 'tamilAR_bank_v1';

function getToken() {
  return localStorage.getItem('access_token');
}

function loadLocal(): Item[] {
  try {
    const arr = JSON.parse(localStorage.getItem(LS_KEY) || '[]') as any[];
    return (Array.isArray(arr) ? arr : []).map((w, i) => ({ id: -i - 1, ...w }));
  } catch {
    return [];
  }
}

export default function WordsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setError(null);
      const t = getToken();
      try {
        const r = await fetch(`${API}/api/bank`, {
          headers: t ? { Authorization: `Bearer ${t}` } : {},
          credentials: 'include',
        });
        if (!r.ok) throw new Error('server');
        const j = await r.json();
        const rows = Array.isArray(j) ? j : j.items || [];
        if (mounted) setItems(rows);
      } catch {
        if (mounted) {
          setItems(loadLocal());
          setError('Offline mode (local list)');
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onDelete = async (id: number) => {
    if (!confirm('Delete this word?')) return;
    
    if (id < 0) {
      setItems((prev) => prev.filter((w) => w.id !== id));
      return;
    }
    const t = getToken();
    if (!t) return;
    const r = await fetch(`${API}/api/bank/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` },
      credentials: 'include',
    });
    if (r.ok) {
      setItems((prev) => prev.filter((w) => w.id !== id));
    }
  };

  const speakTamil = (text: string) => {
    const utter = new SpeechSynthesisUtterance(text);
    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const ta = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith('ta'));
      if (ta) utter.voice = ta;
      utter.lang = (ta && ta.lang) || 'ta-IN';
      utter.rate = 0.95;
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
    } else trySpeak();
  };

  const filtered = items.filter(
    (w) =>
      w.english.toLowerCase().includes(filter.toLowerCase()) ||
      w.tamil.includes(filter) ||
      (w.transliteration || '').toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">My Word List</h1>
        <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-full px-4 py-1.5">
          <span className="text-sm text-slate-700">
            Total: <span className="font-bold text-cyan-600">{items.length}</span>
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <input
          type="text"
          placeholder="Search words..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border-2 border-slate-300 focus:border-cyan-500 focus:outline-none text-slate-900 placeholder-slate-400"
        />
      </div>

      {filtered.length === 0 && items.length === 0 && (
        <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border-2 border-dashed border-cyan-300 rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">📸</div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No words yet</h3>
          <p className="text-slate-600 mb-4">
            Start scanning objects to build your Tamil vocabulary!
          </p>
          <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-full hover:shadow-lg transition-all hover:scale-105">
            Go to Scan Page
          </button>
        </div>
      )}

      {filtered.length === 0 && items.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <p className="text-slate-600">No words match your search.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((w) => (
          <div
            key={w.id}
            className="bg-white rounded-xl border-2 border-slate-200 p-5 hover:border-cyan-500 hover:shadow-lg transition-all group"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="text-3xl font-extrabold text-slate-900 mb-1 leading-tight">
                  {w.tamil}
                </div>
                {w.transliteration && (
                  <div className="text-sm text-slate-600 mb-1">{w.transliteration}</div>
                )}
                <div className="text-sm text-slate-500">{w.english}</div>
              </div>
              <button
                onClick={() => speakTamil(w.tamil)}
                className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 text-white flex items-center justify-center hover:shadow-lg transition-all hover:scale-110 active:scale-95"
                title="Speak"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={() => onDelete(w.id)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-slate-200 hover:border-rose-500 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-medium transition-all"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        ))}
      </div>

      {filtered.length > 0 && (
        <div className="text-center text-sm text-slate-500">
          Showing {filtered.length} of {items.length} words
        </div>
      )}
    </div>
  );
}