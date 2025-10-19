'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, RotateCcw } from 'lucide-react';

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

const API = (process.env.NEXT_PUBLIC_SCAN_API || 'http://localhost:5000').replace(/\/$/, '');
const LS_KEY = 'tamilAR_bank_v1';

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
  const data = await res.json();
  if (Array.isArray(data)) return data.length;
  const obj = data as { items?: BankItem[]; myListCount?: number };
  if (typeof obj.myListCount === 'number') return obj.myListCount;
  return Array.isArray(obj.items) ? obj.items.length : 0;
}

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [overlay, setOverlay] = useState<IdentifyResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [bankCount, setBankCount] = useState<number>(0);
  const [justSaved, setJustSaved] = useState<null | 'ok' | 'dup' | 'err'>(null);
  const [cameraError, setCameraError] = useState(false);

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

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(false);
      stopStream();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      ping(520, 0.05, 0.02);
    } catch (e: any) {
      setCameraError(true);
      console.error('Camera error:', e);
    }
  }, [ping, stopStream]);

  useEffect(() => {
    startCamera();
    return () => {
      stopStream();
    };
  }, [startCamera, stopStream]);

  const freeze = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || !vid.videoWidth) return;
    
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
        stopStream();
        ping(660, 0.05, 0.02);
      },
      'image/jpeg',
      0.9
    );
  }, [ping, stopStream]);

  const retake = useCallback(() => {
    blobRef.current = null;
    setPreviewUrl('');
    setOverlay(null);
    setJustSaved(null);
    startCamera();
  }, [startCamera]);

  const identify = useCallback(async () => {
    if (!blobRef.current) {
      freeze();
      await new Promise(resolve => setTimeout(resolve, 100));
      if (!blobRef.current) return;
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
          confidence: typeof j.confidence === 'number' ? Math.round(j.confidence * 100) : null,
        };
        return [item, ...prev].slice(0, 8);
      });

      const item: BankItem = {
        english: j.english || '',
        tamil: j.tamil || '',
        transliteration: j.transliteration,
      };
      
      if (item.english && item.tamil) {
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
          setTimeout(() => setJustSaved(null), 2000);
        }
      }

      chime();
    } catch (e: any) {
      setLoading(false);
      alert(e.message || 'Network error');
    }
  }, [previewUrl, chime, freeze, ping]);

  const pct = typeof overlay?.confidence === 'number' ? Math.round(overlay.confidence * 100) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Scan & Learn</h1>
        <div className="bg-gradient-to-r from-cyan-50 to-teal-50 border border-cyan-200 rounded-full px-4 py-1.5">
          <span className="text-sm text-slate-700">My List: <span className="font-bold text-cyan-600">{bankCount}</span></span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Camera View */}
        <div className="space-y-4">
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black shadow-xl border-2 border-slate-200">
            {!previewUrl ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 text-white p-6 text-center">
                    <div>
                      <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-lg mb-2">Camera access needed</p>
                      <p className="text-sm text-slate-300">Please allow camera permissions to scan objects</p>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <img src={previewUrl} alt="capture" className="w-full h-full object-cover" />
            )}

            {loading && (
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-teal-500 animate-pulse" />
            )}

            {overlay && (
              <div className="absolute inset-x-4 bottom-4 bg-white/95 backdrop-blur-lg rounded-2xl shadow-xl p-5 border-2 border-cyan-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="text-4xl font-bold text-slate-900 mb-1 leading-tight">
                      {overlay.tamil || '—'}
                    </div>
                    <div className="text-lg text-slate-600 mb-1">
                      {overlay.transliteration || '—'}
                    </div>
                    <div className="text-sm text-slate-500">
                      {overlay.english || '—'}
                      {pct !== null && <span className="ml-2 text-cyan-600 font-medium">{pct}%</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => speakTamil(overlay.tamil)}
                    className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 text-white flex items-center justify-center hover:shadow-lg transition-all hover:scale-105 active:scale-95"
                    title="Speak"
                  >
                    🔊
                  </button>
                </div>
              </div>
            )}

            {justSaved && (
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-lg rounded-full px-4 py-2 shadow-lg border border-emerald-200">
                <span className="text-sm font-medium text-emerald-700">
                  {justSaved === 'ok' ? '✓ Added to list' : justSaved === 'dup' ? '✓ Already saved' : '✗ Save failed'}
                </span>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            {previewUrl && (
              <button
                onClick={retake}
                className="flex items-center gap-2 px-6 py-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 border-2 border-slate-200 hover:border-cyan-500"
                title="Retake"
              >
                <RotateCcw className="w-5 h-5 text-slate-700" />
                <span className="font-medium text-slate-700">Retake</span>
              </button>
            )}
            
            <button
              onClick={identify}
              disabled={loading}
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Camera className="w-6 h-6" />
              <span className="font-bold text-lg">
                {loading ? 'Identifying...' : 'Identify'}
              </span>
            </button>
          </div>
        </div>

        {/* History Sidebar */}
        <aside className="bg-white rounded-2xl shadow-lg border border-slate-200 p-5 h-fit">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Scans</h3>
          <div className="space-y-3">
            {history.map((it, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-cyan-50 border border-transparent hover:border-cyan-200 transition-all text-left group"
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
                <img 
                  src={it.url} 
                  alt="" 
                  className="w-14 h-14 rounded-lg object-cover bg-black flex-shrink-0 group-hover:scale-105 transition-transform border-2 border-slate-200" 
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 truncate">{it.tamil}</div>
                  <div className="text-sm text-slate-600 truncate">
                    {it.english}
                    {it.confidence !== null && (
                      <span className="ml-1 text-cyan-600">• {it.confidence}%</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {history.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <Camera className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No scans yet</p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}