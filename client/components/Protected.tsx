'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Protected({
  children,
  redirectTo = '/auth/signin',
}: {
  children: ReactNode;
  redirectTo?: string;
}) {
  const { accessToken } = useAuth() as any;
  const router = useRouter();

  useEffect(() => {
    if (!accessToken) router.replace(redirectTo);
  }, [accessToken, redirectTo, router]);

  return <>{children}</>;
}
