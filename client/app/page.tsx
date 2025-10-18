'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';


export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    const id = setInterval(() => setActiveFeature(p => (p + 1) % 3), 3000);
    return () => clearInterval(id);
  }, []);

  const features = [
    { icon: '📸', title: 'Lens & Learn', description: 'Freeze the frame and label objects in English + தமிழ் + transliteration', gradient: 'from-cyan-400 to-teal-400' },
    { icon: '🔊', title: 'Hear It', description: 'Play natural audio in both languages (EN/Ta) with perfect pronunciation', gradient: 'from-yellow-400 to-orange-400' },
    { icon: '📚', title: 'Practice Quiz', description: 'Multiple-choice and spelling with gentle spaced repetition', gradient: 'from-green-400 to-emerald-400' },
  ];

  const steps = [
    { number: '1', icon: '🎯', title: 'Point', description: 'Aim at any object' },
    { number: '2', icon: '⚡', title: 'Tap Scan', description: 'Instant recognition' },
    { number: '3', icon: '🏆', title: 'Learn', description: 'Build vocabulary' },
  ];

  const testimonials = [
    { stars: 5, quote: 'I learned 50 Tamil words in my first week! The audio helps so much with pronunciation.', author: 'Priya, Age 9' },
    { stars: 5, quote: 'This app makes Tamil accessible and fun. My students are engaged and actually excited to practice.', author: 'Mr. Kumar, Teacher' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <Navbar />

      {/* Hero */}
      <section id="home" className="pt-28 sm:pt-32 pb-16 sm:pb-20">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight mb-6">
                See it. Say it.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-teal-500">Learn Tamil.</span>
              </h1>
              <p className="text-lg sm:text-xl text-slate-600 mb-8">
                Tamil Lens turns your camera into a bilingual teacher—English, <span className="font-semibold">தமிழ்</span>, and clear audio.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/auth/signin?next=/scan" className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-7 py-3 rounded-xl font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all">
                  Open App
                </Link>
                <Link href="/auth/signin?next=/practice" className="bg-white text-slate-700 px-7 py-3 rounded-xl font-semibold text-lg border-2 border-slate-200 hover:border-cyan-500 hover:shadow-lg transition-all">
                  Try Practice Quiz
                </Link>
              </div>
            </div>

            <div className={`relative transition-all duration-700 delay-150 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-6'}`}>
              <div className="relative bg-gradient-to-br from-cyan-100 via-teal-50 to-emerald-100 rounded-3xl p-10 sm:p-12 shadow-2xl">
                <div className="border-4 border-dashed border-cyan-400 rounded-2xl p-12 sm:p-16 bg-white/50 backdrop-blur-sm flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full flex items-center justify-center animate-pulse">
                      <span className="text-4xl sm:text-5xl">📸</span>
                    </div>
                    <p className="text-slate-600 font-medium">Point &amp; Learn</p>
                  </div>
                </div>
                <div className="absolute -top-4 -right-4 w-16 h-16 sm:w-20 sm:h-20 bg-yellow-400 rounded-full animate-bounce opacity-80" />
                <div className="absolute -bottom-6 -left-6 w-12 h-12 sm:w-16 sm:h-16 bg-pink-400 rounded-full animate-pulse opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="learn" className="py-16 sm:py-20 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-4">How Tamil Lens Helps You Learn</h2>
          <p className="text-center text-slate-600 mb-12 sm:mb-16 text-lg">Three powerful ways to master Tamil vocabulary</p>

          <div className="mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl place-items-stretch">
            {features.map((f, i) => (
              <div
                key={i}
                className={`bg-gradient-to-br ${f.gradient} p-1 rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                  i === activeFeature ? 'shadow-2xl scale-[1.02]' : ''
                }`}
                onMouseEnter={() => setActiveFeature(i)}
              >
                <div className="bg-white rounded-xl p-6 sm:p-8 h-full">
                  <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">{f.icon}</div>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-slate-600 leading-relaxed">{f.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 bg-gradient-to-br from-slate-50 to-cyan-50">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-12 sm:mb-16">How It Works</h2>
          <div className="mx-auto grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12 max-w-6xl">
            {steps.map((s, i) => (
              <div key={i} className="text-center">
                <div className="relative inline-block mb-5 sm:mb-6">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg">
                    {s.number}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full flex items-center justify-center shadow-md">
                    <span className="text-2xl sm:text-3xl">{s.icon}</span>
                  </div>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">{s.title}</h3>
                <p className="text-slate-600">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="quiz" className="py-16 sm:py-20 bg-white">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-center text-slate-900 mb-12 sm:mb-16">What Learners Say</h2>
          <div className="mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-6xl">
            {[
              ...testimonials.map((t, i) => (
                <div key={i} className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-xl transition-all">
                  <div className="flex gap-1 mb-3 sm:mb-4">
                    {Array.from({ length: t.stars }).map((_, j) => (
                      <span key={j} className="text-yellow-400 text-xl sm:text-2xl">⭐</span>
                    ))}
                  </div>
                  <p className="text-slate-700 text-base sm:text-lg mb-3 sm:mb-4 italic">"{t.quote}"</p>
                  <p className="text-slate-900 font-semibold">— {t.author}</p>
                </div>
              )),
            ]}
          </div>
        </div>
      </section>

      
    </div>
  );
}
