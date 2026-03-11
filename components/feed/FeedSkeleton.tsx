"use client";

import { PostCardSkeleton } from "./PostCardSkeleton";

const POST_SKELETON_COUNT = 4;

/**
 * Feed loading state: story strip skeleton + N post card skeletons.
 */
export function FeedSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto bg-[var(--ig-bg)]">
      {/* Story strip skeleton */}
      <div className="shrink-0 border-b border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)]">
        <div className="flex gap-4 px-4 py-3 min-h-[104px] items-end animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-[66px] h-[66px] rounded-full bg-[var(--ig-border-light)]" />
              <div className="h-3 w-14 rounded bg-[var(--ig-border-light)]" />
            </div>
          ))}
        </div>
      </div>
      <ul>
        {Array.from({ length: POST_SKELETON_COUNT }).map((_, i) => (
          <li key={i}>
            <PostCardSkeleton />
          </li>
        ))}
      </ul>
    </div>
  );
}
