'use client';

import { useState, useEffect, useMemo } from 'react';
import { DateRange } from 'react-day-picker';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MainLayout } from '@/components/main-layout';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, writeBatch, increment } from 'firebase/firestore';
import type { Transaction, Category } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddTransactionDialog } from '@/components/add-transaction-dialog';
import { useToast } from '@/hooks/use-toast';


function DateRangePicker({
  className,
  date,
  onDateChange,
}: React.HTMLAttributes<HTMLDivElement> & { date: DateRange | undefined, onDateChange: (date: DateRange | undefined) => void }) {

  return (
    <div className={cn('grid gap-2', className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={'outline'}
            className={cn(
              'w-full sm:w-[300px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, 'dd LLL, y', { locale: es })} -{' '}
                  {format(date.to, 'dd LLL, y', { locale: es })}
                </>
              ) : (
                format(date.from, 'dd LLL, y', { locale: es })
              )
            ) : (
              <span>Elige un rango de fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            locale={es}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function ReportsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);
  
  useEffect(() => {
      if (!user) return;

      const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid));
      const categoriesQuery = query(collection(db, 'categories'), where('userId', '==', user.uid));

      const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
          const userTransactions: Transaction[] = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              date: doc.data().date.toDate(),
          } as Transaction));
          setTransactions(userTransactions);
      });

      const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
          const userCategories: Category[] = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
          } as Category));
          setCategories(userCategories);
      });

      return () => {
          unsubscribeTransactions();
          unsubscribeCategories();
      };
  }, [user]);

  const handleDeleteTransaction = async (transaction: Transaction) => {
    const batch = writeBatch(db);
    try {
        const transactionRef = doc(db, 'transactions', transaction.id);
        batch.delete(transactionRef);

        if (transaction.type === 'saving' && transaction.linkedGoalId) {
            const goalRef = doc(db, 'goals', transaction.linkedGoalId);
            batch.update(goalRef, { currentAmount: increment(-transaction.amount) });
        }
        
        await batch.commit();
        toast({ title: 'Transacción Eliminada', description: 'La transacción ha sido eliminada con éxito.' });
    } catch (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar la transacción.', variant: 'destructive' });
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsDialogOpen(true);
  }

  const handleDialogClose = () => {
    setEditingTransaction(null);
    setIsDialogOpen(false);
  }
  
  const categoryMap = useMemo(() => {
    return new Map(categories.map(c => [c.id, c.name]));
  }, [categories]);


  const filteredTransactions = useMemo(() => {
    if (!date?.from) return [];
    const fromDate = date.from;
    const toDate = date.to || fromDate;
    
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= fromDate && tDate <= toDate;
    }).map(t => ({
        ...t,
        categoryName: t.type === 'saving' ? 'Ahorro a Meta' : (categoryMap.get(t.category) || 'Sin Categoría')
    })).sort((a,b) => b.date.getTime() - a.date.getTime());
  }, [transactions, date, categoryMap]);

  const monthlyTrends = useMemo(() => {
      const trends: { [key: string]: { income: number; expense: number } } = {};
      
      filteredTransactions.forEach(t => {
          const month = format(new Date(t.date), 'MMM yyyy', { locale: es });
          if (!trends[month]) {
              trends[month] = { income: 0, expense: 0 };
          }
          if (t.type === 'income') {
              trends[month].income += t.amount;
          } else if (t.type === 'expense') {
              trends[month].expense += t.amount;
          }
      });

      return Object.entries(trends).map(([month, values]) => ({ month, ...values }));
  }, [filteredTransactions]);

  const expenseDistribution = useMemo(() => {
    const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
    const distribution: { [key: string]: number } = {};

    expenseTransactions.forEach(t => {
        const categoryName = t.categoryName;
        distribution[categoryName] = (distribution[categoryName] || 0) + t.amount;
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions]);

  const chartConfig = {
    income: { label: 'Ingresos', color: "hsl(var(--chart-1))" },
    expense: { label: 'Gastos', color: "hsl(var(--chart-2))" },
  }

  return (
    <MainLayout>
      <PageHeader title="Reportes">
        <DateRangePicker date={date} onDateChange={setDate} />
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tendencias Mensuales</CardTitle>
            <CardDescription>Ingresos vs. Gastos en el rango seleccionado.</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
             <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} tickMargin={5} axisLine={false} tick={{ fontSize: 7 }} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000000}M`} tick={{ fontSize: 7 }} />
                  <Tooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                  <Legend wrapperStyle={{ fontSize: "9px", paddingTop: "0px" }} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                  <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
             </ChartContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
            <CardDescription>Distribución de tus gastos en el rango seleccionado.</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center">
            <ChartContainer config={{}} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="name" formatter={(value) => formatCurrency(value as number)} />} />
                  <Pie
                    data={expenseDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={50}
                    innerRadius={30}
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                    }) => {
                       if (percent < 0.05) return null;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                      const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="white"
                          textAnchor={x > cx ? "start" : "end"}
                          dominantBaseline="central"
                          className="text-[10px] font-medium"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {expenseDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: "9px", paddingTop: "0px" }} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

       <Card>
            <CardHeader>
                <CardTitle>Detalle de Transacciones</CardTitle>
                <CardDescription>
                   Todas las transacciones para el período de tiempo seleccionado.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="px-2">Descripción</TableHead>
                            <TableHead className="px-2">Categoría</TableHead>
                            <TableHead className="text-right px-2">Monto</TableHead>
                            <TableHead className="hidden md:table-cell px-2">Fecha</TableHead>
                            <TableHead className="px-2"><span className="sr-only">Acciones</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell className="font-medium px-2 break-words">
                                  {transaction.description}
                                </TableCell>
                                <TableCell className="px-2">
                                     <Badge 
                                      variant={transaction.type === 'income' ? 'default' : (transaction.type === 'expense' ? 'secondary' : 'outline')}
                                      className={
                                          transaction.type === 'income' ? 'bg-green-100 text-green-800' : 
                                          (transaction.type === 'saving' ? 'border-blue-500 text-blue-500' : '')
                                      }
                                    >
                                        {transaction.categoryName}
                                    </Badge>
                                </TableCell>
                                <TableCell className={`text-right font-medium px-2 ${
                                    transaction.type === 'income' ? 'text-green-600' : 
                                    (transaction.type === 'expense' ? 'text-red-600' : 'text-blue-600')
                                }`}>
                                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                </TableCell>
                                <TableCell className="hidden md:table-cell px-2">{format(transaction.date, 'dd MMM, yyyy', { locale: es })}</TableCell>
                                <TableCell className="text-right px-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Abrir menú</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {transaction.type !== 'saving' && (
                                            <DropdownMenuItem onSelect={() => handleEditTransaction(transaction)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                <span>Editar</span>
                                            </DropdownMenuItem>
                                        )}
                                      <DropdownMenuItem onClick={() => handleDeleteTransaction(transaction)} className="text-red-500 focus:text-red-500">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Eliminar</span>
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))}
                         {filteredTransactions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                    No hay transacciones para este período.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <AddTransactionDialog 
            open={isDialogOpen}
            onOpenChange={(open) => {
                if (!open) {
                    handleDialogClose();
                } else {
                    setIsDialogOpen(true);
                }
            }}
            transaction={editingTransaction} 
            categories={categories}
        />
    </MainLayout>
  );
}
