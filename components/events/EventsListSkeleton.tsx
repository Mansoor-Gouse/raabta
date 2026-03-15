"use client";

/**
 * Skeleton loader matching EventCard layout: cover (2:1), type pill, title, date/location line, host row.
 */
export function EventCardSkeleton({ variant = "default" }: { variant?: "default" | "elite" }) {
  const isElite = variant === "elite";
  const border = isElite ? "border-[var(--elite-border)]" : "border-[var(--ig-border)]";
  const bg = isElite ? "bg-[var(--elite-card)]" : "bg-[var(--ig-bg-primary)]";
  const thumbBg = isElite ? "bg-[var(--elite-border-light)]" : "bg-[var(--ig-border-light)]";
  const radius = isElite ? "rounded-[var(--elite-radius-lg)]" : "rounded-xl";
  return (
    <div className={`${radius} border ${border} overflow-hidden ${bg} animate-pulse`}>
      <div className={`aspect-[2/1] w-full ${thumbBg}`} />
      <div className="p-4 space-y-2">
        <div className={`h-3 w-14 rounded ${thumbBg}`} />
        <div className={`h-4 w-48 max-w-[200px] rounded ${thumbBg}`} />
        <div className={`h-3.5 w-full max-w-[260px] rounded ${thumbBg}`} />
        <div className="flex items-center gap-2 mt-2">
          <div className={`w-6 h-6 rounded-full ${thumbBg} shrink-0`} />
          <div className={`h-3 w-20 rounded ${thumbBg}`} />
          <div className={`h-3 w-14 rounded ${thumbBg}`} />
        </div>
      </div>
    </div>
  );
}

export function EventsListSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div
        className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--ig-border)] bg-[var(--ig-bg-primary)]"
        style={{ paddingTop: "calc(0.75rem + var(--safe-area-inset-top))" }}
      >
        <div className="h-6 w-32 rounded bg-[var(--ig-border-light)] animate-pulse" />
        <div className="h-5 w-24 rounded bg-[var(--ig-border-light)] animate-pulse" />
      </div>
      <div className="p-2 flex gap-2 overflow-x-auto border-b border-[var(--ig-border)] bg-[var(--ig-bg-primary)]">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-12 rounded-full bg-[var(--ig-border-light)] animate-pulse shrink-0" />
        ))}
      </div>
      <ul className="p-4 space-y-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <li key={i}>
            <EventCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
