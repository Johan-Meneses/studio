'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
import type { SignupFormData } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export default function SignupPage() {
    const { signup, signInWithGoogle } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const form = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            name: '',
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: SignupFormData) => {
      const { success, error } = await signup(data);
      if (success) {
        router.push('/dashboard');
      } else {
        toast({
            variant: 'destructive',
            title: 'Falló el registro',
            description: error,
        });
      }
    };

    const handleGoogleSignup = async () => {
      const { success, error } = await signInWithGoogle();
      if (success) {
        router.push('/dashboard');
      } else {
        toast({
          variant: 'destructive',
          title: 'Falló el registro',
          description: error,
        });
      }
    };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <Logo className="mb-4" />
          <CardTitle className="text-2xl font-headline">Regístrate</CardTitle>
          <CardDescription>
            Ingresa tu información para crear una cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <Label htmlFor="name">Nombre</Label>
                                <FormControl>
                                    <Input id="name" placeholder="Max" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <Label htmlFor="email">Correo Electrónico</Label>
                                <FormControl>
                                    <Input id="email" type="email" placeholder="m@ejemplo.com" {...field} />
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
                                <Label htmlFor="password">Contraseña</Label>
                                <FormControl>
                                    <Input id="password" type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full">
                        Crear una cuenta
                    </Button>
                    <Button variant="outline" className="w-full" type="button" onClick={handleGoogleSignup}>
                        Registrarse con Google
                    </Button>
                 </form>
            </Form>
          <div className="mt-4 text-center text-sm">
            ¿Ya tienes una cuenta?{' '}
            <Link href="/login" className="underline">
              Iniciar Sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
