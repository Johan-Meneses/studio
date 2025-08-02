'use client';

import { Link, useRouter } from 'next/navigation';
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
import { useTranslations } from 'next-intl';
import { useToast } from '@/hooks/use-toast';

const signupSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export default function SignupPage() {
    const t = useTranslations('SignupPage');
    const tToast = useTranslations('Toasts');
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
            title: tToast('signupFailed'),
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
          title: tToast('signupFailed'),
          description: error,
        });
      }
    };


  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto max-w-sm">
        <CardHeader>
          <Logo className="mb-4" />
          <CardTitle className="text-2xl font-headline">{t('title')}</CardTitle>
          <CardDescription>
            {t('description')}
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
                                <Label htmlFor="name">{t('nameLabel')}</Label>
                                <FormControl>
                                    <Input id="name" placeholder={t('namePlaceholder')} {...field} />
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
                                <Label htmlFor="email">{t('emailLabel')}</Label>
                                <FormControl>
                                    <Input id="email" type="email" placeholder={t('emailPlaceholder')} {...field} />
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
                                <Label htmlFor="password">{t('passwordLabel')}</Label>
                                <FormControl>
                                    <Input id="password" type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full">
                        {t('createAccountButton')}
                    </Button>
                    <Button variant="outline" className="w-full" type="button" onClick={handleGoogleSignup}>
                        {t('googleSignupButton')}
                    </Button>
                 </form>
            </Form>
          <div className="mt-4 text-center text-sm">
            {t('loginPrompt')}{' '}
            <Link href="/login" className="underline">
              {t('loginLink')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
