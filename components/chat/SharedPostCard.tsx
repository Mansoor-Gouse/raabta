"use client";

import Link from "next/link";

export type PostShareAttachment = {
  type: "post_share";
  postId?: string;
  thumb_url?: string;
  author_name?: string;
  author_icon?: string;
  text?: string;
};

type SharedPostCardProps = {
  attachment: PostShareAttachment;
};

/**
 * Compact post preview shown when a post is shared in chat.
 * Flexible layout: with image (thumbnail + meta), or text-only when no image.
 * Whole card is clickable and navigates to the post (no separate "View post" link).
 */
export function SharedPostCard({ attachment }: SharedPostCardProps) {
  const postId = attachment.postId ?? "";
  const thumbUrl = attachment.thumb_url ?? "";
  const authorName = attachment.author_name ?? "Someone";
  const authorImage = attachment.author_icon;
  const captionSnippet = attachment.text?.slice(0, 120);
  const hasMore = (attachment.text?.length ?? 0) > 120;
  const hasImage = !!thumbUrl?.trim();

  if (!postId) {
    return (
      <div className="rounded-xl border border-[var(--ig-border)] bg-[var(--ig-border-light)] p-3 max-w-[280px]">
        <p className="text-sm text-[var(--ig-text-secondary)]">Shared post</p>
      </div>
    );
  }

  return (
    <Link
      href={`/app/feed/${postId}`}
      className="block rounded-xl border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] overflow-hidden max-w-[280px] hover:opacity-95 active:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-text)] transition-opacity"
    >
      {hasImage ? (
        <div className="flex gap-3 p-3">
          <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-[var(--ig-border-light)]">
            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-[var(--ig-border-light)] shrink-0">
                {authorImage ? (
                  <img src={authorImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-xs font-medium text-[var(--ig-text-secondary)]">
                    {(authorName || "?")[0].toUpperCase()}
                  </span>
                )}
              </div>
              <span className="text-sm font-semibold text-[var(--ig-text)] truncate">{authorName}</span>
            </div>
            {captionSnippet && (
              <p className="text-xs text-[var(--ig-text-secondary)] line-clamp-2">
                {captionSnippet}
                {hasMore ? "…" : ""}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--ig-border-light)] shrink-0">
              {authorImage ? (
                <img src={authorImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-xs font-medium text-[var(--ig-text-secondary)]">
                  {(authorName || "?")[0].toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-[var(--ig-text)] truncate">{authorName}</span>
          </div>
          {captionSnippet ? (
            <p className="text-sm text-[var(--ig-text-secondary)] line-clamp-3">
              {captionSnippet}
              {hasMore ? "…" : ""}
            </p>
          ) : (
            <p className="text-xs text-[var(--ig-text-tertiary)]">Post</p>
          )}
        </div>
      )}
    </Link>
  );
}
