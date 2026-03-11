"use client";

/**
 * Skeleton for post detail page: header, square media, actions, comment list.
 */
export function PostDetailSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto bg-[var(--ig-bg-primary)]">
      <div className="max-w-lg mx-auto animate-pulse">
        <div className="flex items-center gap-2 p-4 border-b border-[var(--ig-border-light)]">
          <div className="w-9 h-9 rounded-full bg-[var(--ig-border-light)]" />
          <div className="h-5 w-12 rounded bg-[var(--ig-border-light)]" />
        </div>

        <header className="flex items-center gap-3 px-4 py-3">
          <div className="w-10 h-10 rounded-full bg-[var(--ig-border-light)] shrink-0" />
          <div className="space-y-1 flex-1">
            <div className="h-4 w-24 rounded bg-[var(--ig-border-light)]" />
            <div className="h-3 w-32 rounded bg-[var(--ig-border-light)]" />
          </div>
        </header>

        <div className="relative aspect-square max-h-[500px] w-full bg-[var(--ig-border-light)]" />

        <div className="px-4 py-2 flex items-center gap-4">
          <div className="w-7 h-7 rounded bg-[var(--ig-border-light)]" />
          <div className="w-7 h-7 rounded bg-[var(--ig-border-light)]" />
          <div className="ml-auto w-7 h-7 rounded bg-[var(--ig-border-light)]" />
        </div>

        <div className="px-4 pb-2 space-y-1">
          <div className="h-3.5 w-20 rounded bg-[var(--ig-border-light)]" />
          <div className="h-3 w-full max-w-[300px] rounded bg-[var(--ig-border-light)]" />
          <div className="h-3 w-4/5 max-w-[240px] rounded bg-[var(--ig-border-light)]" />
        </div>

        <div className="px-4 py-2 border-t border-[var(--ig-border-light)]">
          <div className="h-4 w-24 rounded bg-[var(--ig-border-light)] mb-3" />
          <ul className="space-y-3 mb-4">
            {[1, 2, 3].map((i) => (
              <li key={i} className="flex gap-2">
                <div className="w-8 h-8 rounded-full bg-[var(--ig-border-light)] shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-3.5 w-full max-w-[200px] rounded bg-[var(--ig-border-light)]" />
                  <div className="h-3 w-16 rounded bg-[var(--ig-border-light)]" />
                </div>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <div className="flex-1 h-10 rounded-lg bg-[var(--ig-border-light)]" />
            <div className="w-16 h-10 rounded-lg bg-[var(--ig-border-light)]" />
          </div>
        </div>
      </div>
    </div>
  );
}
