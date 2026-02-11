import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input"
      className={cn(
        'rounded-md border bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50',
        '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
