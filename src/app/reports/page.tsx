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
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
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
  setDate,
}: React.HTMLAttributes<HTMLDivElement> & { date: DateRange | undefined, setDate: (date: DateRange | undefined) => void }) {
  
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
                  {format(date.from, 'LLL dd, y')} -{' '}
                  {format(date.to, 'LLL dd, y')}
                </>
              ) : (
                format(date.from, 'LLL dd, y')
              )
            ) : (
              <span>Elige un rango</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date()),
  });

  const chartConfig = {
    income: { label: 'Ingresos', color: "hsl(var(--chart-1))" },
    expense: { label: 'Gastos', color: "hsl(var(--chart-2))" },
  };

  const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  useEffect(() => {
    if (!user) return;

    const transQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const catQuery = query(collection(db, 'categories'), where('userId', '==', user.uid));

    const unsubTransactions = onSnapshot(transQuery, (snapshot) => {
      const userTransactions: Transaction[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      } as Transaction));
      setTransactions(userTransactions);
    });

    const unsubCategories = onSnapshot(catQuery, (snapshot) => {
      const userCategories: Category[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      } as Category));
      setCategories(userCategories);
    });

    return () => {
      unsubTransactions();
      unsubCategories();
    };
  }, [user]);

  const filteredTransactions = useMemo(() => {
    if (!date?.from || !date?.to) return [];
    return transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= date.from! && tDate <= date.to!;
    });
  }, [transactions, date]);

  const monthlyTrends = useMemo(() => {
    const trends: { [key: string]: { income: number; expense: number } } = {};
    const sixMonthsAgo = startOfMonth(subMonths(new Date(), 5));

    for (let i = 0; i < 6; i++) {
        const monthDate = subMonths(new Date(), 5-i);
        const monthKey = format(monthDate, 'MMM yyyy', { locale: es });
        trends[monthKey] = { income: 0, expense: 0 };
    }
    
    transactions.forEach(t => {
      const tDate = new Date(t.date);
      if (tDate < sixMonthsAgo) return;

      const monthKey = format(tDate, 'MMM yyyy', { locale: es });
      if (trends[monthKey]) {
        if (t.type === 'income') {
          trends[monthKey].income += t.amount;
        } else {
          trends[monthKey].expense += t.amount;
        }
      }
    });

    return Object.entries(trends).map(([month, { income, expense }]) => ({ month, income, expense }));
  }, [transactions]);


  const annualSpending = useMemo(() => {
    const distribution: { [key: string]: number } = {};

    filteredTransactions.forEach(t => {
      if (t.type === 'expense') {
        const categoryName = categories.find(c => c.id === t.category)?.name || 'Sin Categoría';
        if (!distribution[categoryName]) {
          distribution[categoryName] = 0;
        }
        distribution[categoryName] += t.amount;
      }
    });

    return Object.entries(distribution).map(([name, value]) => ({ name, value }));
  }, [filteredTransactions, categories]);

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Sin categoría';
  };
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  return (
    <MainLayout>
      <PageHeader title="Reportes">
        <DateRangePicker date={date} setDate={setDate} />
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tendencias Mensuales</CardTitle>
            <CardDescription>Ingresos vs. Gastos en los últimos 6 meses.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
             <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrends} margin={{ top: 20, right: 10, bottom: 0, left: -25 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} tick={{ fontSize: 8 }} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value) / 1000000}M`} tick={{ fontSize: 8 }} />
                  <Tooltip content={<ChartTooltipContent formatter={(value, name) => <div><p className="capitalize">{name === 'income' ? 'Ingresos' : 'Gastos'}</p><p>{formatCurrency(value as number)}</p></div>} />} />
                  <Legend wrapperStyle={{fontSize: "12px", paddingTop: "10px"}} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                  <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
             </ChartContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Gastos Anuales</CardTitle>
            <CardDescription>Distribución de tus gastos por categoría en el período seleccionado.</CardDescription>
          </CardHeader>
          <CardContent className="h-[280px] flex items-center justify-center">
            <ChartContainer config={{}} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<ChartTooltipContent nameKey="name" formatter={(value) => formatCurrency(value as number)} />} />
                  <Pie
                    data={annualSpending}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    labelLine={false}
                    label={({
                      cx,
                      cy,
                      midAngle,
                      innerRadius,
                      outerRadius,
                      percent,
                      index
                    }) => {
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                      const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                      if (percent < 0.05) return null;
                      return (
                        <text
                          x={x}
                          y={y}
                          fill="white"
                          textAnchor={x > cx ? "start" : "end"}
                          dominantBaseline="central"
                          className="text-xs font-medium"
                        >
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                     {annualSpending.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend wrapperStyle={{fontSize: "10px", paddingTop: "10px"}}/>
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
