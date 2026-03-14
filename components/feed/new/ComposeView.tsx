"use client";

import { useState, useEffect } from "react";
import type { MediaItem } from "./MediaSelector";
import type { Visibility } from "./CaptionStep";
import { PostPreviewCard } from "./PostPreviewCard";
import { MediaStrip } from "./MediaStrip";

const CAPTION_MAX_LENGTH = 2200;

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: "network", label: "Network" },
  { value: "trusted_circle", label: "Trusted Circle" },
  { value: "inner_circle", label: "Inner Circle" },
  { value: "friends", label: "Friends only" },
  { value: "event-attendees", label: "Event attendees only" },
];

export type ComposeViewProps = {
  caption: string;
  onCaptionChange: (value: string) => void;
  visibility: Visibility;
  onVisibilityChange: (v: Visibility) => void;
  items: MediaItem[];
  onItemsChange: (items: MediaItem[]) => void;
  onEditImage: (index: number) => void;
  onPreview?: () => void;
  onPost: () => void;
  saving: boolean;
  error: string;
  canPost: boolean;
};

export function ComposeView({
  caption,
  onCaptionChange,
  visibility,
  onVisibilityChange,
  items,
  onItemsChange,
  onEditImage,
  onPreview,
  onPost,
  saving,
  error,
  canPost,
}: ComposeViewProps) {
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

  const handlePreviewClick = () => {
    setShowPreview(true);
    onPreview?.();
  };

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
              className="mt-3 w-full py-2.5 rounded-lg border border-[var(--ig-border)] text-[var(--ig-text)] text-sm font-medium hover:bg-[var(--ig-border-light)] transition-all"
            >
              Close preview
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto p-3">
        <div className="max-w-lg mx-auto space-y-3">
          {/* Content textarea — dominant */}
          <div className="relative">
            <textarea
              id="compose-caption"
              value={caption}
              onChange={(e) => {
                const v = e.target.value;
                if (v.length <= CAPTION_MAX_LENGTH) onCaptionChange(v);
              }}
              rows={5}
              placeholder="What do you want to share?"
              maxLength={CAPTION_MAX_LENGTH}
              className="post-flow-input w-full min-h-[120px] resize-y py-3 px-3 text-base transition-[border-color,box-shadow] duration-150"
              aria-describedby="compose-caption-count"
            />
            <p
              id="compose-caption-count"
              className="absolute bottom-2 right-2 post-flow-hint tabular-nums post-flow-count-update"
              key={caption.length}
            >
              {caption.length} / {CAPTION_MAX_LENGTH}
            </p>
          </div>

          {/* Visibility — slim row */}
          <div>
            <span className="post-flow-label block mb-1.5 text-xs">Who can see this?</span>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1" role="group" aria-label="Visibility">
              {VISIBILITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onVisibilityChange(value)}
                  className={`shrink-0 min-h-[36px] px-3 rounded-lg text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--ig-text)] focus:ring-offset-2 focus:ring-offset-[var(--post-flow-gradient-start)] ${
                    visibility === value
                      ? "post-flow-cta"
                      : "border border-[var(--ig-border)] bg-transparent text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Media strip */}
          <div>
            <span className="post-flow-label block mb-1.5 text-xs">Media (optional)</span>
            <MediaStrip items={items} onItemsChange={onItemsChange} onEditImage={onEditImage} />
          </div>

          {/* Preview — Post is in header */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handlePreviewClick}
              className="min-h-[40px] px-4 py-2 rounded-lg border border-[var(--ig-border)] text-[var(--ig-text)] text-sm font-medium hover:bg-[var(--ig-border-light)] transition-all duration-200 active:scale-[0.98]"
            >
              Preview
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
