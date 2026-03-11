"use client";

/**
 * Skeleton loader matching EventCard layout: cover (2:1), type pill, title, date/location line, host row.
 */
export function EventCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--ig-border)] overflow-hidden bg-[var(--ig-bg-primary)] animate-pulse">
      <div className="aspect-[2/1] w-full bg-[var(--ig-border-light)]" />
      <div className="p-4 space-y-2">
        <div className="h-3 w-14 rounded bg-[var(--ig-border-light)]" />
        <div className="h-4 w-48 max-w-[200px] rounded bg-[var(--ig-border-light)]" />
        <div className="h-3.5 w-full max-w-[260px] rounded bg-[var(--ig-border-light)]" />
        <div className="flex items-center gap-2 mt-2">
          <div className="w-6 h-6 rounded-full bg-[var(--ig-border-light)] shrink-0" />
          <div className="h-3 w-20 rounded bg-[var(--ig-border-light)]" />
          <div className="h-3 w-14 rounded bg-[var(--ig-border-light)]" />
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
