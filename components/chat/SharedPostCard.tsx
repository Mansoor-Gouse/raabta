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

/** Fixed dimensions so card size is consistent with or without image */
const CARD_WIDTH = 280;
const MEDIA_SIZE = 72;
const PADDING = 12;

/**
 * Compact post preview shown when a post is shared in chat.
 * Single layout with fixed left media area (image or placeholder) so size stays consistent.
 * Whole card is clickable and navigates to the post.
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
      <div
        className="rounded-xl border border-[var(--ig-border)] bg-[var(--ig-border-light)] flex items-center justify-center"
        style={{ width: CARD_WIDTH, minHeight: MEDIA_SIZE + PADDING * 2 }}
      >
        <p className="text-sm text-[var(--ig-text-secondary)] p-3">Shared post</p>
      </div>
    );
  }

  return (
    <Link
      href={`/app/feed/${postId}`}
      className="block rounded-xl border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] overflow-hidden hover:opacity-95 active:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-text)] transition-opacity"
      style={{ width: CARD_WIDTH, minHeight: MEDIA_SIZE + PADDING * 2 }}
    >
      <div
        className="flex gap-3 flex-1"
        style={{ padding: PADDING }}
      >
        {/* Fixed-size left media: image or placeholder */}
        <div
          className="shrink-0 rounded-lg overflow-hidden bg-[var(--ig-border-light)] flex items-center justify-center"
          style={{ width: MEDIA_SIZE, height: MEDIA_SIZE }}
        >
          {hasImage ? (
            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-medium text-[var(--ig-text-tertiary)]">
              {(authorName || "?")[0].toUpperCase()}
            </span>
          )}
        </div>
        {/* Right: author + caption — same layout for both cases */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-[var(--ig-border-light)] shrink-0">
              {authorImage ? (
                <img src={authorImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-[10px] font-medium text-[var(--ig-text-secondary)]">
                  {(authorName || "?")[0].toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-sm font-semibold text-[var(--ig-text)] truncate">{authorName}</span>
          </div>
          {captionSnippet ? (
            <p className="text-xs text-[var(--ig-text-secondary)] line-clamp-2">
              {captionSnippet}
              {hasMore ? "…" : ""}
            </p>
          ) : (
            <p className="text-xs text-[var(--ig-text-tertiary)]">Post</p>
          )}
        </div>
      </div>
    </Link>
  );
}
