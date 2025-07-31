'use client';

import type { Metadata } from 'next';
import { NextIntlClientProvider, useMessages } from 'next-intl';
import React from 'react';
import '../globals.css';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, ProtectedLayout } from '@/hooks/use-auth';
import { useLocale } from 'next-intl';

export default function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const locale = useLocale();
  const messages = useMessages();
  // Ensure the locale from params is used if available, otherwise fallback to the one from the hook.
  const finalLocale = params.locale || locale;

  if (!messages) {
    return (
      <html lang={finalLocale}>
        <body>
          <div className="flex h-screen items-center justify-center">
            Loading...
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang={finalLocale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <AuthProvider>
          <NextIntlClientProvider
            locale={finalLocale}
            messages={messages}
          >
            <ProtectedLayout>{children}</ProtectedLayout>
            <Toaster />
          </NextIntlClientProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
