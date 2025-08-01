'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/main-layout';
import { PageHeader } from '@/components/page-header';
import type { Category } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';

function CategoryDialog({ category, onSave, children }: { category?: Category | null, onSave: (name: string) => void, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      setName(category?.name || '');
    }
  }, [open, category]);

  const handleSave = () => {
    if (name.trim()) {
      onSave(name.trim());
      setOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Editar Categoría' : 'Agregar Categoría'}</DialogTitle>
          <DialogDescription>
            {category ? `Editando la categoría "${category.name}".` : 'Crea una nueva categoría para tus transacciones.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Ej., Comestibles"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Guardar cambios</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'categories'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userCategories: Category[] = [];
      querySnapshot.forEach((doc) => {
        userCategories.push({ id: doc.id, ...doc.data() } as Category);
      });
      setCategories(userCategories);
    });

    return () => unsubscribe();
  }, [user]);

  const handleAddCategory = async (name: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'categories'), {
        name,
        userId: user.uid,
      });
      toast({ title: 'Categoría Agregada', description: `"${name}" ha sido agregada.` });
    } catch (error) {
       toast({ title: 'Error', description: 'No se pudo agregar la categoría.', variant: "destructive" });
    }
  };

  const handleEditCategory = async (id: string, name: string) => {
    try {
        const categoryRef = doc(db, 'categories', id);
        await updateDoc(categoryRef, { name });
        toast({ title: 'Categoría Actualizada', description: `La categoría ha sido actualizada a "${name}".` });
    } catch (error) {
        toast({ title: 'Error', description: 'No se pudo actualizar la categoría.', variant: "destructive" });
    }
  };
  
  const handleDeleteCategory = async (id: string) => {
    try {
        const categoryName = categories.find(c => c.id === id)?.name;
        await deleteDoc(doc(db, 'categories', id));
        toast({ title: 'Categoría Eliminada', description: `"${categoryName}" ha sido eliminada.` });
    } catch (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar la categoría.', variant: "destructive" });
    }
  };


  return (
    <MainLayout>
      <PageHeader title="Categorías">
        <CategoryDialog onSave={handleAddCategory}>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Agregar Categoría
            </Button>
        </CategoryDialog>
      </PageHeader>
      
      <Card>
        <CardHeader>
          <CardTitle>Tus Categorías</CardTitle>
          <CardDescription>Administra tus categorías de gastos personalizadas aquí.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Abrir menú</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <CategoryDialog category={category} onSave={(name) => handleEditCategory(category.id, name)}>
                            <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Editar</span>
                            </button>
                        </CategoryDialog>
                        <DropdownMenuItem onClick={() => handleDeleteCategory(category.id)} className="text-red-500 focus:text-red-500 focus:bg-red-50">
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
    </MainLayout>
  );
}
