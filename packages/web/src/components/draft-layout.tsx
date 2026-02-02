import type { ReactNode } from 'react';

interface DraftLayoutProps {
  clock: ReactNode;
  board: ReactNode;
  sidebar?: ReactNode;
  banner?: ReactNode;
}

export function DraftLayout({
  clock,
  board,
  sidebar,
  banner,
}: DraftLayoutProps) {
  return (
    <div className="space-y-4">
      {banner}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Left column — clock + board */}
        <div className="space-y-4">
          <div className="lg:sticky lg:top-4 lg:z-10">{clock}</div>
          {board}
        </div>

        {/* Right column — sidebar (player picker, trades, etc.) */}
        {sidebar && (
          <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            {sidebar}
          </div>
        )}
      </div>
    </div>
  );
}
