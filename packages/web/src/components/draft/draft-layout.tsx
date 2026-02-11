'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface DraftLayoutProps {
  clock: ReactNode;
  board: ReactNode;
  sidebar?: ReactNode;
  banner?: ReactNode;
  mobileLabel?: string;
}

export function DraftLayout({
  clock,
  board,
  sidebar,
  banner,
  mobileLabel = 'Draft Room',
}: DraftLayoutProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="space-y-4">
      {banner}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left column — clock + board */}
        <div className="space-y-4">
          <div className="lg:sticky lg:top-4 lg:z-10 rounded-lg bg-card p-3">
            {clock}
          </div>
          {board}
        </div>

        {/* Desktop sidebar */}
        {sidebar && (
          <div className="hidden space-y-4 lg:sticky lg:top-4 lg:self-start lg:block">
            {sidebar}
          </div>
        )}
      </div>

      {/* Mobile: sticky bottom bar + Sheet */}
      {sidebar && (
        <>
          <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card p-3 lg:hidden">
            <Button className="w-full" onClick={() => setSheetOpen(true)}>
              {mobileLabel}
            </Button>
          </div>
          {/* Spacer so content doesn't sit behind fixed bar */}
          <div className="h-16 lg:hidden" />

          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
              <SheetHeader>
                <SheetTitle>{mobileLabel}</SheetTitle>
              </SheetHeader>
              <div className="mt-4 space-y-4">{sidebar}</div>
            </SheetContent>
          </Sheet>
        </>
      )}
    </div>
  );
}
