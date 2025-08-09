'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MainLayout } from '@/components/main-layout';
import { PageHeader } from '@/components/page-header';
import { Progress } from '@/components/ui/progress';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { Goal } from '@/lib/types';
import { collection, query, where, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, Target } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';
import { GoalDialog } from '@/components/goal-dialog';
import { AddSavingsDialog } from '@/components/add-savings-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function GoalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [isSavingsDialogOpen, setIsSavingsDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(amount);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userGoals = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          targetDate: data.targetDate?.toDate(),
          createdAt: data.createdAt.toDate(),
        } as Goal;
      });
      setGoals(userGoals.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()));
    });
    return () => unsubscribe();
  }, [user]);

  const handleEdit = (goal: Goal) => {
    setSelectedGoal(goal);
    setIsGoalDialogOpen(true);
  };
  
  const handleAddSavings = (goal: Goal) => {
      setSelectedGoal(goal);
      setIsSavingsDialogOpen(true);
  }

  const handleDelete = async (goalId: string) => {
      try {
          await deleteDoc(doc(db, 'goals', goalId));
          toast({ title: 'Meta eliminada', description: 'Tu meta de ahorro ha sido eliminada.'});
      } catch (error) {
          toast({ title: 'Error', description: 'No se pudo eliminar la meta.', variant: 'destructive' });
      }
  }

  return (
    <MainLayout>
      <PageHeader title="Metas de Ahorro">
        <Button onClick={() => { setSelectedGoal(null); setIsGoalDialogOpen(true); }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Crear Meta
        </Button>
      </PageHeader>

      {goals.length === 0 ? (
        <Card className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed">
            <Target className="h-16 w-16 text-muted-foreground mb-4" />
            <CardTitle className="text-xl mb-2">Comienza a Ahorrar para tus Sueños</CardTitle>
            <CardDescription className="mb-6 max-w-md">
                No tienes ninguna meta de ahorro todavía. ¡Crear una es el primer paso para alcanzar tus objetivos financieros!
            </CardDescription>
            <Button onClick={() => { setSelectedGoal(null); setIsGoalDialogOpen(true); }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear mi Primera Meta
            </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const progress = (goal.currentAmount / goal.targetAmount) * 100;
            const remaining = goal.targetAmount - goal.currentAmount;

            return (
              <Card key={goal.id} className="flex flex-col">
                <CardHeader>
                  <div className="relative aspect-video w-full mb-4 rounded-lg overflow-hidden">
                     <Image
                        src={goal.imageUrl || "https://placehold.co/600x400.png"}
                        alt={goal.goalName}
                        layout="fill"
                        objectFit="cover"
                        data-ai-hint="goal savings"
                      />
                  </div>
                  <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>{goal.goalName}</CardTitle>
                        <CardDescription>{goal.timeframe}</CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => handleEdit(goal)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Editar</span>
                        </DropdownMenuItem>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full text-red-500 focus:text-red-500">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Eliminar</span>
                                </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Esto eliminará permanentemente tu meta de ahorro.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(goal.id)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div>
                    <div className="mb-2">
                      <Progress value={progress} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-bold text-primary">{formatCurrency(goal.currentAmount)}</span> de {formatCurrency(goal.targetAmount)}
                    </p>
                    {remaining > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Te faltan {formatCurrency(remaining)} para alcanzar tu meta.
                      </p>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" onClick={() => handleAddSavings(goal)}>Añadir Ahorro</Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <GoalDialog
        open={isGoalDialogOpen}
        onOpenChange={setIsGoalDialogOpen}
        goal={selectedGoal}
        onClose={() => setSelectedGoal(null)}
      />
      
      <AddSavingsDialog
        open={isSavingsDialogOpen}
        onOpenChange={setIsSavingsDialogOpen}
        goal={selectedGoal}
        onClose={() => setSelectedGoal(null)}
      />
    </MainLayout>
  );
}
