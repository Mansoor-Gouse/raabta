"use client";

import { IconThumbsUp, IconHeart, IconClap, IconGlobe } from "@/components/layout/InstagramIcons";
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
    <article className="bg-[var(--ig-bg-primary)] border border-[var(--ig-border-light)] rounded-xl overflow-hidden max-w-md mx-auto shadow-lg">
      {/* Author block — same as feed card */}
      <header className="flex items-center gap-3 px-4 py-3 border-b border-[var(--ig-border-light)]">
        <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-[var(--ig-border-light)] shrink-0">
          {authorImage ? (
            <img src={authorImage} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-base font-semibold text-[var(--ig-text-secondary)]">
              {authorName?.charAt(0)?.toUpperCase() || "?"}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-[var(--ig-text)] truncate">{authorName}</p>
          <p className="text-xs text-[var(--ig-text-secondary)]">Member</p>
          <div className="flex items-center gap-1.5 text-xs text-[var(--ig-text-secondary)] mt-0.5">
            <span>Now</span>
            <span>•</span>
            <IconGlobe className="w-3.5 h-3.5" aria-hidden />
          </div>
        </div>
        <span className="shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold bg-[var(--ig-link)] text-white">
          Follow
        </span>
      </header>

      {/* Caption */}
      {caption && (
        <div className="px-4 py-2 border-b border-[var(--ig-border-light)]">
          <p className="text-sm text-[var(--ig-text)] leading-snug">
            <span className="font-semibold mr-1.5">{authorName}</span>
            {caption}
          </p>
        </div>
      )}
      {!caption && <div className="border-b border-[var(--ig-border-light)]" />}

      {/* Rectangular image (omit when text-only) */}
      {mediaUrls.length > 0 && (
      <div className="relative aspect-[16/10] w-full bg-black">
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
      )}

      {/* Footer — overlapping reaction icons + comments • reposts */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-[var(--ig-border-light)]">
        <div className="flex items-center gap-1">
          <div className="flex -space-x-2">
            <span className="w-6 h-6 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center border-2 border-[var(--ig-bg-primary)] text-[var(--ig-text-secondary)]">
              <IconThumbsUp className="w-3.5 h-3.5" filled />
            </span>
            <span className="w-6 h-6 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center border-2 border-[var(--ig-bg-primary)] text-[var(--ig-text-secondary)]">
              <IconHeart className="w-3.5 h-3.5" />
            </span>
            <span className="w-6 h-6 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center border-2 border-[var(--ig-bg-primary)] text-[var(--ig-text-secondary)]">
              <IconClap className="w-3.5 h-3.5" />
            </span>
          </div>
          <span className="text-sm font-semibold text-[var(--ig-text-secondary)] ml-1">0</span>
        </div>
        <div className="flex-1 flex justify-end gap-2 text-sm text-[var(--ig-text-secondary)]">
          <span>0 comments</span>
          <span>0 reposts</span>
        </div>
      </div>

      <p className="px-4 pb-3 text-xs text-[var(--ig-text-secondary)]">
        {VISIBILITY_LABELS[visibility]}
      </p>
    </article>
  );
}
