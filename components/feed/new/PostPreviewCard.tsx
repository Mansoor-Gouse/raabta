"use client";

import type { Visibility } from "./CaptionStep";

type PostPreviewCardProps = {
  mediaUrls: string[];
  caption: string;
  visibility: Visibility;
  authorName?: string;
  authorImage?: string | null;
};

const VISIBILITY_LABELS: Record<Visibility, string> = {
  network: "Network",
  trusted_circle: "Trusted Circle",
  inner_circle: "Inner Circle",
  friends: "Friends only",
  "event-attendees": "Event attendees only",
};

export function PostPreviewCard({
  mediaUrls,
  caption,
  visibility,
  authorName = "You",
  authorImage,
}: PostPreviewCardProps) {
  const firstUrl = mediaUrls[0];
  const isImage = firstUrl?.match(/\.(gif|webp|png|jpe?g|avif)$/i);

  return (
    <article className="bg-[var(--ig-bg-primary)] border border-[var(--ig-border-light)] rounded-lg overflow-hidden max-w-md mx-auto">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ig-border-light)]">
        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-[var(--ig-border-light)] shrink-0">
          {authorImage ? (
            <img src={authorImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-[var(--ig-text-secondary)]">
              {authorName?.charAt(0)?.toUpperCase() || "?"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-[var(--ig-text)] truncate">{authorName}</p>
          <p className="text-xs text-[var(--ig-text-secondary)]">Preview</p>
        </div>
      </header>
      <div className="relative aspect-square w-full bg-black">
        {firstUrl ? (
          isImage ? (
            <img src={firstUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--ig-text-secondary)]">
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-[var(--ig-text-secondary)]">
            No media
          </div>
        )}
        {mediaUrls.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5" aria-hidden>
            {mediaUrls.map((_, i) => (
              <span
                key={i}
                className={`block rounded-full transition-all ${i === 0 ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`}
              />
            ))}
          </div>
        )}
      </div>
      <div className="px-4 py-2 space-y-1">
        {caption ? (
          <p className="text-sm text-[var(--ig-text)]">
            <span className="font-semibold mr-1.5">{authorName}</span>
            {caption}
          </p>
        ) : (
          <p className="text-sm text-[var(--ig-text-tertiary)] italic">No caption</p>
        )}
        <p className="text-xs text-[var(--ig-text-secondary)]">
          {VISIBILITY_LABELS[visibility]}
        </p>
      </div>
    </article>
  );
}
