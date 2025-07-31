import { ProtectedLayout } from '@/hooks/use-auth';
import { AppSidebar } from './app-sidebar';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedLayout>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <AppSidebar />
        <div className="flex flex-col">
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
    </ProtectedLayout>
  );
}
