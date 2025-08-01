'use client';
import { useState, useEffect, useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/main-layout';
import { PageHeader } from '@/components/page-header';
import { AddTransactionDialog } from '@/components/add-transaction-dialog';
import { Landmark, ShoppingBag, Wallet, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import type { Transaction, Category } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

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
      setTransactions(userTransactions.sort((a, b) => b.date.getTime() - a.date.getTime()));
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

  const monthlySummary = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });
    
    const totalIncome = monthlyTransactions
      .filter((t) => t.type === 'income')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalExpense = monthlyTransactions
      .filter((t) => t.type === 'expense')
      .reduce((acc, t) => acc + t.amount, 0);

    const balance = transactions.reduce((acc, t) => {
        return t.type === 'income' ? acc + t.amount : acc - t.amount;
    }, 0);


    return { totalIncome, totalExpense, balance };
  }, [transactions]);

  const expenseByCategory = useMemo(() => {
    const now = new Date();
    const monthlyExpenses = transactions.filter(
      (t) =>
        t.type === 'expense' &&
        new Date(t.date).getMonth() === now.getMonth() &&
        new Date(t.date).getFullYear() === now.getFullYear()
    );

    const distribution = monthlyExpenses.reduce((acc, t) => {
      const categoryName = categories.find(c => c.id === t.category)?.name || 'Sin Categoría';
      if (!acc[categoryName]) {
        acc[categoryName] = 0;
      }
      acc[categoryName] += t.amount;
      return acc;
    }, {} as { [key: string]: number });

    return Object.entries(distribution).map(([name, value], index) => ({ name, value, fill: COLORS[index % COLORS.length] }));
  }, [transactions, categories]);


  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
      toast({
        title: 'Transacción Eliminada',
        description: 'La transacción ha sido eliminada exitosamente.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo eliminar la transacción.',
      });
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || 'Sin categoría';
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  return (
    <MainLayout>
      <PageHeader title="Panel">
        <AddTransactionDialog categories={categories} />
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          title="Ingresos Totales"
          value={formatCurrency(monthlySummary.totalIncome)}
          icon={Landmark}
          description="Ingresos de este mes"
        />
        <SummaryCard
          title="Gastos Totales"
          value={formatCurrency(monthlySummary.totalExpense)}
          icon={ShoppingBag}
          description="Gastos de este mes"
        />
        <SummaryCard
          title="Saldo"
          value={formatCurrency(monthlySummary.balance)}
          icon={Wallet}
          description="Tu saldo actual"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Transacciones Recientes</CardTitle>
            <CardDescription>Aquí están las últimas transacciones de este mes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 5).map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">{transaction.description}</TableCell>
                    <TableCell>
                      <Badge
                        variant={transaction.type === 'income' ? 'default' : 'secondary'}
                        className={transaction.type === 'income' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {getCategoryName(transaction.category)}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {format(new Date(transaction.date), 'dd MMM, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                       <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menú</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                           <AddTransactionDialog transaction={transaction} categories={categories}>
                                <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                                    <Pencil className="mr-2 h-4 w-4" />
                                    <span>Editar</span>
                                </button>
                            </AddTransactionDialog>
                          <DropdownMenuItem onClick={() => handleDeleteTransaction(transaction.id)} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Eliminar</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Distribución de Gastos</CardTitle>
            <CardDescription>Un vistazo a tus gastos por categoría este mes.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expenseByCategory} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip
                    cursor={{ fill: 'hsl(var(--muted))' }}
                    content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {expenseByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
