'use client';

import { useState } from 'react';
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
import { mockCategories } from '@/lib/data';
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

function CategoryDialog({ category, onSave, children }: { category?: Category | null, onSave: (name: string) => void, children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(category?.name || '');

  const handleSave = () => {
    onSave(name);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Edit Category' : 'Add Category'}</DialogTitle>
          <DialogDescription>
            {category ? `Editing the category "${category.name}".` : 'Create a new category for your transactions.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="e.g., Groceries"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState(mockCategories);
  const { toast } = useToast();

  const handleAddCategory = (name: string) => {
    const newCategory: Category = {
      id: (categories.length + 1).toString(),
      name,
      userId: 'user1',
    };
    setCategories([...categories, newCategory]);
    toast({ title: "Category Added", description: `"${name}" has been added.` });
  };

  const handleEditCategory = (id: string, name: string) => {
    setCategories(categories.map(c => c.id === id ? { ...c, name } : c));
     toast({ title: "Category Updated", description: `Category has been updated to "${name}".` });
  };
  
  const handleDeleteCategory = (id: string) => {
    const categoryName = categories.find(c => c.id === id)?.name;
    setCategories(categories.filter(c => c.id !== id));
    toast({ title: "Category Deleted", description: `"${categoryName}" has been deleted.` });
  };


  return (
    <MainLayout>
      <PageHeader title="Categories">
        <CategoryDialog onSave={handleAddCategory}>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Category
            </Button>
        </CategoryDialog>
      </PageHeader>
      
      <Card>
        <CardHeader>
          <CardTitle>Your Categories</CardTitle>
          <CardDescription>Manage your custom spending categories here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Actions</TableHead>
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
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <CategoryDialog category={category} onSave={(name) => handleEditCategory(category.id, name)}>
                            <button className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full">
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </button>
                        </CategoryDialog>
                        <DropdownMenuItem onClick={() => handleDeleteCategory(category.id)} className="text-red-500 focus:text-red-500 focus:bg-red-50">
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>Delete</span>
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
