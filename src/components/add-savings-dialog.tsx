'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { Goal } from '@/lib/types';
import { db } from '@/lib/firebase';
import { doc, updateDoc, increment } from 'firebase/firestore';

const savingsSchema = z.object({
  amount: z.coerce.number().positive('El monto a ahorrar debe ser positivo.'),
});

type SavingsFormValues = z.infer<typeof savingsSchema>;

type AddSavingsDialogProps = {
    goal?: Goal | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onClose: () => void;
}

export function AddSavingsDialog({ open, onOpenChange, goal, onClose }: AddSavingsDialogProps) {
  const { toast } = useToast();

  const form = useForm<SavingsFormValues>({
    resolver: zodResolver(savingsSchema),
    defaultValues: {
      amount: 0,
    },
  });

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
        onClose();
        form.reset();
    }
    onOpenChange(isOpen);
  }
  
  const onSubmit = async (data: SavingsFormValues) => {
    if (!goal) return;

    try {
        const goalRef = doc(db, 'goals', goal.id);
        await updateDoc(goalRef, {
            currentAmount: increment(data.amount)
        });
        toast({ title: '¡Ahorro Añadido!', description: `Has añadido ${data.amount} a tu meta "${goal.goalName}".` });
        handleDialogClose(false);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo añadir el ahorro.',
        });
    }
  };
  
  if (!goal) return null;

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Añadir Ahorro a "{goal.goalName}"</DialogTitle>
          <DialogDescription>
            Ingresa la cantidad que quieres aportar a esta meta.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monto a Ahorrar</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100,000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Añadir Ahorro</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
