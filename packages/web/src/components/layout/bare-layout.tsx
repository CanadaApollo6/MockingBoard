'use client';

import { useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseOverlayTheme } from '@/lib/overlay-theme';

interface BareLayoutProps {
  children: ReactNode;
  className?: string;
}

export function BareLayout({ children, className = '' }: BareLayoutProps) {
  const searchParams = useSearchParams();
  const theme = parseOverlayTheme(searchParams.get('theme'));

  useEffect(() => {
    const el = document.documentElement;

    if (theme === 'dark' || theme === 'transparent') {
      el.classList.add('dark');
    } else {
      el.classList.remove('dark');
    }

    if (theme === 'transparent') {
      document.body.style.backgroundColor = 'transparent';
    }

    return () => {
      document.body.style.backgroundColor = '';
    };
  }, [theme]);

  return <div className={className}>{children}</div>;
}
