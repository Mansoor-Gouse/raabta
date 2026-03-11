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
 * Renders thumbnail, author, caption snippet, and link to view the post.
 */
export function SharedPostCard({ attachment }: SharedPostCardProps) {
  const postId = attachment.postId ?? "";
  const thumbUrl = attachment.thumb_url ?? "";
  const authorName = attachment.author_name ?? "Someone";
  const authorImage = attachment.author_icon;
  const captionSnippet = attachment.text?.slice(0, 120);
  const hasMore = (attachment.text?.length ?? 0) > 120;

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
      className="block rounded-xl border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] overflow-hidden max-w-[280px] hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-text)]"
    >
      <div className="flex gap-3 p-3">
        <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-[var(--ig-border-light)]">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--ig-text-tertiary)]">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
              </svg>
            </div>
          )}
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
            <span className="text-sm font-semibold text-[var(--ig-text)] truncate">
              {authorName}
            </span>
          </div>
          {captionSnippet && (
            <p className="text-xs text-[var(--ig-text-secondary)] line-clamp-2">
              {captionSnippet}
              {hasMore ? "…" : ""}
            </p>
          )}
          <span className="text-xs text-[var(--ig-link)] font-medium mt-1">
            View post
          </span>
        </div>
      </div>
    </Link>
  );
}
