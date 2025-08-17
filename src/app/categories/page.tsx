'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MainLayout } from '@/components/main-layout';
import { PageHeader } from '@/components/page-header';
import type { Category } from '@/lib/types';
import { PlusCircle, MoreHorizontal, Pencil, Trash2, ChevronRight, CornerDownRight } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { cn } from '@/lib/utils';
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

function CategoryDialog({ 
    category, 
    onSave, 
    children, 
    parentCategories,
    initialParentId,
    open,
    onOpenChange,
}: { 
    category?: Category | null, 
    onSave: (name: string, parentId?: string) => void, 
    children: React.ReactNode,
    parentCategories: Category[],
    initialParentId?: string,
    open: boolean,
    onOpenChange: (open: boolean) => void,
}) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (open) {
      setName(category?.name || '');
      setParentId(category?.parentId || initialParentId);
    } else {
        // Reset on close
        setName('');
        setParentId(undefined);
    }
  }, [open, category, initialParentId]);

  const handleSave = () => {
    onSave(name, parentId);
    onOpenChange(false);
  };
  
  const isSubcategoryAction = !!initialParentId || (!!category && !!category.parentId);
  const isCreatingNewParent = !category && !initialParentId;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Editar Categoría' : (initialParentId ? 'Agregar Subcategoría' : 'Agregar Categoría')}</DialogTitle>
          <DialogDescription>
            {category ? `Editando la categoría "${category.name}".` : 'Crea una nueva categoría para tus transacciones.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
            {!isCreatingNewParent && (
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="parent" className="text-right">
                    Principal
                    </Label>
                    <Select value={parentId || 'none'} onValueChange={(value) => setParentId(value === 'none' ? undefined : value)} disabled={!!initialParentId && !category}>
                        <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Categoría Principal (Opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">Ninguna (categoría principal)</SelectItem>
                            {parentCategories.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
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

function CategoryRow({ category, level, onEdit, onDelete, onAddSubcategory, hasChildren, isExpanded, onToggleExpand }: { 
    category: Category, 
    level: number, 
    onEdit: (category: Category) => void,
    onDelete: (category: Category) => void,
    onAddSubcategory: (parentId: string) => void,
    hasChildren: boolean,
    isExpanded: boolean,
    onToggleExpand: (categoryId: string) => void,
}) {
    return (
        <div className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md">
            <div className="flex items-center">
                 {hasChildren && (
                    <button onClick={() => onToggleExpand(category.id)} className="p-1">
                        <ChevronRight className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")} />
                    </button>
                )}
                <span className="font-medium" style={{ marginLeft: `${level * 20 + (!hasChildren ? 28 : 0)}px` }}>
                   {level > 0 && <CornerDownRight className="inline-block h-4 w-4 mr-2 text-muted-foreground" />}
                    {category.name}
                </span>
            </div>
            <div className="flex items-center">
                {level === 0 && (
                     <Button variant="ghost" size="sm" onClick={() => onAddSubcategory(category.id)}>
                        <PlusCircle className="mr-1 h-4 w-4" /> Subcategoría
                    </Button>
                )}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => onEdit(category)}>
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
                                    Esta acción no se puede deshacer. Si esta categoría tiene subcategorías, también serán eliminadas.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(category)} className="bg-destructive hover:bg-destructive/90">Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
      </div>
    )
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [initialParentId, setInitialParentId] = useState<string | undefined>();
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

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

  const { categoryTree, parentCategories } = useMemo(() => {
    const categoryMap = new Map(categories.map(c => [c.id, {...c, children: [] as Category[]}]));
    const tree: (Category & { children: Category[] })[] = [];

    categories.forEach(cat => {
        const categoryWithChildren = categoryMap.get(cat.id)!;
        if (cat.parentId && categoryMap.has(cat.parentId)) {
            const parent = categoryMap.get(cat.parentId)!;
            if (parent.children) {
                parent.children.push(categoryWithChildren);
            } else {
                parent.children = [categoryWithChildren];
            }
        } else {
            tree.push(categoryWithChildren);
        }
    });
    
    const parentCats = categories.filter(c => !c.parentId);

    return { categoryTree: tree.sort((a,b) => a.name.localeCompare(b.name)), parentCategories: parentCats.sort((a,b) => a.name.localeCompare(b.name)) };
  }, [categories]);

  const handleSaveCategory = async (name: string, parentId?: string) => {
    if (!user) return;
    const categoryData = { name, userId: user.uid, parentId: parentId || null };

    try {
        if(editingCategory) {
            const categoryRef = doc(db, 'categories', editingCategory.id);
            await updateDoc(categoryRef, { name, parentId: parentId || null });
            toast({ title: 'Categoría Actualizada', description: `La categoría ha sido actualizada a "${name}".` });
        } else {
            await addDoc(collection(db, 'categories'), categoryData);
            toast({ title: 'Categoría Agregada', description: `"${name}" ha sido agregada.` });
        }
    } catch (error) {
       toast({ title: 'Error', description: 'No se pudo guardar la categoría.', variant: "destructive" });
    }
    
    setIsDialogOpen(false);
    setEditingCategory(null);
    setInitialParentId(undefined);
  };
  
  const handleDeleteCategory = async (category: Category) => {
    try {
        // Find all children recursively
        const childrenIdsToDelete: string[] = [];
        const findChildren = (parentId: string) => {
            const children = categories.filter(c => c.parentId === parentId);
            children.forEach(child => {
                childrenIdsToDelete.push(child.id);
                findChildren(child.id);
            });
        };
        findChildren(category.id);
        
        // Delete parent and all children
        const deletePromises = [deleteDoc(doc(db, 'categories', category.id))];
        childrenIdsToDelete.forEach(id => deletePromises.push(deleteDoc(doc(db, 'categories', id))));
        await Promise.all(deletePromises);

        toast({ title: 'Categoría Eliminada', description: `"${category.name}" y sus subcategorías han sido eliminadas.` });
    } catch (error) {
        toast({ title: 'Error', description: 'No se pudo eliminar la categoría.', variant: "destructive" });
    }
  };

  const openDialogForEdit = (category: Category) => {
      setEditingCategory(category);
      setInitialParentId(undefined);
      setIsDialogOpen(true);
  }

  const openDialogForAdd = (parentId?: string) => {
      setEditingCategory(null);
      setInitialParentId(parentId);
      setIsDialogOpen(true);
  }
  
  const toggleExpand = (categoryId: string) => {
      setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  }

  const renderCategory = (category: Category & { children: Category[] }, level: number) => {
      const isExpanded = !!expandedCategories[category.id];
      const sortedChildren = category.children.sort((a,b) => a.name.localeCompare(b.name));
      return (
          <div key={category.id}>
              <CategoryRow 
                category={category} 
                level={level}
                onEdit={openDialogForEdit}
                onDelete={handleDeleteCategory}
                onAddSubcategory={() => openDialogForAdd(category.id)}
                hasChildren={sortedChildren.length > 0}
                isExpanded={isExpanded}
                onToggleExpand={toggleExpand}
              />
              {isExpanded && sortedChildren.length > 0 && (
                  <div className="pl-4 border-l-2 ml-4">
                      {sortedChildren.map(child => renderCategory(child, level + 1))}
                  </div>
              )}
          </div>
      );
  };


  return (
    <MainLayout>
      <PageHeader title="Categorías">
        <Button onClick={() => openDialogForAdd()}>
            <PlusCircle className="mr-2 h-4 w-4" /> Agregar Categoría
        </Button>
      </PageHeader>
      
      <Card>
        <CardHeader>
          <CardTitle>Tus Categorías</CardTitle>
          <CardDescription>Administra tus categorías y subcategorías aquí.</CardDescription>
        </CardHeader>
        <CardContent>
            {categoryTree.length > 0 ? (
                 categoryTree.map(cat => renderCategory(cat, 0))
            ) : (
                <div className="text-center text-muted-foreground py-8">
                    No has creado ninguna categoría todavía.
                </div>
            )}
        </CardContent>
      </Card>

      <CategoryDialog 
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSave={handleSaveCategory}
        parentCategories={parentCategories}
        category={editingCategory}
        initialParentId={initialParentId}
      >
        <span />
      </CategoryDialog>
    </MainLayout>
  );
}
