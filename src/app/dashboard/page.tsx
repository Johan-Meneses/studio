'use client';
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
} from 'lucide-react';
import { mockTransactions, mockMonthlySummary, mockExpenseByCategory } from '@/lib/data';
import { format } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
    const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

  return (
    <MainLayout>
      <PageHeader title="Panel">
        <AddTransactionDialog />
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SummaryCard title="Ingresos Totales" value={formatCurrency(mockMonthlySummary.totalIncome)} icon={Landmark} description="+ $500.000 este mes" />
          <SummaryCard title="Gastos Totales" value={formatCurrency(mockMonthlySummary.totalExpense)} icon={ShoppingBag} description="+ $120.000 este mes" />
          <SummaryCard title="Saldo" value={formatCurrency(mockMonthlySummary.balance)} icon={Wallet} description="Tu saldo actual" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
            <CardHeader>
                <CardTitle>Transacciones Recientes</CardTitle>
                <CardDescription>
                    Aquí están las últimas transacciones de este mes.
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
                        {mockTransactions.slice(0, 5).map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell className="font-medium px-2">
                                  {transaction.description}
                                </TableCell>
                                <TableCell className="px-2">
                                    <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className={transaction.type === 'income' ? 'bg-green-100 text-green-800' : ''}>
                                        {transaction.category}
                                    </Badge>
                                </TableCell>
                                <TableCell className={`text-right font-medium px-2 ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                </TableCell>
                                <TableCell className="hidden md:table-cell px-2">{format(transaction.date, 'MMM dd, yyyy')}</TableCell>
                                <TableCell className="text-right px-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Abrir menú</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        <span>Editar</span>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem className="text-red-500 focus:text-red-500">
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
                         <BarChart data={mockExpenseByCategory} layout="vertical" margin={{ left: -25, right: 10 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 7 }} width={45} />
                            <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} content={<ChartTooltipContent />} />
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
