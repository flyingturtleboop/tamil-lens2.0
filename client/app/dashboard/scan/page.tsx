'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

type IdentifyResult = {
  tamil?: string;
  transliteration?: string;
  english?: string;
  partOfSpeech?: string | null;
  confidence?: number | null;
};

type HistoryItem = {
  url: string;
  tamil: string;
  translit: string;
  english: string;
  confidence: number | null;
};

type BankItem = { english: string; tamil: string; transliteration?: string };
type BankResponse = {
  items: BankItem[];
  myListCount: number;
  defaultCount: number;
};

const API = (process.env.NEXT_PUBLIC_SCAN_API || 'http://localhost:5000').replace(/\/$/, '');
const LS_KEY = 'tamilAR_bank_v1';

function getAccessToken(): string | null {
  return localStorage.getItem('access_token');
}


/* ---------------- Local bank (fallback) ---------------- */
function lsLoad(): BankItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? (JSON.parse(raw) as BankItem[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}
function lsSave(arr: BankItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(arr.slice(0, 600)));
}
function lsAdd(item: BankItem): { added: boolean; total: number } {
  const bank = lsLoad();
  const exists = bank.some(
    (w) =>
      w.english.trim().toLowerCase() === item.english.trim().toLowerCase() ||
      w.tamil.trim() === item.tamil.trim()
  );
  if (!exists && item.english && item.tamil) {
    bank.unshift(item);
    lsSave(bank);
    return { added: true, total: bank.length };
  }
  return { added: false, total: bank.length };
}

