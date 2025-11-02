'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Container from '../components/Container';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={[
        'fixed inset-x-0 top-0 z-50 border-b transition-colors',
        scrolled ? 'bg-white/85 backdrop-blur border-slate-200 shadow-sm' : 'bg-white/60 backdrop-blur border-transparent'
      ].join(' ')}
    >
      <Container className="h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/#home" className="flex items-center gap-3 hover:opacity-90 transition" aria-label="Tamil Lens Home">
          <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold">
            Ta
          </div>
          <span className="text-lg sm:text-xl font-bold text-slate-900">Tamil Lens</span>
        </Link>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/#home" className="text-slate-700 hover:text-cyan-600 font-medium">Home</Link>
          <Link
            href="/auth/signin?mode=signup&next=/scan"
            className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-4 py-2 rounded-lg font-semibold hover:shadow-lg hover:scale-105 transition"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen(v => !v)}
          className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 hover:bg-slate-100 rounded-lg transition"
          aria-label="Menu"
          aria-expanded={open}
        >
          <span className="w-6 h-0.5 bg-slate-700" />
          <span className="w-6 h-0.5 bg-slate-700" />
          <span className="w-6 h-0.5 bg-slate-700" />
        </button>
      </Container>

      {/* Mobile sheet */}
      {open && (
        <div className="md:hidden bg-white/95 backdrop-blur border-t border-slate-100">
          <Container className="py-4 flex flex-col gap-3">
            <Link href="/#home" className="py-2 text-slate-700 hover:text-cyan-600 font-medium" onClick={() => setOpen(false)}>
              Home
            </Link>
            <Link
              href="/auth/signin?mode=signup&next=/scan"
              className="py-2 bg-gradient-to-r from-cyan-500 to-teal-500 text-white px-6 rounded-lg font-semibold text-center hover:shadow-lg transition"
              onClick={() => setOpen(false)}
            >
              Get Started
            </Link>
          </Container>
        </div>
      )}
    </nav>
  );
}
