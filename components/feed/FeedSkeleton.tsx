"use client";

import { PostCardSkeleton } from "./PostCardSkeleton";

const POST_SKELETON_COUNT = 3;

/**
 * Feed loading state: sticky header (title "The Rope" + segments Posts | Stories) + one panel (Posts).
 */
export function FeedSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--ig-bg)]">
      {/* Sticky header: title + segment bar */}
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
      {/* Panel skeleton: Posts (default view) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-1">
        <ul className="space-y-4">
          {Array.from({ length: POST_SKELETON_COUNT }).map((_, i) => (
            <li key={i}>
              <PostCardSkeleton />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
