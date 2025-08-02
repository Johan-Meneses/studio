import { AppSidebar, AppSidebarContent } from './app-sidebar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { Logo } from './logo';

export function MainLayout({ children }: { children: React.ReactNode }) {
  return (
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <AppSidebar />
        <div className="flex flex-col">
            <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
                 <Sheet>
                    <SheetTrigger asChild>
                        <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 md:hidden"
                        >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="flex flex-col p-0">
                       <SheetHeader className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
                            <SheetTitle className="sr-only">Menu</SheetTitle>
                            <Logo />
                        </SheetHeader>
                        <AppSidebarContent />
                    </SheetContent>
                </Sheet>
                <div className="w-full flex-1 md:hidden">
                    {/* Optional: Add mobile header content here */}
                </div>
            </header>
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-background">
            {children}
          </main>
        </div>
      </div>
  );
}
