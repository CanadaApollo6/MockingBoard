import * as React from 'react';
import { cn } from '@/lib/utils';

function Select({ className, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="select"
      className={cn(
        'rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Select };
