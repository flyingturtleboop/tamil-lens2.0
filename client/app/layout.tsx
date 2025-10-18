'use client';

import './globals.css';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ReactNode } from 'react';
import { AuthProvider } from '@/context/AuthContext'; // if you wrap context here

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const hideChrome = pathname?.startsWith('/dashboard'); // no Navbar/Footer on dashboard

  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <AuthProvider>
          {!hideChrome && <Navbar />}
          {children}
          {!hideChrome && <Footer />}
        </AuthProvider>
      </body>
    </html>
  );
}
