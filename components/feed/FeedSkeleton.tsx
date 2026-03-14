"use client";

import { PostCardSkeleton } from "./PostCardSkeleton";

const POST_SKELETON_COUNT = 4;

const STORY_ROW_SKELETON_COUNT = 4;

/**
 * Feed loading state: Stories subsection (vertical list) + Posts subsection.
 */
export function FeedSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto bg-[var(--ig-bg)]">
      {/* Stories subsection skeleton — vertical list rows */}
      <div className="shrink-0 border-b border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)] px-4 py-3 animate-pulse">
        <div className="h-4 w-16 rounded bg-[var(--ig-border-light)] mb-3" aria-hidden />
        <div className="flex flex-col gap-2">
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
      {/* Posts subsection skeleton */}
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
