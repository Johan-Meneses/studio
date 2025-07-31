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
    Pencil,
    Trash2,
} from 'lucide-react';
import { mockTransactions, mockMonthlySummary, mockExpenseByCategory } from '@/lib/data';
import { format } from 'date-fns';
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

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
    const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <MainLayout>
      <PageHeader title="Dashboard">
        <AddTransactionDialog />
      </PageHeader>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <SummaryCard title="Total Income" value={formatCurrency(mockMonthlySummary.totalIncome)} icon={Landmark} description="+ $500 this month" />
          <SummaryCard title="Total Expenses" value={formatCurrency(mockMonthlySummary.totalExpense)} icon={ShoppingBag} description="+ $120 this month" />
          <SummaryCard title="Balance" value={formatCurrency(mockMonthlySummary.balance)} icon={Wallet} description="Your current balance" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="lg:col-span-4">
            <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                    Here are the latest transactions for this month.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Description</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead className="hidden md:table-cell">Date</TableHead>
                            <TableHead><span className="sr-only">Actions</span></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {mockTransactions.slice(0, 5).map((transaction) => (
                            <TableRow key={transaction.id}>
                                <TableCell className="font-medium">{transaction.description}</TableCell>
                                <TableCell>
                                    <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'} className={transaction.type === 'income' ? 'bg-green-100 text-green-800' : ''}>
                                        {transaction.category}
                                    </Badge>
                                </TableCell>
                                <TableCell className={`text-right font-medium ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                                </TableCell>
                                <TableCell className="hidden md:table-cell">{format(transaction.date, 'MMM dd, yyyy')}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon"><Pencil className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4" /></Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Card className="lg:col-span-3">
            <CardHeader>
                <CardTitle>Expense Distribution</CardTitle>
                <CardDescription>A look at your spending by category this month.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={{}} className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                         <BarChart data={mockExpenseByCategory} layout="vertical" margin={{ left: 10, right: 10 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} width={80} />
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
