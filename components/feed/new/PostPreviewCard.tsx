"use client";

import { useEffect, useState } from "react";
import { IconHeart, IconComment, IconShare, IconBookmark } from "@/components/layout/InstagramIcons";
import type { Visibility } from "./CaptionStep";
import { VISIBILITY_LABELS } from "@/lib/visibility";

type PostPreviewCardProps = {
  mediaUrls: string[];
  caption: string;
  visibility: Visibility;
  authorName?: string;
  authorImage?: string | null;
};

const CAPTION_LINE_HEIGHT = 1.35;

export function PostPreviewCard({
  mediaUrls,
  caption,
  visibility,
  authorName = "You",
  authorImage,
}: PostPreviewCardProps) {
  const firstUrl = mediaUrls[0];
  // Blob URLs often don't have file extensions, so extension-based detection breaks.
  // We try image first, then fall back to video if image decoding fails.
  const [mediaMode, setMediaMode] = useState<"image" | "video">("image");
  const [mediaAspectRatio, setMediaAspectRatio] = useState<string>("16 / 10");

  useEffect(() => {
    setMediaMode("image");
    setMediaAspectRatio("16 / 10");
  }, [firstUrl]);

  return (
    <article className="bg-[var(--ig-bg-primary)] border border-[var(--ig-border-light)] rounded-xl overflow-hidden max-w-md mx-auto shadow-sm">
      {/* Author block — matches PostCard: squary avatar, name, time */}
      <header className="flex items-center gap-3 px-4 py-2.5">
        <div className="w-12 h-12 rounded-lg p-[1px] border border-[var(--ig-border)] flex items-center justify-center shrink-0 bg-[var(--ig-bg-primary)]">
          <div className="w-full h-full rounded-[5px] flex items-center justify-center overflow-hidden bg-[var(--ig-bg-primary)]">
            {authorImage ? (
              <img src={authorImage} alt="" className="w-full h-full rounded-[5px] object-cover" />
            ) : (
              <span className="text-base font-semibold text-[var(--ig-text-secondary)]">
                {authorName?.charAt(0)?.toUpperCase() || "?"}
              </span>
            )}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm text-[var(--ig-text)] truncate">{authorName}</p>
          <p className="text-xs text-[var(--ig-text-secondary)] mt-0.5">Now</p>
        </div>
      </header>

      {/* Caption — same structure as PostCard */}
      {caption && (
        <div className="px-4 pb-2">
          <p className="text-sm text-[var(--ig-text)]" style={{ lineHeight: CAPTION_LINE_HEIGHT }}>
            {caption}
          </p>
        </div>
      )}

      {/* Media — rectangular, same aspect as PostCard; ensure image fills and displays */}
      {mediaUrls.length > 0 && (
        <div
          className="relative w-full bg-black overflow-hidden"
          style={{ aspectRatio: mediaAspectRatio, minHeight: "120px" }}
        >
          {firstUrl ? (
            <>
              {mediaMode === "image" && (
                <img
                  src={firstUrl}
                  alt=""
                  className="w-full h-full object-cover object-center block"
                  draggable={false}
                  onError={() => {
                    // If it's not an image (e.g. video blob), fall back to video.
                    setMediaMode("video");
                  }}
                  onLoad={(e) => {
                    const { naturalWidth, naturalHeight } = e.currentTarget;
                    if (naturalWidth > 0 && naturalHeight > 0) {
                      setMediaAspectRatio(`${naturalWidth} / ${naturalHeight}`);
                    }
                  }}
                />
              )}

              {mediaMode === "video" && (
                <>
                  <video
                    key={firstUrl}
                    src={firstUrl}
                    className="w-full h-full object-cover object-center block"
                    preload="metadata"
                    muted
                    playsInline
                    autoPlay
                    loop
                    aria-hidden
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      if (v.videoWidth > 0 && v.videoHeight > 0) {
                        setMediaAspectRatio(`${v.videoWidth} / ${v.videoHeight}`);
                      }
                    }}
                    onLoadedData={(e) => {
                      // Ensure the preview shows from the start across browsers.
                      try {
                        e.currentTarget.currentTime = 0;
                      } catch {
                        // ignore
                      }
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center">
                      <svg className="w-7 h-7 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-[var(--ig-text-secondary)]">
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

      {/* Reaction bar — icon-only, matches PostCard */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--ig-border-light)] text-sm">
        <div className="p-1.5 text-[var(--ig-text-secondary)]">
          <IconHeart className="w-5 h-5" />
        </div>
        <div className="p-1.5 text-[var(--ig-text-secondary)]">
          <IconComment className="w-5 h-5" />
        </div>
        <div className="p-1.5 text-[var(--ig-text-secondary)]">
          <IconShare className="w-5 h-5" />
        </div>
        <div className="ml-auto p-1.5 text-[var(--ig-text-secondary)]">
          <IconBookmark className="w-5 h-5" />
        </div>
      </div>

      <p className="px-4 pb-3 text-xs text-[var(--ig-text-secondary)]">
        {VISIBILITY_LABELS[visibility]}
      </p>
    </article>
  );
}
