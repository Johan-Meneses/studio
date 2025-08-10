'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Goal } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const goalSchema = z.object({
  goalName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  targetAmount: z.coerce.number().positive('El monto objetivo debe ser positivo.'),
  goalType: z.enum(['saving', 'debt'], { required_error: 'Debes seleccionar un tipo de meta.' }),
  timeframe: z.enum(['Corto Plazo', 'Mediano Plazo', 'Largo Plazo']),
  targetDate: z.date().optional(),
  imageUrl: z.string().url('Por favor ingresa una URL de imagen válida.').optional().or(z.literal('')),
});

type GoalFormValues = z.infer<typeof goalSchema>;

type GoalDialogProps = {
    goal?: Goal | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onClose: () => void;
}

export function GoalDialog({ open, onOpenChange, goal, onClose }: GoalDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditing = !!goal?.id;

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      goalName: '',
      targetAmount: 0,
      goalType: 'saving',
      timeframe: 'Mediano Plazo',
      targetDate: undefined,
      imageUrl: '',
    },
  });

  useEffect(() => {
    if (open) {
        if (goal) {
            form.reset({
                goalName: goal.goalName,
                targetAmount: goal.targetAmount,
                goalType: goal.goalType,
                timeframe: goal.timeframe,
                targetDate: goal.targetDate ? new Date(goal.targetDate) : undefined,
                imageUrl: goal.imageUrl || '',
            });
        } else {
            form.reset({
                goalName: '',
                targetAmount: 0,
                goalType: 'saving',
                timeframe: 'Mediano Plazo',
                targetDate: undefined,
                imageUrl: '',
            });
        }
    }
  }, [goal, open, form]);
  
  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen) {
        onClose();
    }
    onOpenChange(isOpen);
  }


  const onSubmit = async (data: GoalFormValues) => {
    if (!user) return;
    
    const goalData = {
        ...data,
        targetDate: data.targetDate || null,
        imageUrl: data.imageUrl || '',
    };

    try {
        if (isEditing && goal) {
            const goalRef = doc(db, 'goals', goal.id);
            await updateDoc(goalRef, goalData);
            toast({ title: 'Meta Actualizada', description: `Tu meta "${data.goalName}" ha sido actualizada.` });
        } else {
            await addDoc(collection(db, 'goals'), {
                ...goalData,
                userId: user.uid,
                currentAmount: 0,
                createdAt: serverTimestamp(),
            });
            toast({ title: '¡Meta Creada!', description: `Tu nueva meta "${data.goalName}" ha sido creada.` });
        }
      
      handleDialogClose(false);
      form.reset();
    } catch (error) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo guardar la meta.',
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar' : 'Crear'} Meta Financiera</DialogTitle>
          <DialogDescription>
            Define tu objetivo o deuda y empieza a seguir tu progreso.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
             <FormField
                control={form.control}
                name="goalName"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nombre de la Meta</FormLabel>
                    <FormControl>
                        <Input placeholder="Ej., Vacaciones en la playa" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                control={form.control}
                name="goalType"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo de Meta</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue="saving">
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        <SelectItem value="saving">Ahorrar para un objetivo</SelectItem>
                        <SelectItem value="debt">Pagar una deuda</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="targetAmount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Monto Objetivo</FormLabel>
                    <FormControl>
                        <Input type="number" placeholder="5,000,000" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                control={form.control}
                name="timeframe"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plazo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un plazo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Corto Plazo">Corto Plazo</SelectItem>
                        <SelectItem value="Mediano Plazo">Mediano Plazo</SelectItem>
                        <SelectItem value="Largo Plazo">Largo Plazo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha Límite (Opcional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full pl-3 text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'PPP', { locale: es })
                            ) : (
                              <span>Elige una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de Imagen (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://ejemplo.com/imagen.png" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{isEditing ? 'Guardar Cambios' : 'Crear Meta'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
