'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
import {
    Landmark,
    ShoppingBag,
    Wallet,
    MoreHorizontal,
    Pencil,
    Trash2,
    PlusCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, getDoc } from 'firebase/firestore';
import type { Transaction, Category } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

function SummaryCard({ title, value, icon: Icon, description }: { title: string; value: string; icon: React.ElementType; description: string; }) {
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
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

    useEffect(() => {
        if (!user) return;

        const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const categoriesQuery = query(collection(db, 'categories'), where('userId', '==', user.uid));

        const unsubscribeTransactions = onSnapshot(transactionsQuery, async (snapshot) => {
            const userTransactions: Transaction[] = [];
            for (const doc of snapshot.docs) {
                const data = doc.data();
                const transaction: Transaction = {
                    id: doc.id,
                    ...data,
                    date: data.date.toDate(),
                } as Transaction;

                if (transaction.category) {
                     const categoryDoc = await getDoc(doc(db, 'categories', transaction.category));
                     if(categoryDoc.exists()) {
                        transaction.categoryName = categoryDoc.data().name;
                     }
                }
                userTransactions.push(transaction);
            }
            setTransactions(userTransactions.sort((a, b) => b.date.getTime() - a.date.getTime()));
        });

        const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
            const userCategories: Category[] = [];
            snapshot.forEach((doc) => {
                userCategories.push({ id: doc.id, ...doc.data() } as Category);
            });
            setCategories(userCategories);
        });

        return () => {
            unsubscribeTransactions();
            unsubscribeCategories();
        };
    }, [user]);

    const handleDeleteTransaction = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'transactions', id));
            toast({ title: 'Transacción Eliminada', description: 'La transacción ha sido eliminada con éxito.' });
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo eliminar la transacción.', variant: 'destructive' });
        }
    };
    
    const handleEditTransaction = (transaction: Transaction) => {
        setEditingTransaction(transaction);
    };

    const monthlySummary = useMemo(() => {
        const now = new Date();
        const currentMonthTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            return tDate.getFullYear() === now.getFullYear() && tDate.getMonth() === now.getMonth();
        });

        const totalIncome = currentMonthTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = currentMonthTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const balance = totalIncome - totalExpense;

        return { totalIncome, totalExpense, balance };
    }, [transactions]);
    
    const expenseByCategory = useMemo(() => {
        const now = new Date();
        const expenseTransactions = transactions.filter(t =>
            t.type === 'expense' &&
            new Date(t.date).getFullYear() === now.getFullYear() &&
            new Date(t.date).getMonth() === now.getMonth()
        );

        const distribution = expenseTransactions.reduce((acc, t) => {
            const categoryName = t.categoryName || 'Sin Categoría';
            acc[categoryName] = (acc[categoryName] || 0) + t.amount;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(distribution)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [transactions, categories]);


  return (
    <MainLayout>
      <PageHeader title="Panel">
        <AddTransactionDialog categories={categories} transaction={editingTransaction} onOpenChange={(isOpen) => !isOpen && setEditingTransaction(null)}>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Agregar Transacción
            </Button>
        </AddTransactionDialog>
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SummaryCard title="Ingresos Totales" value={formatCurrency(monthlySummary.totalIncome)} icon={Landmark} description="Ingresos de este mes" />
          <SummaryCard title="Gastos Totales" value={formatCurrency(monthlySummary.totalExpense)} icon={ShoppingBag} description="Gastos de este mes" />
          <SummaryCard title="Saldo" value={formatCurrency(monthlySummary.balance)} icon={Wallet} description="Tu saldo actual este mes" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
            <CardHeader>
                <CardTitle>Transacciones Recientes</CardTitle>
                <CardDescription>
                    Aquí están las últimas transacciones registradas.
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
                        {transactions.slice(0, 5).map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell className="font-medium px-2 break-words">
                                  {transaction.description}
                                </TableCell>
                                <TableCell className="px-2">
                                    <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className={transaction.type === 'income' ? 'bg-green-100 text-green-800' : ''}>
                                        {transaction.categoryName || 'Sin Categoría'}
                                    </Badge>
                                </TableCell>
                                <TableCell className={`text-right font-medium px-2 ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
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
                                      <AddTransactionDialog categories={categories} transaction={transaction} onOpenChange={(isOpen) => !isOpen && setEditingTransaction(null)}>
                                        <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                                            <Pencil className="mr-2 h-4 w-4" />
                                            <span>Editar</span>
                                        </button>
                                       </AddTransactionDialog>
                                      <DropdownMenuItem onClick={() => handleDeleteTransaction(transaction.id)} className="text-red-500 focus:text-red-500">
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
            <CardContent className="h-[200px]">
                <ChartContainer config={{}} className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={expenseByCategory} layout="vertical" margin={{ left: -25, right: 10 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 7 }} width={45} />
                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent formatter={(value) => formatCurrency(value as number)} />} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
