"use client";

import { useState, useEffect } from "react";
import type { MediaItem } from "./MediaSelector";
import { PostPreviewCard } from "./PostPreviewCard";
import { POST_VISIBILITY_OPTIONS, type PostVisibility } from "@/lib/visibility";

const CAPTION_MAX_LENGTH = 2200;

/** Post visibility: same as profile "Posts" options; "network" = Everyone. */
export type Visibility = PostVisibility;
const VISIBILITY_OPTIONS = POST_VISIBILITY_OPTIONS;

export function CaptionStep({
  items,
  caption,
  onCaptionChange,
  visibility,
  onVisibilityChange,
  onBack,
  onShare,
  saving,
  error,
}: {
  items: MediaItem[];
  caption: string;
  onCaptionChange: (value: string) => void;
  visibility: Visibility;
  onVisibilityChange: (v: Visibility) => void;
  onBack: () => void;
  onShare: () => void;
  saving: boolean;
  error: string;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const [me, setMe] = useState<{ fullName?: string; name?: string; profileImage?: string; image?: string } | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => (data._id ? setMe(data) : setMe(null)))
      .catch(() => {});
  }, []);

  const previewMediaUrls = items.map((i) => i.editedPreview ?? i.preview).filter(Boolean) as string[];
  const authorName = me?.fullName || me?.name || "You";
  const authorImage = me?.profileImage || me?.image;

  return (
    <div className="flex flex-col h-full">
      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowPreview(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Post preview"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md post-flow-animate-in">
            <PostPreviewCard
              mediaUrls={previewMediaUrls.length > 0 ? previewMediaUrls : []}
              caption={caption}
              visibility={visibility}
              authorName={authorName}
              authorImage={authorImage}
            />
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="mt-4 w-full py-3 rounded-xl border-2 border-[var(--ig-border)] text-[var(--ig-text)] text-sm font-medium hover:bg-[var(--ig-border-light)] transition-all"
            >
              Close preview
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">
        <div className="post-flow-card p-6 space-y-5 post-flow-animate-in">
          {items.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="relative shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-[var(--ig-border-light)] ring-1 ring-[var(--ig-border)]"
                >
                  {item.type === "image" ? (
                    <img src={item.editedPreview ?? item.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--ig-text-secondary)]">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4h-3l-2-4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
            <label htmlFor="caption" className="post-flow-label block mb-2">
              Post content
            </label>
            <textarea
              id="caption"
              value={caption}
              onChange={(e) => {
                const v = e.target.value;
                if (v.length <= CAPTION_MAX_LENGTH) onCaptionChange(v);
              }}
              rows={4}
              placeholder="What do you want to share?"
              maxLength={CAPTION_MAX_LENGTH}
              className="post-flow-input w-full resize-y"
              aria-describedby="caption-count"
            />
            <p id="caption-count" className="mt-1.5 post-flow-hint text-right">
              {caption.length} / {CAPTION_MAX_LENGTH}
            </p>
            {items.length === 0 && (
              <p className="mt-2 post-flow-hint">
                You&apos;re creating a text-only post. You can always add photos/videos next time.
              </p>
            )}
          </div>

          <div>
            <span className="post-flow-label block mb-3">
              Who can see this?
            </span>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Visibility">
              {VISIBILITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onVisibilityChange(value)}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ig-text)] focus:ring-offset-2 focus:ring-offset-[var(--post-flow-gradient-start)] ${
                    visibility === value
                      ? "post-flow-cta shadow-md"
                      : "border-2 border-[var(--ig-border)] bg-transparent text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onBack}
              className="min-h-[48px] px-5 py-2.5 rounded-xl border-2 border-[var(--ig-border)] text-[var(--ig-text)] text-sm font-medium hover:bg-[var(--ig-border-light)] transition-all active:scale-[0.98]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="min-h-[48px] px-5 py-2.5 rounded-xl border-2 border-[var(--ig-text)] text-[var(--ig-text)] text-sm font-medium hover:bg-[var(--ig-text)] hover:text-[var(--post-flow-gradient-start)] transition-all active:scale-[0.98]"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={onShare}
              disabled={saving}
              className="post-flow-cta flex-1 min-h-[48px] py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 transition-all duration-200 hover:opacity-95 active:scale-[0.98]"
            >
              {saving ? "Posting…" : "Post"}
            </button>
          </div>

          {error && (
            <p role="alert" className="text-sm text-[var(--ig-error)] font-medium">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
