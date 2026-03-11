"use client";

/**
 * Skeleton loader matching PostCard layout: header (avatar, lines), square media, actions, caption.
 */
export function PostCardSkeleton() {
  return (
    <article className="bg-[var(--ig-bg-primary)] border-b border-[var(--ig-border-light)] animate-pulse">
      <header className="flex items-center gap-3 px-4 py-3 min-h-[60px]">
        <div className="w-8 h-8 rounded-full bg-[var(--ig-border-light)] shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="h-3.5 w-24 rounded bg-[var(--ig-border-light)]" />
          <div className="h-3 w-12 rounded bg-[var(--ig-border-light)]" />
        </div>
        <div className="w-5 h-5 rounded bg-[var(--ig-border-light)]" />
      </header>
      <div className="relative aspect-square w-full bg-[var(--ig-border-light)]" />
      <div className="flex items-center gap-4 px-4 py-2">
        <div className="w-6 h-6 rounded bg-[var(--ig-border-light)]" />
        <div className="w-6 h-6 rounded bg-[var(--ig-border-light)]" />
        <div className="w-6 h-6 rounded bg-[var(--ig-border-light)]" />
        <div className="ml-auto w-6 h-6 rounded bg-[var(--ig-border-light)]" />
      </div>
      <div className="px-4 pb-2 space-y-1">
        <div className="h-3.5 w-20 rounded bg-[var(--ig-border-light)]" />
        <div className="h-3 w-full max-w-[280px] rounded bg-[var(--ig-border-light)]" />
        <div className="h-3 w-3/4 max-w-[200px] rounded bg-[var(--ig-border-light)]" />
      </div>
      <div className="px-4 pb-3">
        <div className="h-3 w-28 rounded bg-[var(--ig-border-light)]" />
      </div>
    </article>
  );
}
