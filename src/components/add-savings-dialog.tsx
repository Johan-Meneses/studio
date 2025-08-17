'use client';

import { useState, useEffect } from 'react';
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
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { doc, writeBatch, increment, collection } from 'firebase/firestore';

const savingsSchema = z.object({
  amount: z.coerce.number().positive('El monto a aportar debe ser positivo.'),
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
  const { user } = useAuth();

  const form = useForm<SavingsFormValues>({
    resolver: zodResolver(savingsSchema),
    defaultValues: {
      amount: 0,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({ amount: 0 });
    }
  }, [open, form]);

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
        onClose();
        form.reset();
    }
    onOpenChange(isOpen);
  }
  
  const onSubmit = async (data: SavingsFormValues) => {
    if (!goal || !user) return;

    const isSavingGoal = goal.goalType === 'saving';
    const successTitle = isSavingGoal ? '¡Ahorro Añadido!' : '¡Abono Realizado!';
    const successDescription = isSavingGoal
      ? `Has añadido ${data.amount} a tu meta "${goal.goalName}".`
      : `Has abonado ${data.amount} a tu deuda "${goal.goalName}".`;
    const errorDescription = isSavingGoal
      ? 'No se pudo añadir el ahorro.'
      : 'No se pudo registrar el abono.';

    const batch = writeBatch(db);

    try {
        // 1. Update the goal's current amount
        const goalRef = doc(db, 'goals', goal.id);
        batch.update(goalRef, {
            currentAmount: increment(data.amount)
        });

        // 2. Create a new "saving" transaction
        const transactionRef = doc(collection(db, 'transactions'));
        batch.set(transactionRef, {
            userId: user.uid,
            amount: data.amount,
            date: new Date(),
            type: 'saving',
            description: `Aporte a meta: ${goal.goalName}`,
            category: goal.goalType === 'saving' ? 'Ahorro' : 'Pago Deuda', // Simple categorization for now
            linkedGoalId: goal.id
        });

        await batch.commit();

        toast({ title: successTitle, description: successDescription });
        handleDialogClose(false);
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: errorDescription,
        });
    }
  };
  
  if (!goal) return null;

  const isSavingGoal = goal.goalType === 'saving';
  const dialogTitle = isSavingGoal ? `Añadir Ahorro a "${goal.goalName}"` : `Abonar a Deuda "${goal.goalName}"`;
  const dialogDescription = isSavingGoal ? 'Ingresa la cantidad que quieres aportar a esta meta.' : 'Ingresa la cantidad que quieres abonar a esta deuda.';
  const formLabel = isSavingGoal ? 'Monto a Ahorrar' : 'Monto a Abonar';
  const buttonText = isSavingGoal ? 'Añadir Ahorro' : 'Realizar Abono';

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {dialogDescription}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{formLabel}</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="100,000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{buttonText}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
