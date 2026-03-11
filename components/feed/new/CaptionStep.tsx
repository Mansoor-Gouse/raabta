"use client";

import { useState, useEffect } from "react";
import type { MediaItem } from "./MediaSelector";
import { PostPreviewCard } from "./PostPreviewCard";

const CAPTION_MAX_LENGTH = 2200;

export type Visibility = "network" | "friends" | "event-attendees" | "inner_circle" | "trusted_circle";

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "network", label: "Network" },
  { value: "trusted_circle", label: "Trusted Circle" },
  { value: "inner_circle", label: "Inner Circle" },
  { value: "friends", label: "Friends only" },
  { value: "event-attendees", label: "Event attendees only" },
];

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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60"
          onClick={() => setShowPreview(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Post preview"
        >
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
            <PostPreviewCard
              mediaUrls={previewMediaUrls.length > 0 ? previewMediaUrls : [""]}
              caption={caption}
              visibility={visibility}
              authorName={authorName}
              authorImage={authorImage}
            />
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="mt-3 w-full py-2.5 rounded-lg bg-[var(--ig-bg-primary)] border border-[var(--ig-border)] text-[var(--ig-text)] text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Thumbnail strip */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {items.map((item, i) => (
            <div
              key={i}
              className="relative shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-[var(--ig-border-light)]"
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

        <div>
          <label htmlFor="caption" className="block text-sm font-medium text-[var(--ig-text)] mb-1">
            Caption
          </label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => {
              const v = e.target.value;
              if (v.length <= CAPTION_MAX_LENGTH) onCaptionChange(v);
            }}
            rows={4}
            placeholder="Write a caption..."
            maxLength={CAPTION_MAX_LENGTH}
            className="w-full rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] px-3 py-2 text-sm text-[var(--ig-text)] placeholder:text-[var(--ig-text-tertiary)] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--ig-link)] focus:border-transparent"
            aria-describedby="caption-count"
          />
          <p id="caption-count" className="mt-1 text-xs text-[var(--ig-text-secondary)] text-right">
            {caption.length} / {CAPTION_MAX_LENGTH}
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowPreview(true)}
            className="text-sm font-medium text-[var(--ig-link)] hover:opacity-80"
          >
            Preview post
          </button>
        </div>

        <div>
          <span className="block text-sm font-medium text-[var(--ig-text)] mb-2">
            Who can see this?
          </span>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Visibility">
            {VISIBILITY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onVisibilityChange(value)}
                className={`min-h-[44px] px-4 py-2.5 rounded-full text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--ig-link)] focus:ring-offset-2 focus:ring-offset-[var(--ig-bg-primary)] ${
                  visibility === value
                    ? "bg-[var(--ig-link)] text-white"
                    : "border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-[var(--ig-error)]">{error}</p>
        )}
      </div>

      <div className="p-4 border-t border-[var(--ig-border-light)] flex gap-2">
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2.5 rounded-lg border border-[var(--ig-border)] text-[var(--ig-text)] text-sm font-medium hover:bg-[var(--ig-border-light)]"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onShare}
          disabled={saving}
          className="flex-1 py-2.5 rounded-lg bg-[var(--ig-link)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Posting…" : "Share"}
        </button>
      </div>
    </div>
  );
}
