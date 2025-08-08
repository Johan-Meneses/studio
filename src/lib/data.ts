
export const mockTransactions = [
  { id: '1', description: 'Suscripción a Spotify', category: 'Entretenimiento', amount: 30000, date: new Date(), type: 'expense' },
  { id: '2', description: 'Salario de Enero', category: 'Ingresos', amount: 2500000, date: new Date('2024-01-30'), type: 'income' },
  { id: '3', description: 'Compras de supermercado', category: 'Comida', amount: 250000, date: new Date('2024-01-28'), type: 'expense' },
  { id: '4', description: 'Café con amigos', category: 'Social', amount: 25000, date: new Date('2024-01-27'), type: 'expense' },
  { id: '5', description: 'Venta de artículo online', category: 'Ingresos', amount: 150000, date: new Date('2024-01-25'), type: 'income' },
  { id: '6', description: 'Factura de internet', category: 'Utilidades', amount: 120000, date: new Date('2024-01-22'), type: 'expense' },
];

export const mockMonthlySummary = {
  totalIncome: 3250000,
  totalExpense: 1245000,
  balance: 2005000,
};

export const mockExpenseByCategory = [
    { name: 'Transporte', value: 450000 },
    { name: 'Comida', value: 300000 },
    { name: 'Servicios', value: 200000 },
    { name: 'Entretenimiento', value: 150000 },
    { name: 'Otros', value: 100000 },
];

export const mockMonthlyTrends = [
  { month: 'Ene', income: 2800000, expense: 2000000 },
  { month: 'Feb', income: 3000000, expense: 2200000 },
  { month: 'Mar', income: 3100000, expense: 2300000 },
  { month: 'Abr', income: 2900000, expense: 2100000 },
  { month: 'May', income: 3200000, expense: 2400000 },
  { month: 'Jun', income: 3300000, expense: 2500000 },
];

export const mockAnnualDistribution = [
  { name: 'Comida', value: 5000000 },
  { name: 'Transporte', value: 3000000 },
  { name: 'Vivienda', value: 8000000 },
  { name: 'Entretenimiento', value: 2000000 },
  { name: 'Otros', value: 1500000 },
];
