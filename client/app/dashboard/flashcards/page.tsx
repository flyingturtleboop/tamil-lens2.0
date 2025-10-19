'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { RotateCcw, ChevronLeft, ChevronRight, Volume2, Check, X, Star, Plus, Filter } from 'lucide-react';

type BankItem = { 
  english: string; 
  tamil: string; 
  transliteration?: string;
};

type BankResponse = {
  items: BankItem[];
  myListCount: number;
  defaultCount: number;
};

type CardProgress = {
  correct: number;
  incorrect: number;
  lastReviewed?: number;
};

const API = (process.env.NEXT_PUBLIC_SCAN_API || 'http://localhost:5000').replace(/\/$/, '');
const LS_KEY = 'tamilAR_bank_v1';
const PROGRESS_KEY = 'tamilAR_progress_v1';

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

function lsLoadScanned(): BankItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? (JSON.parse(raw) as BankItem[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function lsSaveScanned(arr: BankItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, 600)));
}

function lsLoadProgress(): Record<string, CardProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function lsSaveProgress(progress: Record<string, CardProgress>) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
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

async function apiAddWord(item: BankItem): Promise<'added' | 'exists'> {
  const atk = getAccessToken();
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

async function apiIdentify(english: string): Promise<{ tamil: string; transliteration?: string }> {
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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function mergeWords(defaults: BankItem[], scanned: BankItem[]): BankItem[] {
  const seen = new Set<string>();
  const all: BankItem[] = [];
  
  for (const word of [...scanned, ...defaults]) {
    const key = `${word.english.trim().toLowerCase()}|${word.tamil.trim()}`;
    if (!seen.has(key) && word.english && word.tamil) {
      seen.add(key);
      all.push(word);
    }
  }
  
  return all;
}

export default function FlashcardsPage() {
  const [allCards, setAllCards] = useState<BankItem[]>([]);
  const [defaultCards] = useState<BankItem[]>(DEFAULT_WORDS);
  const [scannedCards, setScannedCards] = useState<BankItem[]>([]);
  
  const [cards, setCards] = useState<BankItem[]>([]);
  const [progress, setProgress] = useState<Record<string, CardProgress>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionStats, setSessionStats] = useState({ correct: 0, incorrect: 0 });
  const [showingTamil, setShowingTamil] = useState(true);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEnglish, setNewEnglish] = useState('');
  const [addingWord, setAddingWord] = useState(false);
  const [translating, setTranslating] = useState(false);
  
  const [includeDefault, setIncludeDefault] = useState(true);
  const [includeScanned, setIncludeScanned] = useState(true);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const loadWords = useCallback(async () => {
    try {
      const serverData = await apiLoad();
      setScannedCards(serverData.items || []);
      lsSaveScanned(serverData.items || []);
    } catch {
      const localScanned = lsLoadScanned();
      setScannedCards(localScanned);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      await loadWords();
      if (mounted) {
        setProgress(lsLoadProgress());
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [loadWords]);

  useEffect(() => {
    const merged = mergeWords(
      includeDefault ? defaultCards : [],
      includeScanned ? scannedCards : []
    );
    
    setAllCards(merged);
    setCards(shuffle(merged));
    setCurrentIndex(0);
    setFlipped(false);
  }, [defaultCards, scannedCards, includeDefault, includeScanned]);

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

  const currentCard = cards[currentIndex];
  const cardKey = currentCard ? `${currentCard.english}|${currentCard.tamil}` : '';
  const cardProgress = progress[cardKey] || { correct: 0, incorrect: 0 };

  const handleKnow = useCallback(() => {
    if (!currentCard) return;
    
    const newProgress = {
      ...progress,
      [cardKey]: {
        correct: cardProgress.correct + 1,
        incorrect: cardProgress.incorrect,
        lastReviewed: Date.now(),
      },
    };
    setProgress(newProgress);
    lsSaveProgress(newProgress);
    setSessionStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    
    ping(880, 0.08, 0.04);
    
    setTimeout(() => {
      setFlipped(false);
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setCurrentIndex(0);
        setCards(shuffle(cards));
      }
    }, 300);
  }, [currentCard, cardKey, cardProgress, progress, currentIndex, cards, ping]);

  const handleDontKnow = useCallback(() => {
    if (!currentCard) return;
    
    const newProgress = {
      ...progress,
      [cardKey]: {
        correct: cardProgress.correct,
        incorrect: cardProgress.incorrect + 1,
        lastReviewed: Date.now(),
      },
    };
    setProgress(newProgress);
    lsSaveProgress(newProgress);
    setSessionStats(prev => ({ ...prev, incorrect: prev.incorrect + 1 }));
    
    ping(420, 0.08, 0.04);
    
    setTimeout(() => {
      setFlipped(false);
      if (currentIndex < cards.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setCurrentIndex(0);
        setCards(shuffle(cards));
      }
    }, 300);
  }, [currentCard, cardKey, cardProgress, progress, currentIndex, cards, ping]);

  const handleFlip = () => {
    setFlipped(!flipped);
    ping(660, 0.05, 0.02);
  };

  const goNext = () => {
    setFlipped(false);
    ping(520, 0.05, 0.02);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const goPrev = () => {
    setFlipped(false);
    ping(520, 0.05, 0.02);
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else {
      setCurrentIndex(cards.length - 1);
    }
  };

  const resetSession = () => {
    setSessionStats({ correct: 0, incorrect: 0 });
    setCurrentIndex(0);
    setFlipped(false);
    setCards(shuffle(allCards));
    ping(660, 0.09, 0.03);
  };

  const toggleSide = () => {
    setShowingTamil(!showingTamil);
    setFlipped(false);
    ping(520, 0.05, 0.02);
  };

  const handleAddCustom = async () => {
    if (!newEnglish.trim()) return;
    
    setTranslating(true);
    
    try {
      const translation = await apiIdentify(newEnglish.trim());
      
      if (!translation.tamil) {
        alert('Could not translate this word. Please try again.');
        setTranslating(false);
        return;
      }

      setAddingWord(true);
      
      const newWord: BankItem = {
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
        const updated = [...scannedCards, newWord];
        setScannedCards(updated);
        lsSaveScanned(updated);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your flashcards...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center max-w-md">
          <Star className="w-20 h-20 mx-auto mb-4 text-slate-300" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No Cards Selected</h2>
          <p className="text-slate-600 mb-6">
            Enable at least one source (Default or Scanned) to start reviewing flashcards.
          </p>
          <button
            onClick={() => {
              setIncludeDefault(true);
              setIncludeScanned(true);
            }}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-full font-medium hover:shadow-lg transition-all"
          >
            Enable All Sources
          </button>
        </div>
      </div>
    );
  }

  const accuracy = sessionStats.correct + sessionStats.incorrect > 0
    ? Math.round((sessionStats.correct / (sessionStats.correct + sessionStats.incorrect)) * 100)
    : 0;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Flashcards</h1>
            <p className="text-slate-600 mt-1">
              {defaultCards.length} default • {scannedCards.length} scanned • 0 custom
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm font-medium">Add Word</span>
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md border border-slate-200 hover:border-cyan-500 transition-all"
              >
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">Filter</span>
              </button>
              
              {showFilterMenu && (
                <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-64 z-10">
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeDefault}
                        onChange={(e) => setIncludeDefault(e.target.checked)}
                        className="w-5 h-5 text-cyan-500 rounded"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        Default Words ({defaultCards.length})
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeScanned}
                        onChange={(e) => setIncludeScanned(e.target.checked)}
                        className="w-5 h-5 text-cyan-500 rounded"
                      />
                      <span className="text-sm font-medium text-slate-700">
                        Scanned Words ({scannedCards.length})
                      </span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={false}
                        disabled
                        className="w-5 h-5 text-cyan-500 rounded opacity-50"
                      />
                      <span className="text-sm font-medium text-slate-400">
                        Custom Words (0)
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
            
            <button
              onClick={toggleSide}
              className="px-4 py-2 bg-white rounded-lg shadow-md border border-slate-200 hover:border-cyan-500 transition-all text-sm font-medium"
            >
              {showingTamil ? '1️⃣ Tamil' : '🇺🇸 English'}
            </button>
            
            <button
              onClick={resetSession}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md border border-slate-200 hover:border-cyan-500 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm font-medium">Reset</span>
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-4 border border-slate-200">
            <div className="text-sm text-slate-600 mb-1">Progress</div>
            <div className="text-2xl font-bold text-slate-900">
              {currentIndex + 1}/{cards.length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border border-emerald-200">
            <div className="text-sm text-emerald-600 mb-1">Correct</div>
            <div className="text-2xl font-bold text-emerald-600">{sessionStats.correct}</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border border-rose-200">
            <div className="text-sm text-rose-600 mb-1">Review</div>
            <div className="text-2xl font-bold text-rose-600">{sessionStats.incorrect}</div>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4 border border-cyan-200">
            <div className="text-sm text-cyan-600 mb-1">Accuracy</div>
            <div className="text-2xl font-bold text-cyan-600">{accuracy}%</div>
          </div>
        </div>

        {/* Flashcard with 3D Flip */}
        <div className="relative mb-8" style={{ perspective: '1000px', minHeight: '500px' }}>
          <div 
            className="relative w-full cursor-pointer transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              minHeight: '500px',
            }}
            onClick={handleFlip}
          >
            {/* Front of card */}
            <div 
              className="absolute inset-0 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 p-12 flex flex-col items-center justify-center"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                minHeight: '500px',
              }}
            >
              <div className="text-center">
                <div className="text-7xl font-bold text-slate-900 mb-6">
                  {showingTamil ? currentCard.tamil : currentCard.english}
                </div>
                {currentCard.transliteration && showingTamil && (
                  <div className="text-2xl text-slate-500 mb-4">
                    {currentCard.transliteration}
                  </div>
                )}
                <div className="flex items-center gap-3 justify-center mt-8">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speakTamil(currentCard.tamil);
                    }}
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 text-white flex items-center justify-center hover:shadow-lg transition-all hover:scale-110"
                  >
                    <Volume2 className="w-7 h-7" />
                  </button>
                </div>
                <div className="mt-12 text-slate-400 text-base">Tap to reveal</div>
              </div>
            </div>

            {/* Back of card */}
            <div 
              className="absolute inset-0 bg-white rounded-2xl shadow-2xl border-2 border-cyan-300 p-12 flex flex-col items-center justify-center"
              style={{
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
                minHeight: '500px',
              }}
            >
              <div className="text-center w-full">
                <div className="text-7xl font-bold text-cyan-600 mb-8">
                  {showingTamil ? currentCard.english : currentCard.tamil}
                </div>
                {currentCard.transliteration && !showingTamil && (
                  <div className="text-2xl text-slate-500 mb-8">
                    {currentCard.transliteration}
                  </div>
                )}
                <div className="flex items-center gap-4 justify-center mt-12">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDontKnow();
                    }}
                    className="flex items-center gap-2 px-8 py-4 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95"
                  >
                    <X className="w-6 h-6" />
                    Review Again
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleKnow();
                    }}
                    className="flex items-center gap-2 px-8 py-4 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl font-bold text-lg transition-all hover:scale-105 active:scale-95"
                  >
                    <Check className="w-6 h-6" />
                    I Know This
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card Progress Indicator */}
          {cardProgress.correct + cardProgress.incorrect > 0 && (
            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-lg rounded-full px-4 py-2 shadow-lg border border-slate-200 z-10">
              <span className="text-sm text-emerald-600 font-medium">
                ✓ {cardProgress.correct}
              </span>
              <span className="text-slate-300 mx-2">•</span>
              <span className="text-sm text-rose-600 font-medium">
                ✗ {cardProgress.incorrect}
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={goPrev}
            className="w-14 h-14 rounded-full bg-white shadow-lg border-2 border-slate-200 hover:border-cyan-500 flex items-center justify-center transition-all hover:scale-110"
          >
            <ChevronLeft className="w-6 h-6 text-slate-700" />
          </button>
          
          <div className="text-slate-600 font-medium">
            Card {currentIndex + 1} of {cards.length}
          </div>
          
          <button
            onClick={goNext}
            className="w-14 h-14 rounded-full bg-white shadow-lg border-2 border-slate-200 hover:border-cyan-500 flex items-center justify-center transition-all hover:scale-110"
          >
            <ChevronRight className="w-6 h-6 text-slate-700" />
          </button>
        </div>
      </div>

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
                      handleAddCustom();
                    }
                  }}
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
                onClick={handleAddCustom}
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