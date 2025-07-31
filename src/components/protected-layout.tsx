'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next-intl/navigation';
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
    // Las dependencias están perfectas
  }, [user, loading, router, pathname, isAuthPage]);

  // 👇 ESTA ES LA LÍNEA MODIFICADA
  // Ahora también cubre el caso en que un usuario logueado está en una página de auth
  if (loading || (!user && !isAuthPage) || (user && isAuthPage)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>{t('loading')}</p>
      </div>
    );
  }

  return <>{children}</>;
}