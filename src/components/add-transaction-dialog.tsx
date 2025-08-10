'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bot, Calendar as CalendarIcon, Loader2, PlusSquare } from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  SelectGroup,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { suggestCategory } from '@/ai/flows/categorize-transaction';
import type { Category, Transaction, Goal } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, addDoc, doc, updateDoc, writeBatch, increment } from 'firebase/firestore';


const transactionSchema = z.object({
  description: z.string().min(1, 'La descripción es obligatoria.'),
  amount: z.coerce.number().positive('El monto debe ser positivo.'),
  date: z.date(),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'La categoría es obligatoria.'),
  linkedGoalId: z.string().optional(),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

type AddTransactionDialogProps = {
    transaction?: Transaction | null,
    categories: Category[],
    goals: Goal[],
    open: boolean,
    onOpenChange: (open: boolean) => void,
}

function AddCategoryAlert({ onCategoryAdded }: { onCategoryAdded: (id: string) => void }) {
    const [name, setName] = useState('');
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const handleAddCategory = async () => {
        if (!user || !name.trim()) return;
        try {
        const docRef = await addDoc(collection(db, 'categories'), {
            name,
            userId: user.uid,
        });
        toast({ title: 'Categoría Agregada', description: `"${name}" ha sido agregada.` });
        onCategoryAdded(docRef.id);
        setName('');
        setOpen(false);
        } catch (error) {
        toast({ title: 'Error', description: 'No se pudo agregar la categoría.', variant: "destructive" });
        }
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="icon" aria-label="Agregar Nueva Categoría">
                    <PlusSquare className="h-4 w-4" />
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Agregar Nueva Categoría</AlertDialogTitle>
                <AlertDialogDescription>
                    Crea una nueva categoría para organizar tus transacciones.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <Input
                    placeholder="Ej., Viajes"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleAddCategory} disabled={!name.trim()}>Guardar</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export function AddTransactionDialog({ open, onOpenChange, transaction, categories, goals }: AddTransactionDialogProps) {
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isEditing = !!transaction?.id;

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: '',
      amount: 0,
      date: new Date(),
      type: 'expense',
      category: '',
      linkedGoalId: undefined,
    },
  });

  const { categoryTree, flatCategoryList } = useMemo(() => {
    const categoryMap = new Map(categories.map(c => [c.id, { ...c, children: [] as Category[] }]));
    const tree: (Category & { children: Category[] })[] = [];
    
    categories.forEach(cat => {
      if (cat.parentId && categoryMap.has(cat.parentId)) {
        categoryMap.get(cat.parentId)!.children.push(cat as Category & { children: Category[] });
      } else {
        tree.push(categoryMap.get(cat.id)!);
      }
    });

    const flatList = categories.map(c => ({ id: c.id, name: c.name }));

    return { categoryTree: tree, flatCategoryList: flatList };
  }, [categories]);

  useEffect(() => {
    if (open) {
        if (transaction) {
            form.reset({
                description: transaction.description,
                amount: transaction.amount,
                date: new Date(transaction.date),
                type: transaction.type,
                category: transaction.category,
                linkedGoalId: transaction.linkedGoalId || undefined,
            });
        } else {
            form.reset({
                description: '',
                amount: 0,
                date: new Date(),
                type: 'expense',
                category: '',
                linkedGoalId: undefined,
            });
        }
    }
  }, [transaction, open, form]);


  const handleSuggestCategory = async () => {
    const description = form.getValues('description');
    if (!description) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Por favor, ingresa una descripción primero.',
      });
      return;
    }
    setIsSuggesting(true);
    try {
      const result = await suggestCategory({
        description,
        availableCategories: flatCategoryList.map(c => c.name),
      });

      const suggestedCategory = flatCategoryList.find(c => c.name === result.suggestedCategory);

      if (suggestedCategory) {
        form.setValue('category', suggestedCategory.id, { shouldValidate: true });
        toast({
            title: 'Categoría Sugerida',
            description: `Sugerimos "${result.suggestedCategory}" con un ${Math.round(result.confidence * 100)}% de confianza.`,
        });
      } else {
         toast({
            variant: 'destructive',
            title: 'Sugerencia Fallida',
            description: 'La categoría sugerida no existe.',
        });
      }
      
    } catch (error) {
      console.error('Error suggesting category:', error);
      toast({
        variant: 'destructive',
        title: 'Sugerencia Fallida',
        description: 'No se pudo sugerir una categoría en este momento.',
      });
    } finally {
      setIsSuggesting(false);
    }
  };

  const onSubmit = async (data: TransactionFormValues) => {
    if (!user) return;
    
    const batch = writeBatch(db);
    const getAmountMultiplier = (goalType: 'saving' | 'debt', transactionType: 'income' | 'expense'): number => {
        if (transactionType === 'income') {
            return 1; // Incomes always add to the goal progress
        }
        // If it's an expense
        if (goalType === 'debt') {
            return 1; // Paying off a debt (expense) increases the paid amount
        }
        return -1; // Withdrawing from savings (expense) decreases the saved amount
    };
    

    try {
        const transactionData = { ...data, linkedGoalId: data.linkedGoalId === 'none' ? null : data.linkedGoalId || null };
        let transactionRef;

        if (isEditing && transaction) {
            transactionRef = doc(db, 'transactions', transaction.id);
            
            // Revert previous goal amount if goal link changed or transaction details changed
            if(transaction.linkedGoalId) {
                const oldGoal = goals.find(g => g.id === transaction.linkedGoalId);
                if (oldGoal) {
                    const oldMultiplier = getAmountMultiplier(oldGoal.goalType, transaction.type);
                    const oldAmountToRevert = - (transaction.amount * oldMultiplier);
                    const oldGoalRef = doc(db, 'goals', transaction.linkedGoalId);
                    batch.update(oldGoalRef, { currentAmount: increment(oldAmountToRevert) });
                }
            }
            batch.update(transactionRef, transactionData);

        } else {
            transactionRef = doc(collection(db, 'transactions'));
            batch.set(transactionRef, { ...transactionData, userId: user.uid });
        }

        // Apply new goal amount
        if(data.linkedGoalId && data.linkedGoalId !== 'none') {
             const newGoal = goals.find(g => g.id === data.linkedGoalId);
             if (newGoal) {
                 const newMultiplier = getAmountMultiplier(newGoal.goalType, data.type);
                 const amountToAdd = data.amount * newMultiplier;
                 const goalRef = doc(db, 'goals', data.linkedGoalId);
                 batch.update(goalRef, { currentAmount: increment(amountToAdd) });
             }
        }
        
        await batch.commit();

        toast({
            title: isEditing ? 'Transacción Actualizada' : 'Transacción Agregada',
            description: `Se guardó exitosamente "${data.description}".`,
        });
      
      onOpenChange(false);
    } catch (error) {
        console.error("Error saving transaction:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'No se pudo guardar la transacción.',
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar' : 'Agregar'} Transacción</DialogTitle>
          <DialogDescription>
            Completa los detalles de tu transacción.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej., Café con un amigo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha</FormLabel>
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
                          disabled={(date) =>
                            date > new Date() || date < new Date('1900-01-01')
                          }
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="income">Ingreso</SelectItem>
                        <SelectItem value="expense">Gasto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona una categoría" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           {categoryTree.map(parent => (
                              <SelectGroup key={parent.id}>
                                <SelectItem value={parent.id}>{parent.name}</SelectItem>
                                {parent.children.map(child => (
                                  <SelectItem key={child.id} value={child.id}>
                                    &nbsp;&nbsp;&nbsp;{child.name}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))}
                        </SelectContent>
                      </Select>
                      <AddCategoryAlert onCategoryAdded={(id) => form.setValue('category', id, { shouldValidate: true })} />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleSuggestCategory}
                        disabled={isSuggesting}
                        aria-label="Sugerir Categoría"
                      >
                        {isSuggesting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="linkedGoalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vincular a Meta (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'none'} defaultValue="none">
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="No vincular a ninguna meta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Ninguna</SelectItem>
                      {goals.map(goal => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.goalType === 'saving' ? 'Ahorro' : 'Deuda'}: {goal.goalName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">{isEditing ? 'Guardar Cambios' : 'Agregar'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    