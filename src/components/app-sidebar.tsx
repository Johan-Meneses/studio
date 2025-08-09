'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  LayoutDashboard,
  Tags,
  LogOut,
  Target,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Logo } from './logo';
import { useAuth } from '@/hooks/use-auth';

export function AppSidebarContent() {
  const currentPathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  const navItems = [
    { href: '/dashboard', label: 'Panel', icon: LayoutDashboard },
    { href: '/reports', label: 'Reportes', icon: BarChart3 },
    { href: '/categories', label: 'Categorías', icon: Tags },
    { href: '/goals', label: 'Metas', icon: Target },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  }
  
  return (
    <>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  (currentPathname === item.href || (item.href !== '/dashboard' && currentPathname.startsWith(item.href))) && 'bg-muted text-primary'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4 border-t">
            <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.photoURL || "https://placehold.co/100x100.png"} alt="User avatar" data-ai-hint="person" />
                    <AvatarFallback>{user?.email?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                    <p className="font-medium leading-none">{user?.displayName || 'Bienvenido'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <Button variant="ghost" size="icon" className="ml-auto" onClick={handleLogout}>
                    <LogOut className="h-4 w-4" />
                    <span className="sr-only">Cerrar Sesión</span>
                </Button>
            </div>
        </div>
    </>
  )
}


export function AppSidebar() {
  return (
    <div className="hidden border-r bg-card md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Logo />
        </div>
        <AppSidebarContent />
      </div>
    </div>
  );
}
