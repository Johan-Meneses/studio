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
import { Progress } from '@/components/ui/progress';
import {
    Landmark,
    ShoppingBag,
    Wallet,
    MoreHorizontal,
    Pencil,
    Trash2,
    PlusCircle,
    Target,
    PiggyBank
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc, writeBatch, increment } from 'firebase/firestore';
import type { Transaction, Category, Goal } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function DashboardPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);

    const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

    useEffect(() => {
        if (!user) return;

        const transactionsQuery = query(collection(db, 'transactions'), where('userId', '==', user.uid));
        const categoriesQuery = query(collection(db, 'categories'), where('userId', '==', user.uid));
        const goalsQuery = query(collection(db, 'goals'), where('userId', '==', user.uid));

        const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
            const userTransactions: Transaction[] = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: data.date.toDate(),
                } as Transaction;
            });
            setTransactions(userTransactions.sort((a, b) => b.date.getTime() - a.date.getTime()));
        });

        const unsubscribeCategories = onSnapshot(categoriesQuery, (snapshot) => {
            const userCategories: Category[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
            setCategories(userCategories);
        });
        
        const unsubscribeGoals = onSnapshot(goalsQuery, (snapshot) => {
            const userGoals: Goal[] = snapshot.docs.map(doc => {
                 const data = doc.data();
                 if (!data.createdAt) return null;
                 return {
                    id: doc.id,
                    ...data,
                    targetDate: data.targetDate?.toDate(),
                    createdAt: data.createdAt.toDate(),
                 } as Goal;
            }).filter((goal): goal is Goal => goal !== null);
            setGoals(userGoals);
        });

        return () => {
            unsubscribeTransactions();
            unsubscribeCategories();
            unsubscribeGoals();
        };
    }, [user]);

    const handleDeleteTransaction = async (transaction: Transaction) => {
        const batch = writeBatch(db);
        try {
            const transactionRef = doc(db, 'transactions', transaction.id);
            batch.delete(transactionRef);

            if (transaction.type === 'saving' && transaction.linkedGoalId) {
                const goalRef = doc(db, 'goals', transaction.linkedGoalId);
                // Revert the amount from the goal
                batch.update(goalRef, { currentAmount: increment(-transaction.amount) });
            }
            
            await batch.commit();
            toast({ title: 'Transacción Eliminada', description: 'La transacción ha sido eliminada.' });
        } catch (error) {
            toast({ title: 'Error', description: 'No se pudo eliminar la transacción.', variant: 'destructive' });
        }
    };

    const transactionsWithCategoryNames = useMemo(() => {
        const categoryMap = new Map(categories.map(c => [c.id, c]));
        return transactions.map(t => {
            if (t.type === 'saving') {
                 return { ...t, categoryName: 'Ahorro a Meta' };
            }
            if (!t.category) {
                return { ...t, categoryName: 'Sin Categoría' };
            }
            const category = categoryMap.get(t.category);
            if (!category) {
                return { ...t, categoryName: 'Sin Categoría' };
            }

            if (category.parentId && categoryMap.has(category.parentId)) {
                const parentCategory = categoryMap.get(category.parentId);
                return {
                    ...t,
                    categoryName: `${parentCategory!.name} > ${category.name}`
                };
            }

            return { ...t, categoryName: category.name };
        });
    }, [transactions, categories]);
    
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

        const totalSaving = currentMonthTransactions
            .filter(t => t.type === 'saving')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const balance = totalIncome - totalExpense - totalSaving;

        return { totalIncome, totalExpense, totalSaving, balance };
    }, [transactions]);
    
    const expenseByCategory = useMemo(() => {
        const now = new Date();
        const expenseTransactions = transactionsWithCategoryNames.filter(t =>
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
    }, [transactionsWithCategoryNames]);

    const upcomingGoals = useMemo(() => {
        return goals
            .map(goal => ({
                ...goal,
                progress: (goal.currentAmount / goal.targetAmount) * 100
            }))
            .sort((a, b) => b.progress - a.progress)
            .slice(0, 2);
    }, [goals]);


  return (
    <MainLayout>
      <PageHeader title="Panel">
        <Button onClick={() => setIsAddTransactionOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Agregar Transacción
        </Button>
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard title="Ingresos Totales" value={formatCurrency(monthlySummary.totalIncome)} icon={Landmark} description="Ingresos de este mes" />
          <SummaryCard title="Gastos Totales" value={formatCurrency(monthlySummary.totalExpense)} icon={ShoppingBag} description="Gastos de este mes" />
          <SummaryCard title="Ahorros a Metas" value={formatCurrency(monthlySummary.totalSaving)} icon={PiggyBank} description="Ahorros de este mes" />
          <SummaryCard title="Saldo Disponible" value={formatCurrency(monthlySummary.balance)} icon={Wallet} description="Tu saldo actual este mes" />
      </div>

      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-7">
         <Card className="lg:col-span-4">
            <CardHeader>
                <CardTitle>Metas de Ahorro</CardTitle>
                <CardDescription>
                    Tus metas financieras más importantes.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {goals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                        <Target className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">Aún no tienes metas</h3>
                        <p className="text-muted-foreground mb-4">Crea tu primera meta de ahorro para empezar.</p>
                        <Button asChild>
                            <Link href="/goals">Crear Meta</Link>
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {upcomingGoals.map(goal => (
                            <div key={goal.id}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-medium">{goal.goalName}</span>
                                    <span className="text-xs text-muted-foreground">{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                                </div>
                                <Progress value={goal.progress} />
                            </div>
                        ))}
                         {goals.length > 2 && (
                            <div className="text-center mt-4">
                                <Button variant="link" asChild>
                                    <Link href="/goals">Ver todas las metas</Link>
                                </Button>
                            </div>
                         )}
                    </div>
                )}
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
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {expenseByCategory.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </ChartContainer>
            </CardContent>
        </Card>
      </div>
      
       <Card>
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
                        {transactionsWithCategoryNames.slice(0, 5).map((transaction) => (
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
                                            <DropdownMenuItem onSelect={() => setEditingTransaction(transaction)}>
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
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
        
        <AddTransactionDialog 
            open={isAddTransactionOpen || !!editingTransaction}
            onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setEditingTransaction(null);
                    setIsAddTransactionOpen(false);
                } else {
                    // This case is handled by the buttons themselves
                }
            }}
            transaction={editingTransaction} 
            categories={categories}
            goals={goals}
        />
    </MainLayout>
  );
}
