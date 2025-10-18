// components/ClientFrame.tsx
'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ClientFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Any route that starts with /dashboard should NOT show public navbar/footer
  const isDashboard = pathname?.startsWith('/dashboard');

  if (isDashboard) {
    return <>{children}</>;
  }

  // Public site shell
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
