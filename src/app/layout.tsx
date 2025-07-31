import type { Metadata } from 'next';

// This layout is intentionally left blank and is used to generate the root layout.
// The actual layout is in `src/app/[locale]/layout.tsx`.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}

export const metadata: Metadata = {
  title: 'BudgetView',
  description: 'Your personal budget manager.',
};
