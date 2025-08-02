'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/hooks/use-auth';
import type { LoginFormData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const loginSchema = z.object({
  email: z.string().email('Correo electrónico inválido.'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres.'),
});

export default function LoginPage() {
  const { login, signInWithGoogle } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    const { success, error } = await login(data);
    if (success) {
      router.push('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: 'Falló el inicio de sesión',
        description: error,
      });
    }
  };

  const handleGoogleLogin = async () => {
    const { success, error } = await signInWithGoogle();
    if (success) {
      router.push('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: 'Falló el inicio de sesión',
        description: error,
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <Logo className="mb-4" />
          <CardTitle className="text-2xl font-headline">Iniciar Sesión</CardTitle>
          <CardDescription>Ingresa tu correo electrónico para acceder a tu cuenta</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="email">Correo Electrónico</Label>
                    <FormControl>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@ejemplo.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                     <div className="flex items-center">
                        <Label htmlFor="password">Contraseña</Label>
                        <Link
                          href="/#"
                          className="ml-auto inline-block text-sm underline"
                        >
                          ¿Olvidaste tu contraseña?
                        </Link>
                      </div>
                    <FormControl>
                      <Input id="password" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full">
                Iniciar Sesión
              </Button>
              <Button variant="outline" className="w-full" type="button" onClick={handleGoogleLogin}>
                Iniciar Sesión con Google
              </Button>
            </form>
          </Form>
          <div className="mt-4 text-center text-sm">
            ¿No tienes una cuenta?{' '}
            <Link href="/signup" className="underline">
              Regístrate
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
