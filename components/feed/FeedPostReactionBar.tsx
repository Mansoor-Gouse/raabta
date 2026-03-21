"use client";

import {
  IconHeart,
  IconComment,
  IconShare,
  IconBookmark,
} from "@/components/layout/InstagramIcons";

/** Read-only action row matching PostCard footer (used in story + embed). */
export function FeedPostReactionBarPlaceholder({
  likeCount,
  className = "",
}: {
  likeCount?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center gap-4 px-4 py-2 border-t border-[var(--ig-border-light)] text-sm pointer-events-none ${className}`}
    >
      <div className="flex items-center gap-1">
        <div className="p-1.5 rounded-full text-[var(--ig-text)]">
          <IconHeart className="w-5 h-5" />
        </div>
        {likeCount != null && likeCount > 0 && (
          <span className="text-xs font-medium text-[var(--ig-text-secondary)]">{likeCount}</span>
        )}
      </div>
      <div className="p-1.5 rounded-full text-[var(--ig-text)]">
        <IconComment className="w-5 h-5" />
      </div>
      <div className="p-1.5 rounded-full text-[var(--ig-text)]">
        <IconShare className="w-5 h-5" />
      </div>
      <div className="ml-auto p-1.5 rounded-full text-[var(--ig-text)]">
        <IconBookmark className="w-5 h-5" />
      </div>
    </div>
  );
}
