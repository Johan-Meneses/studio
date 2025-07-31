import { z } from 'zod';

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
