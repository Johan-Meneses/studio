'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
  Bot,
  Calendar as CalendarIcon,
  Loader2,
  PlusCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { mockCategories } from '@/lib/data';
import { suggestCategory } from '@/ai/flows/categorize-transaction';

const transactionSchema = z.object({
  description: z.string().min(1, 'La descripción es obligatoria.'),
  amount: z.coerce.number().positive('El monto debe ser positivo.'),
  date: z.date(),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, 'La categoría es obligatoria.'),
});

type TransactionFormValues = z.infer<typeof transactionSchema>;

export function AddTransactionDialog() {
  const [open, setOpen] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const { toast } = useToast();

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: '',
      amount: 0,
      date: new Date(),
      type: 'expense',
      category: '',
    },
  });

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
        availableCategories: mockCategories.map((c) => c.name),
      });
      form.setValue('category', result.suggestedCategory, { shouldValidate: true });
      toast({
        title: 'Categoría Sugerida',
        description: `Sugerimos "${result.suggestedCategory}" con un ${Math.round(result.confidence * 100)}% de confianza.`,
      });
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

  const onSubmit = (data: TransactionFormValues) => {
    console.log(data);
    toast({
      title: 'Transacción Agregada',
      description: `Se agregó exitosamente ${data.description}.`,
    });
    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Agregar Transacción
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Agregar Nueva Transacción</DialogTitle>
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
            <div className="grid grid-cols-2 gap-4">
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
                              format(field.value, 'PPP')
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
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
               <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona un tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="expense">Gasto</SelectItem>
                          <SelectItem value="income">Ingreso</SelectItem>
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
                            {mockCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.name}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                         <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={handleSuggestCategory}
                            disabled={isSuggesting}
                            aria-label="Sugerir Categoría"
                          >
                            {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                          </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
            <DialogFooter>
              <Button type="submit">Agregar Transacción</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