/* ---------------- Server bank helpers ---------------- */
async function apiAdd(item: BankItem): Promise<'added' | 'exists'> {
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


async function apiCount(): Promise<number> {
  const atk = getAccessToken();
  const res = await fetch(`${API}/api/bank`, {
    method: 'GET',
    credentials: 'include',
    headers: atk ? { Authorization: `Bearer ${atk}` } : {},
  });

  if (res.status === 401) throw new Error('unauthorized');
  if (!res.ok) throw new Error('server');

  // Support both new {items,myListCount,...} and legacy array responses
  const data = await res.json();
  if (Array.isArray(data)) return data.length;

  const obj = data as { items?: BankItem[]; myListCount?: number };
  if (typeof obj.myListCount === 'number') return obj.myListCount;
  return Array.isArray(obj.items) ? obj.items.length : 0;
}


/* ---------------- Component ---------------- */
export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const [hint, setHint] = useState('Start camera, then Capture.');
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [overlay, setOverlay] = useState<IdentifyResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bankCount, setBankCount] = useState<number>(0);
  const [justSaved, setJustSaved] = useState<null | 'ok' | 'dup' | 'err'>(null);

  /* init count */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const n = await apiCount();
        if (mounted) setBankCount(n);
      } catch {
        if (mounted) setBankCount(lsLoad().length);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /* tiny UI sounds (subtle, neutral) */
  const ping = useCallback((freq = 880, dur = 0.06, vol = 0.03) => {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
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
    } catch {}
  }, []);
  const chime = useCallback(() => {
    ping(660, 0.09, 0.03);
    setTimeout(() => ping(990, 0.09, 0.03), 90);
  }, [ping]);

  /* browser TTS */
  const speakTamil = useCallback((text?: string) => {
    if (!text) return;
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
  }, []);

  /* camera */
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);
  useEffect(() => stopStream, [stopStream]);

  const startCamera = useCallback(async () => {
    try {
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setHint('Camera ready. Press Capture (or C).');
      ping(520, 0.05, 0.02);
    } catch (e: any) {
      alert('Camera error: ' + e.message);
    }
  }, [ping, stopStream]);

  const capture = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !vid.videoWidth) {
      alert('Camera not ready.');
      return;
    }
    const can = document.createElement('canvas');
    can.width = vid.videoWidth;
    can.height = vid.videoHeight;
    const ctx = can.getContext('2d')!;
    ctx.drawImage(vid, 0, 0, can.width, can.height);
    can.toBlob(
      (b) => {
        if (!b) return;
        blobRef.current = b;
        const url = URL.createObjectURL(b);
        setPreviewUrl(url);
        setOverlay(null);
        setJustSaved(null);
        setHint('Captured. Press Identify (or I).');
        ping(660, 0.05, 0.02);
      },
      'image/jpeg',
      0.9
    );
  }, [ping]);

  const identify = useCallback(async () => {
    if (!blobRef.current) {
      alert('Capture first.');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('image', blobRef.current, 'capture.jpg');
      const res = await fetch(`${API}/api/identify`, {
        method: 'POST',
        body: fd,
      });
      const j: IdentifyResult & { detail?: string } = await res.json();
      setLoading(false);
      if (!res.ok) {
        alert(j.detail || 'Identify failed');
        return;
      }
      setOverlay(j);
      setJustSaved(null);
      setHistory((prev) => {
        const item: HistoryItem = {
          url: previewUrl,
          tamil: j.tamil || '—',
          translit: j.transliteration || '—',
          english: j.english || '—',
          confidence:
            typeof j.confidence === 'number' ? Math.round(j.confidence * 100) : null,
        };
        return [item, ...prev].slice(0, 8);
      });
      chime();
    } catch (e: any) {
      setLoading(false);
      alert(e.message || 'Network error');
    }
  }, [previewUrl, chime]);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'c') {
        e.preventDefault();
        capture();
      } else if (k === 'i') {
        e.preventDefault();
        identify();
      } else if (k === 's' || e.code === 'Space') {
        e.preventDefault();
        speakTamil(overlay?.tamil);
      } else if (k === 'a') {
        e.preventDefault();
        if (overlay?.english && overlay?.tamil) onAdd();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [capture, identify, speakTamil, overlay]);

  const onAdd = async () => {
    if (!overlay?.english || !overlay?.tamil) return;
    const item: BankItem = {
      english: overlay.english,
      tamil: overlay.tamil,
      transliteration: overlay.transliteration,
    };
    try {
      const s = await apiAdd(item);
      setJustSaved(s === 'added' ? 'ok' : 'dup');
      try {
        const n = await apiCount();
        setBankCount(n);
      } catch {}
      ping(s === 'added' ? 880 : 420, 0.08, 0.04);
    } catch {
      const { added, total } = lsAdd(item);
      setBankCount(total);
      setJustSaved(added ? 'ok' : 'dup');
      ping(added ? 880 : 420, 0.08, 0.04);
    } finally {
      setTimeout(() => setJustSaved(null), 1200);
    }
  };

  const pct =
    typeof overlay?.confidence === 'number'
      ? Math.round((overlay.confidence as number) * 100)
      : null;

  // Use previewUrl to enable Identify (ref changes don't re-render)
  const canIdentify = !!previewUrl && !loading;

  /* ---------------- UI (neutral style) ---------------- */
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="font-bold">Tamil-AR</div>
          <div className="text-sm text-slate-600 flex items-center gap-3">
            <span>
              Shortcuts:&nbsp;
              <kbd className="rounded border px-2 py-0.5">C</kbd> Capture
              <kbd className="rounded border px-2 py-0.5 ml-2">I</kbd> Identify
              <kbd className="rounded border px-2 py-0.5 ml-2">S</kbd>/
              <kbd className="rounded border px-2 py-0.5">Space</kbd> Speak
              <kbd className="rounded border px-2 py-0.5 ml-2">A</kbd> Add
            </span>
            <span className="rounded-full border bg-slate-50 px-3 py-1 text-xs">
              My List: <b>{bankCount}</b>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <p className="mb-3 text-sm text-slate-600">
          Backend: <code>{API}</code> • TTS: browser <code>speechSynthesis</code>
        </p>

        <div className="grid gap-4 lg:grid-cols-[1fr,260px]">
          {/* Main */}
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            {/* Toolbar */}
            <div className="mb-3 flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-2">
                <button
                  className="rounded-lg border bg-white px-4 py-2 font-semibold hover:bg-slate-50"
                  onClick={startCamera}
                >
                  Start Camera
                </button>
                <button
                  className="rounded-lg border bg-white px-4 py-2 font-semibold hover:bg-slate-50 disabled:opacity-60"
                  onClick={capture}
                  disabled={!streamRef.current}
                  title={!streamRef.current ? 'Start camera first' : undefined}
                >
                  Capture
                </button>
                <button
                  className="rounded-lg border bg-white px-4 py-2 font-semibold hover:bg-slate-50 disabled:opacity-60"
                  onClick={identify}
                  disabled={!canIdentify}
                  title={!canIdentify ? 'Capture first' : undefined}
                >
                  {loading ? 'Identifying…' : 'Identify'}
                </button>
              </div>
              <span className="text-slate-600">{hint}</span>
            </div>

            {/* Live */}
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg border bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
              />
              {loading && (
                <div className="pointer-events-none absolute left-0 right-0 top-0 h-[3px] bg-slate-300 animate-pulse" />
              )}
            </div>

            {/* Captured */}
            <div className="mt-3 relative aspect-[16/9] overflow-hidden rounded-lg border bg-black">
              {previewUrl && (
                <img src={previewUrl} alt="capture" className="h-full w-full object-cover" />
              )}
              {overlay && (overlay.english || typeof overlay.confidence === 'number') && (
                <span className="absolute right-3 top-3 rounded-full border bg-white/80 px-3 py-1 text-xs">
                  {overlay.english}
                  {typeof pct === 'number' ? ` • ${pct}%` : ''}
                </span>
              )}
              {overlay && (
                <div
                  aria-live="polite"
                  className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-3 rounded-lg border bg-white/85 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-[clamp(22px,3.6vw,34px)] font-extrabold leading-tight tracking-wide">
                      {overlay.tamil || '—'}
                    </div>
                    <div className="mt-[2px] text-sm text-slate-700">
                      {overlay.transliteration || '—'}
                    </div>
                    <div className="text-xs text-slate-600">{overlay.english || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => speakTamil(overlay.tamil)}
                      className="rounded-full border bg-white px-3 py-2 font-semibold hover:bg-slate-50"
                    >
                      🔊 Speak
                    </button>
                    <button
                      onClick={onAdd}
                      className="rounded-full border bg-white px-3 py-2 font-semibold hover:bg-slate-50"
                      title="Add to My List"
                    >
                      ➕ Add
                    </button>
                  </div>
                </div>
              )}
              {justSaved && (
                <div className="absolute left-3 top-3 rounded-full border bg-white/85 px-3 py-1 text-xs">
                  {justSaved === 'ok'
                    ? 'Added to list'
                    : justSaved === 'dup'
                    ? 'Already in list'
                    : 'Save failed'}
                </div>
              )}
            </div>
          </div>

          {/* History */}
          <aside className="rounded-xl border bg-white p-3 shadow-sm">
            <h3 className="mb-2 ml-1 text-sm text-slate-700">History</h3>
            <div className="grid gap-2">
              {history.map((it, i) => (
                <button
                  key={i}
                  className="grid w-full grid-cols-[64px_1fr] items-center gap-2 rounded-lg border bg-white p-2 text-left hover:bg-slate-50"
                  onClick={() => {
                    setPreviewUrl(it.url);
                    setOverlay({
                      tamil: it.tamil,
                      transliteration: it.translit,
                      english: it.english,
                      confidence: it.confidence ? it.confidence / 100 : null,
                      partOfSpeech: null,
                    });
                    speakTamil(it.tamil);
                  }}
                >
                  <img src={it.url} alt="" className="h-10 w-16 rounded-md object-cover bg-black" />
                  <div>
                    <div className="font-bold">{it.tamil}</div>
                    <div className="truncate text-xs text-slate-600">
                      {it.english}
                      {it.confidence !== null ? ` • ${it.confidence}%` : ''}
                    </div>
                  </div>
                </button>
              ))}
              {history.length === 0 && (
                <div className="rounded-md border bg-white p-3 text-slate-600">No scans yet.</div>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
