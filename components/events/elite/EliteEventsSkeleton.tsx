"use client";

export function EliteEventCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="elite-events rounded-[var(--elite-radius-lg)] overflow-hidden border border-[var(--elite-border)] bg-[var(--elite-card)] animate-pulse min-w-[280px] w-[280px] shrink-0"
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      <div className="aspect-[3/2] w-full bg-[var(--elite-border)]" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-20 rounded bg-[var(--elite-border)]" />
        <div className="h-5 w-3/4 rounded bg-[var(--elite-border)]" />
        <div className="h-3.5 w-full max-w-[200px] rounded bg-[var(--elite-border)]" />
        <div className="flex items-center gap-2 mt-3">
          <div className="w-8 h-8 rounded-full bg-[var(--elite-border)] shrink-0" />
          <div className="h-3 w-24 rounded bg-[var(--elite-border)]" />
          <div className="h-3 w-14 rounded bg-[var(--elite-border)] ml-auto" />
        </div>
      </div>
    </div>
  );
}

export function EliteEventsSkeleton() {
  return (
    <div className="elite-events min-h-full bg-[var(--elite-bg)] flex flex-col">
      <header
        className="sticky top-0 z-10 px-4 py-3 border-b border-[var(--elite-border)] bg-[var(--elite-bg)]"
        style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}
      >
        <div className="h-6 w-24 rounded bg-[var(--elite-border)] animate-pulse" />
      </header>
      <div className="flex gap-1 border-b border-[var(--elite-border)] bg-[var(--elite-bg)] px-2">
        {["Discover", "Going to", "Spotlight", "My events"].map((_, i) => (
          <div
            key={i}
            className="h-11 flex-1 min-w-[70px] rounded-t bg-[var(--elite-border)]/60 animate-pulse shrink-0"
            style={{ animationDelay: `${i * 40}ms` }}
          />
        ))}
      </div>
      <div className="flex-1 min-h-0 p-4 md:p-6">
        <div className="h-5 w-28 rounded bg-[var(--elite-border)] animate-pulse mb-4" />
        <ul className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i}>
              <EliteEventCardSkeleton delay={i * 60} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
