import type { FrontOfficeStaff } from '@mockingboard/shared';

export function FrontOffice({
  staff,
  teamColors,
}: {
  staff: FrontOfficeStaff[];
  teamColors: { primary: string; secondary: string };
}) {
  const [topExec, ...rest] = staff;

  return (
    <div className="space-y-4">
      {/* Top Executive — gradient card */}
      {topExec && (
        <div
          className="relative overflow-hidden rounded-lg p-5"
          style={{
            background: `linear-gradient(135deg, ${teamColors.primary}, ${teamColors.secondary})`,
          }}
        >
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold uppercase tracking-tight text-white">
            {topExec.name}
          </p>
          <p className="mt-1.5 text-sm text-white/80">{topExec.title}</p>
        </div>
      )}

      {/* Remaining staff */}
      {rest.length > 0 && (
        <div className="space-y-1">
          {rest.map((fo, i) => (
            <div
              key={`${fo.name}-${fo.title}-${i}`}
              className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-muted/50"
            >
              <div>
                <p className="text-sm font-medium">{fo.name}</p>
                <p className="text-xs text-muted-foreground">{fo.title}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
