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
import { MainLayout } from '@/components/main-layout';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Bar, BarChart, CartesianGrid, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import type { Transaction, Category } from '@/lib/types';

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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

  const filteredTransactions = useMemo(() => {
    if (!date?.from) return [];
    const fromDate = date.from;
    const toDate = date.to || fromDate;
    
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= fromDate && tDate <= toDate;
    });
  }, [transactions, date]);

  const monthlyTrends = useMemo(() => {
      const trends: { [key: string]: { income: number; expense: number } } = {};
      
      filteredTransactions.forEach(t => {
          const month = format(new Date(t.date), 'MMM yyyy', { locale: es });
          if (!trends[month]) {
              trends[month] = { income: 0, expense: 0 };
          }
          if (t.type === 'income') {
              trends[month].income += t.amount;
          } else {
              trends[month].expense += t.amount;
          }
      });

      return Object.entries(trends).map(([month, values]) => ({ month, ...values }));
  }, [filteredTransactions]);

  const expenseDistribution = useMemo(() => {
    const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
    const distribution: { [key: string]: number } = {};

    expenseTransactions.forEach(t => {
        const categoryName = categories.find(c => c.id === t.category)?.name || 'Sin Categoría';
        distribution[categoryName] = (distribution[categoryName] || 0) + t.amount;
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions, categories]);

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
    </MainLayout>
  );
}
