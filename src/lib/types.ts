export type Transaction = {
  id: string;
  description: string;
  amount: number;
  date: Date;
  type: 'income' | 'expense';
  category: string;
};

export type Category = {
  id: string;
  name: string;
  userId: string;
};
