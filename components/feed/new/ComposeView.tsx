"use client";

import { useState, useEffect } from "react";
import type { MediaItem } from "./MediaSelector";
import type { Visibility } from "./CaptionStep";
import { PostPreviewCard } from "./PostPreviewCard";
import { MediaStrip } from "./MediaStrip";
import { POST_VISIBILITY_OPTIONS } from "@/lib/visibility";

const CAPTION_MAX_LENGTH = 2200;
const VISIBILITY_OPTIONS = POST_VISIBILITY_OPTIONS;

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
              className="mt-4 w-full py-3 rounded-xl border border-[var(--ig-border)] text-[var(--ig-text)] text-sm font-semibold hover:bg-[var(--ig-border-light)] transition-all post-flow-section"
            >
              Close preview
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto p-4">
        <div className="max-w-xl mx-auto space-y-5">
          {/* Post content — elevated card with label */}
          <div className="post-flow-section p-4">
            <label htmlFor="compose-caption" className="post-flow-section-title block mb-3">
              Post content
            </label>
            <div className="relative">
              <textarea
                id="compose-caption"
                value={caption}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.length <= CAPTION_MAX_LENGTH) onCaptionChange(v);
                }}
                rows={5}
                placeholder="What do you want to share? Add a caption or start with media below."
                maxLength={CAPTION_MAX_LENGTH}
                className="post-flow-input w-full min-h-[128px] resize-y py-3.5 px-4 text-[0.9375rem] leading-relaxed rounded-xl border-0 bg-transparent focus:ring-0 focus:shadow-none placeholder:text-[var(--ig-text-tertiary)]"
                aria-describedby="compose-caption-count"
              />
              <p
                id="compose-caption-count"
                className="absolute bottom-3 right-3 post-flow-hint tabular-nums post-flow-count-update"
                key={caption.length}
              >
                {caption.length} / {CAPTION_MAX_LENGTH}
              </p>
            </div>
          </div>

          {/* Visibility — chip row */}
          <div>
            <p className="post-flow-section-title mb-3">Who can see this?</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Visibility">
              {VISIBILITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onVisibilityChange(value)}
                  className={`post-flow-chip shrink-0 focus:outline-none focus:ring-2 focus:ring-[var(--ig-text)] focus:ring-offset-2 focus:ring-offset-[var(--post-flow-gradient-start)] ${
                    visibility === value ? "post-flow-chip-selected" : "post-flow-chip-unselected"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Media — optional */}
          <div className="post-flow-section p-4">
            <p className="post-flow-section-title mb-3">Media (optional)</p>
            <MediaStrip items={items} onItemsChange={onItemsChange} onEditImage={onEditImage} />
          </div>

          {/* Preview */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handlePreviewClick}
              className="w-full min-h-[44px] px-4 py-3 rounded-xl border border-[var(--ig-border)] text-[var(--ig-text)] text-sm font-semibold hover:bg-[var(--ig-border-light)] transition-all duration-200 active:scale-[0.99] post-flow-section"
            >
              Preview post
            </button>
          </div>

          {error && (
            <p role="alert" className="text-sm font-medium text-[var(--ig-error)] py-2">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
