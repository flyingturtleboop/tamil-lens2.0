'use client';

import { useEffect, useState, useCallback } from 'react';
import { Trash2, Volume2, Plus, Search } from 'lucide-react';

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

function saveLocal(items: Item[]) {
  const arr = items.filter(w => w.id < 0).map(({ id, ...rest }) => rest);
  localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, 600)));
}

async function apiAddWord(item: { english: string; tamil: string; transliteration?: string }): Promise<'added' | 'exists'> {
  const atk = getToken();
  const res = await fetch(`${API}/api/bank`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(atk ? { Authorization: `Bearer ${atk}` } : {}),
    },
    body: JSON.stringify(item),
  });
  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('server');
  const j = await res.json();
  return (j.status as 'added' | 'exists') ?? 'added';
}

async function apiTranslate(english: string): Promise<{ tamil: string; transliteration?: string }> {
  const res = await fetch(`${API}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: english }),
  });
  if (!res.ok) throw new Error('Translation failed');
  const data = await res.json();
  return {
    tamil: data.tamil || '',
    transliteration: data.transliteration,
  };
}

export default function WordsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEnglish, setNewEnglish] = useState('');
  const [translating, setTranslating] = useState(false);
  const [addingWord, setAddingWord] = useState(false);

  const loadWords = useCallback(async () => {
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
      setItems(rows);
      saveLocal(rows);
    } catch {
      setItems(loadLocal());
      setError('Offline mode (local list)');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    loadWords().then(() => {
      if (!mounted) return;
    });
    return () => {
      mounted = false;
    };
  }, [loadWords]);

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

  const onDelete = async (id: number) => {
    if (!confirm('Delete this word?')) return;
    
    ping(420, 0.08, 0.04);
    
    if (id < 0) {
      const updated = items.filter((w) => w.id !== id);
      setItems(updated);
      saveLocal(updated);
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
    try {
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
    } catch (e) {
      console.error('Speech synthesis error:', e);
    }
  };

  const handleAddWord = async () => {
    if (!newEnglish.trim()) return;
    
    setTranslating(true);
    
    try {
      const translation = await apiTranslate(newEnglish.trim());
      
      if (!translation.tamil) {
        alert('Could not translate this word. Please try again.');
        setTranslating(false);
        return;
      }

      setAddingWord(true);
      
      const newWord = {
        english: newEnglish.trim(),
        tamil: translation.tamil,
        transliteration: translation.transliteration,
      };
      
      try {
        const status = await apiAddWord(newWord);
        await loadWords();
        ping(status === 'added' ? 880 : 660, 0.08, 0.04);
        
        setNewEnglish('');
        setShowAddModal(false);
      } catch (error) {
        // Fallback to local storage
        const localItem = {
          id: -(items.length + 1),
          ...newWord
        };
        const updated = [localItem, ...items];
        setItems(updated);
        saveLocal(updated);
        ping(880, 0.08, 0.04);
        
        setNewEnglish('');
        setShowAddModal(false);
      }
    } catch (error) {
      alert('Translation failed. Please check your connection and try again.');
    } finally {
      setTranslating(false);
      setAddingWord(false);
    }
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Word</span>
          </button>
          <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-full px-4 py-1.5">
            <span className="text-sm text-slate-700">
              Total: <span className="font-bold text-cyan-600">{items.length}</span>
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search words..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-slate-300 focus:border-cyan-500 focus:outline-none text-slate-900 placeholder-slate-400"
          />
        </div>
      </div>

      {filtered.length === 0 && items.length === 0 && (
        <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border-2 border-dashed border-cyan-300 rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4">📸</div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">No words yet</h3>
          <p className="text-slate-600 mb-4">
            Start scanning objects or add words manually to build your Tamil vocabulary!
          </p>
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-bold rounded-full hover:shadow-lg transition-all hover:scale-105"
          >
            Add Your First Word
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

      {/* Add Word Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Add Word</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">English Word</label>
                <input
                  type="text"
                  value={newEnglish}
                  onChange={(e) => setNewEnglish(e.target.value)}
                  placeholder="e.g., hello"
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !translating && !addingWord) {
                      handleAddWord();
                    }
                  }}
                  autoFocus
                />
                <p className="text-xs text-slate-500 mt-2">
                  Tamil translation and transliteration will be automatically generated
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={translating || addingWord}
                className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWord}
                disabled={!newEnglish.trim() || translating || addingWord}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {translating ? 'Translating...' : addingWord ? 'Adding...' : 'Add Word'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}