"use client";

export function EliteEventDetailSkeleton() {
  return (
    <div className="elite-events min-h-full bg-[var(--elite-bg)] flex flex-col transition-opacity duration-200">
      <header
        className="sticky top-0 z-20 flex items-center gap-2 px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)]"
        style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}
      >
        <div className="h-8 w-8 rounded-lg bg-[var(--elite-border)] animate-pulse shrink-0" />
        <div className="h-4 w-16 rounded bg-[var(--elite-border)] animate-pulse" />
      </header>
      <div className="flex-1 overflow-y-auto">
        <div className="aspect-[2/1] w-full bg-[var(--elite-border)] animate-pulse" />
        <div className="p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-[var(--elite-border)] animate-pulse shrink-0" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-4 w-24 rounded bg-[var(--elite-border)] animate-pulse" />
              <div className="h-5 w-32 rounded bg-[var(--elite-border)] animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-[var(--elite-radius-lg)] bg-[var(--elite-border)] animate-pulse" />
            ))}
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full max-w-[200px] rounded bg-[var(--elite-border)] animate-pulse" />
            <div className="h-3 w-full rounded bg-[var(--elite-border)]/80 animate-pulse" />
            <div className="h-3 w-[80%] rounded bg-[var(--elite-border)]/80 animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-28 rounded bg-[var(--elite-border)] animate-pulse" />
            <div className="h-20 rounded-[var(--elite-radius)] bg-[var(--elite-border)] animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
