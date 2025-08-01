'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function ProtectedLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations('ProtectedLayout');
  
  const isAuthPage = pathname.includes('/login') || pathname.includes('/signup');

  useEffect(() => {
    if (loading) return;

    if (!user && !isAuthPage) {
      router.replace('/login');
    }
    if (user && isAuthPage) {
      router.replace('/dashboard');
    }
  }, [user, loading, router, pathname, isAuthPage]);

  if (loading || (!user && !isAuthPage) || (user && isAuthPage)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>{t('loading')}</p>
      </div>
    );
  }

  return <>{children}</>;
}
