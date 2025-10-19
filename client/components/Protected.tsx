'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Protected({
  children,
  redirectTo = '/auth/signin?next=/dashboard',
}: {
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const router = useRouter();
  useEffect(() => {
    const tok = localStorage.getItem('access_token');
    if (!tok) router.replace(redirectTo);
  }, [router, redirectTo]);
  return <>{children}</>;
}
