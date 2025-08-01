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
  
  // A basic check for auth pages to avoid redirect loops.
  // This might need to be more robust in a real app.
  const isAuthPage = pathname.endsWith('/login') || pathname.endsWith('/signup');

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
