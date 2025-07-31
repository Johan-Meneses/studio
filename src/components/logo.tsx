import { CircleDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 text-primary font-headline font-bold text-lg',
        className
      )}
    >
      <CircleDollarSign className="h-6 w-6" />
      <span>BudgetView</span>
    </div>
  );
}
