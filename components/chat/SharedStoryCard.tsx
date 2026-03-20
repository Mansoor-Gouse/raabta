"use client";

import type React from "react";

export type StoryShareAttachment = {
  type: "story_share";
  statusId?: string;
  thumb_url?: string;
  author_name?: string;
  author_icon?: string;
  text?: string;
};

type SharedStoryCardProps = {
  attachment: StoryShareAttachment & Record<string, unknown>;
};

const CARD_WIDTH = 280;
const MEDIA_SIZE = 72;
const PADDING = 12;

/**
 * Compact story preview shown inside chat when a story is shared.
 * We do not navigate to a dedicated story URL (stories are viewed in the in-app viewer).
 */
export function SharedStoryCard({ attachment }: SharedStoryCardProps) {
  const thumbUrl = attachment.thumb_url ?? "";
  const authorName = attachment.author_name ?? "Someone";
  const authorImage = attachment.author_icon;
  const captionSnippet = attachment.text?.slice(0, 120);
  const hasMore = (attachment.text?.length ?? 0) > 120;
  const hasImage = !!thumbUrl?.trim();

  return (
    <div
      className="rounded-xl border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] overflow-hidden"
      style={{ width: CARD_WIDTH, minHeight: MEDIA_SIZE + PADDING * 2 }}
      aria-label="Shared story"
      role="group"
    >
      <div className="flex gap-3 flex-1 pr-3" style={{ padding: PADDING }}>
        {/* Fixed-size left media: image/video thumb or placeholder */}
        <div
          className="shrink-0 rounded-lg overflow-hidden bg-[var(--ig-border-light)] flex items-center justify-center"
          style={{ width: MEDIA_SIZE, height: MEDIA_SIZE }}
        >
          {hasImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumbUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl font-medium text-[var(--ig-text-tertiary)]">
              {(authorName || "?")[0].toUpperCase()}
            </span>
          )}
        </div>

        {/* Right: author + caption snippet */}
        <div className="flex-1 min-w-0 flex flex-col justify-center pr-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-5 h-5 rounded-[5px] overflow-hidden bg-[var(--ig-border-light)] shrink-0">
              {authorImage ? (
                // eslint-disable-next-line @next/next/no-img-element
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
            <p className="text-xs text-[var(--ig-text-tertiary)]">Story</p>
          )}
        </div>
      </div>
    </div>
  );
}

