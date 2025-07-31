import type { Transaction, Category } from './types';

export const mockTransactions: Transaction[] = [
  { id: '1', description: 'Groceries from SuperMart', amount: 75.5, date: new Date(2024, 6, 15), type: 'expense', category: 'Food' },
  { id: '2', description: 'Monthly Salary', amount: 3000, date: new Date(2024, 6, 1), type: 'income', category: 'Salary' },
  { id: '3', description: 'Internet Bill', amount: 60, date: new Date(2024, 6, 10), type: 'expense', category: 'Utilities' },
  { id: '4', description: 'Dinner with friends', amount: 120, date: new Date(2024, 6, 12), type: 'expense', category: 'Social' },
  { id: '5', description: 'New T-shirt', amount: 25, date: new Date(2024, 6, 18), type: 'expense', category: 'Shopping' },
  { id: '6', description: 'Gym Membership', amount: 40, date: new Date(2024, 6, 5), type: 'expense', category: 'Health' },
  { id: '7', description: 'Freelance Project Payment', amount: 500, date: new Date(2024, 6, 20), type: 'income', category: 'Freelance' },
  { id: '8', description: 'Gasoline', amount: 50, date: new Date(2024, 6, 22), type: 'expense', category: 'Transport' },
];

export const mockCategories: Category[] = [
  { id: '1', name: 'Food', userId: 'user1' },
  { id: '2', name: 'Utilities', userId: 'user1' },
  { id: '3', name: 'Social', userId: 'user1' },
  { id: '4', name: 'Shopping', userId: 'user1' },
  { id: '5', name: 'Health', userId: 'user1' },
  { id: '6', name: 'Transport', userId: 'user1' },
  { id: '7', name: 'Salary', userId: 'user1' },
  { id: '8', name: 'Freelance', userId: 'user1' },
  { id: '9', name: 'Other', userId: 'user1' },
];

export const mockMonthlySummary = {
  totalIncome: 3500,
  totalExpense: 370.5,
  balance: 3129.5,
};

export const mockExpenseByCategory = [
  { name: 'Food', value: 75.5, fill: 'var(--chart-1)' },
  { name: 'Utilities', value: 60, fill: 'var(--chart-2)' },
  { name: 'Social', value: 120, fill: 'var(--chart-3)' },
  { name: 'Shopping', value: 25, fill: 'var(--chart-4)' },
  { name: 'Health', value: 40, fill: 'var(--chart-5)' },
  { name: 'Transport', value: 50, fill: 'var(--chart-2)' },
];

export const mockMonthlyTrends = [
    { month: 'Jan', income: 3200, expense: 1800 },
    { month: 'Feb', income: 3100, expense: 2000 },
    { month: 'Mar', income: 3300, expense: 2100 },
    { month: 'Apr', income: 3400, expense: 1900 },
    { month: 'May', income: 3500, expense: 2200 },
    { month: 'Jun', income: 3600, expense: 2300 },
];

export const mockAnnualDistribution = [
    { name: 'Food', value: 5400, fill: 'var(--chart-1)' },
    { name: 'Utilities', value: 2400, fill: 'var(--chart-2)' },
    { name: 'Social', value: 3000, fill: 'var(--chart-3)' },
    { name: 'Shopping', value: 1500, fill: 'var(--chart-4)' },
    { name: 'Health', value: 1200, fill: 'var(--chart-5)' },
    { name: 'Transport', value: 1800, fill: 'var(--chart-2)' },
    { name: 'Other', value: 900, fill: 'var(--chart-3)' },
];
