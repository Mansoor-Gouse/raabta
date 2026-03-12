"use client";

/**
 * Skeleton loader matching PostCard LinkedIn-style layout:
 * likes row (optional), author block, caption, rectangular media, footer.
 */
export function PostCardSkeleton() {
  return (
    <article className="bg-[var(--ig-bg-primary)] border-b border-[var(--ig-border-light)] animate-pulse">
      {/* Likes row placeholder */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--ig-border-light)]">
        <div className="w-6 h-6 rounded-full bg-[var(--ig-border-light)] shrink-0" />
        <div className="h-3.5 w-28 rounded bg-[var(--ig-border-light)]" />
      </div>
      {/* Author block */}
      <header className="flex items-center gap-3 px-4 py-3">
        <div className="w-12 h-12 rounded-full bg-[var(--ig-border-light)] shrink-0" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="h-4 w-24 rounded bg-[var(--ig-border-light)]" />
          <div className="h-3 w-14 rounded bg-[var(--ig-border-light)]" />
          <div className="h-3 w-16 rounded bg-[var(--ig-border-light)]" />
        </div>
        <div className="h-8 w-16 rounded-full bg-[var(--ig-border-light)] shrink-0" />
      </header>
      {/* Caption lines */}
      <div className="px-4 pb-2 space-y-1">
        <div className="h-3.5 w-full max-w-[280px] rounded bg-[var(--ig-border-light)]" />
        <div className="h-3.5 w-4/5 max-w-[220px] rounded bg-[var(--ig-border-light)]" />
      </div>
      {/* Rectangular media */}
      <div className="relative aspect-[16/10] w-full bg-[var(--ig-border-light)]" />
      {/* Footer */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--ig-border-light)]">
        <div className="flex -space-x-2">
          <div className="w-6 h-6 rounded-full bg-[var(--ig-border-light)] border-2 border-[var(--ig-bg-primary)]" />
          <div className="w-6 h-6 rounded-full bg-[var(--ig-border-light)] border-2 border-[var(--ig-bg-primary)]" />
          <div className="w-6 h-6 rounded-full bg-[var(--ig-border-light)] border-2 border-[var(--ig-bg-primary)]" />
        </div>
        <div className="h-3.5 w-8 rounded bg-[var(--ig-border-light)]" />
        <div className="flex-1" />
        <div className="h-3.5 w-20 rounded bg-[var(--ig-border-light)]" />
      </div>
    </article>
  );
}
