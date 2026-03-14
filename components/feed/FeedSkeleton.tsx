"use client";

import { PostCardSkeleton } from "./PostCardSkeleton";

const POST_SKELETON_COUNT = 3;

/**
 * Skeleton for the posts list only (no header). Use inside feed panel so static header/footer stay visible.
 */
export function FeedPostsSkeleton() {
  return (
    <ul className="space-y-4">
      {Array.from({ length: POST_SKELETON_COUNT }).map((_, i) => (
        <li key={i}>
          <PostCardSkeleton />
        </li>
      ))}
    </ul>
  );
}

/**
 * Full-page feed loading state (legacy): header + panel skeleton. Prefer rendering static shell + FeedPostsSkeleton in panel.
 */
export function FeedSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--ig-bg)]">
      <div className="sticky top-0 z-30 shrink-0 bg-[var(--ig-bg-primary)] border-b border-[var(--ig-border-light)] animate-pulse">
        <div className="flex items-center px-4 py-2.5">
          <div className="h-5 w-24 rounded bg-[var(--ig-border-light)]" aria-hidden />
        </div>
        <div className="flex border-b border-[var(--ig-border-light)]">
          <div className="flex-1 py-3 flex justify-center">
            <div className="h-4 w-14 rounded bg-[var(--ig-border-light)]" />
          </div>
          <div className="flex-1 py-3 flex justify-center">
            <div className="h-4 w-16 rounded bg-[var(--ig-border-light)]" />
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-1">
        <FeedPostsSkeleton />
      </div>
    </div>
  );
}
