import { z } from 'zod';

export type Transaction = {
  id: string;
  description: string;
  amount: number;
  date: Date;
  type: 'income' | 'expense';
  category: string; // This is the category ID
  categoryName?: string; // This is the category name, optional
  userId: string;
};

export type Category = {
  id: string;
  name: string;
  userId: string;
};

export type Goal = {
    id: string;
    userId: string;
    goalName: string;
    targetAmount: number;
    currentAmount: number;
    goalType: 'saving' | 'debt';
    timeframe: 'Corto Plazo' | 'Mediano Plazo' | 'Largo Plazo';
    targetDate?: Date;
    imageUrl?: string;
    createdAt: Date;
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

const signupSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string(),
});

export type SignupFormData = z.infer<typeof signupSchema>;
