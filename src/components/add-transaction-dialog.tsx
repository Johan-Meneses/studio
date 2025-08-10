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
  categoryId: z.string().min(1, 'La categoría es obligatoria.'),
  subCategoryId: z.string().optional(),
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
      categoryId: '',
      subCategoryId: '',
      linkedGoalId: 'none',
    },
  });

  const selectedCategoryId = form.watch('categoryId');

  const { parentCategories, subCategoriesByParent, categoryMap } = useMemo(() => {
    const parentCats: Category[] = [];
    const subCatsByParent: Record<string, Category[]> = {};
    const catMap = new Map<string, Category>();

    categories.forEach(cat => {
        catMap.set(cat.id, cat);
        if (cat.parentId) {
            if (!subCatsByParent[cat.parentId]) {
                subCatsByParent[cat.parentId] = [];
            }
            subCatsByParent[cat.parentId].push(cat);
        } else {
            parentCats.push(cat);
        }
    });

    return { parentCategories: parentCats, subCategoriesByParent: subCatsByParent, categoryMap: catMap };
  }, [categories]);

  const availableSubcategories = selectedCategoryId ? subCategoriesByParent[selectedCategoryId] : undefined;

  useEffect(() => {
    if (open) {
        if (transaction) {
            const category = categoryMap.get(transaction.category);
            const parentId = category?.parentId;
            form.reset({
                description: transaction.description,
                amount: transaction.amount,
                date: new Date(transaction.date),
                type: transaction.type,
                categoryId: parentId || transaction.category,
                subCategoryId: parentId ? transaction.category : '',
                linkedGoalId: transaction.linkedGoalId || 'none',
            });
        } else {
            form.reset({
                description: '',
                amount: 0,
                date: new Date(),
                type: 'expense',
                categoryId: '',
                subCategoryId: '',
                linkedGoalId: 'none',
            });
        }
    }
  }, [transaction, open, form, categoryMap]);

  useEffect(() => {
    // Reset subcategory when parent changes
    form.setValue('subCategoryId', '');
  }, [selectedCategoryId, form]);


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
      const allCategoryNames = categories.map(c => c.name);
      const result = await suggestCategory({
        description,
        availableCategories: allCategoryNames,
      });

      const suggestedCategory = categories.find(c => c.name === result.suggestedCategory);

      if (suggestedCategory) {
        if (suggestedCategory.parentId) {
            form.setValue('categoryId', suggestedCategory.parentId, { shouldValidate: true });
            // Need a slight delay for the subcategory dropdown to be populated
            setTimeout(() => {
                form.setValue('subCategoryId', suggestedCategory.id, { shouldValidate: true });
            }, 100);
        } else {
            form.setValue('categoryId', suggestedCategory.id, { shouldValidate: true });
            form.setValue('subCategoryId', '', { shouldValidate: true });
        }
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
    
    const finalCategoryId = data.subCategoryId || data.categoryId;

    const batch = writeBatch(db);
    const getAmountMultiplier = (goalType: 'saving' | 'debt', transactionType: 'income' | 'expense'): number => {
        if (transactionType === 'income') return 1;
        if (goalType === 'debt') return 1;
        return -1;
    };
    
    try {
        const transactionData = { 
            description: data.description,
            amount: data.amount,
            date: data.date,
            type: data.type,
            category: finalCategoryId,
            linkedGoalId: data.linkedGoalId === 'none' ? null : data.linkedGoalId || null 
        };
        let transactionRef;

        if (isEditing && transaction) {
            transactionRef = doc(db, 'transactions', transaction.id);
            
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
      <DialogContent className="sm:max-w-xl">
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
              <div className="flex flex-col gap-2">
                 <FormField
                    control={form.control}
                    name="categoryId"
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
                                {parentCategories.map(parent => (
                                    <SelectItem key={parent.id} value={parent.id}>{parent.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <AddCategoryAlert onCategoryAdded={(id) => form.setValue('categoryId', id, { shouldValidate: true })} />
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
            </div>

            {availableSubcategories && availableSubcategories.length > 0 && (
                 <FormField
                    control={form.control}
                    name="subCategoryId"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Subcategoría (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecciona una subcategoría" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                 <SelectItem value="">Ninguna</SelectItem>
                                {availableSubcategories.map(sub => (
                                    <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                    )}
                />
            )}
           
            <FormField
              control={form.control}
              name="linkedGoalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vincular a Meta (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} defaultValue="none">
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
