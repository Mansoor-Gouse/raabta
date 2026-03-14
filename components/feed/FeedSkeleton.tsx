"use client";

const STORY_ROW_SKELETON_COUNT = 4;

/**
 * Feed loading state: header (Stories | Posts) + one panel skeleton.
 */
export function FeedSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--ig-bg)]">
      {/* Header skeleton — two segments */}
      <div className="shrink-0 flex border-b border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)] animate-pulse">
        <div className="flex-1 py-3 flex justify-center">
          <div className="h-4 w-16 rounded bg-[var(--ig-border-light)]" />
        </div>
        <div className="flex-1 py-3 flex justify-center">
          <div className="h-4 w-14 rounded bg-[var(--ig-border-light)]" />
        </div>
      </div>
      {/* Single panel skeleton (vertical list style) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-2 animate-pulse">
          {Array.from({ length: STORY_ROW_SKELETON_COUNT }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[var(--ig-border-light)] shrink-0" />
              <div className="flex-1 space-y-1">
                <div className="h-3.5 w-24 rounded bg-[var(--ig-border-light)]" />
                <div className="h-3 w-12 rounded bg-[var(--ig-border-light)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
