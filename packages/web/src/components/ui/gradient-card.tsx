import * as React from 'react';

import { cn } from '@/lib/utils';

interface GradientCardProps extends React.ComponentProps<'div'> {
  /** Primary team/brand color (left side of gradient) */
  from: string;
  /** Secondary team/brand color (right side of gradient) */
  to: string;
}

function GradientCard({
  from,
  to,
  className,
  children,
  style,
  ...props
}: GradientCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl text-white shadow-sm',
        className,
      )}
      style={{
        background: `
          linear-gradient(135deg, ${from} 0%, ${to} 100%),
          radial-gradient(ellipse at 20% 50%, ${from}cc 0%, transparent 70%),
          radial-gradient(ellipse at 80% 20%, ${to}99 0%, transparent 60%)
        `,
        ...style,
      }}
      {...props}
    >
      {/* Noise texture overlay for watercolour feel */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '180px 180px',
        }}
      />
      {/* Soft radial wash for depth */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background: `radial-gradient(ellipse at 30% 0%, rgba(255,255,255,0.25) 0%, transparent 60%),
                       radial-gradient(ellipse at 100% 100%, rgba(0,0,0,0.15) 0%, transparent 50%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function GradientCardContent({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return <div className={cn('px-6 pb-5 pt-7 sm:px-8', className)} {...props} />;
}

export { GradientCard, GradientCardContent };
