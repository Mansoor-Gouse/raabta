"use client";

interface StatusNewMediaGridProps {
  onCameraClick: () => void;
  onGalleryClick: () => void;
  items: Array<{
    id: string;
    previewUrl: string;
    isVideo: boolean;
    videoDuration?: string | null;
  }>;
  primaryId: string | null;
  onRemoveItem: (id: string) => void;
  onSetPrimary: (id: string) => void;
  canAddMore: boolean;
}

const cellClass =
  "aspect-square w-full rounded-lg flex items-center justify-center overflow-hidden relative";

export function StatusNewMediaGrid({
  onCameraClick,
  onGalleryClick,
  items,
  primaryId,
  onRemoveItem,
  onSetPrimary,
  canAddMore,
}: StatusNewMediaGridProps) {
  return (
    <div className="grid grid-cols-3 gap-2 p-4 overflow-y-auto flex-1 min-h-0">
      {/* Camera cell */}
      <button
        type="button"
        onClick={onCameraClick}
        className={cellClass}
        style={{ background: "var(--story-add-gradient-cell)" }}
        aria-label="Take photo or video"
      >
        <svg
          className="w-12 h-12 text-white opacity-90"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 13v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7"
          />
        </svg>
      </button>

      {/* Add-more / gallery cell */}
      <button
        type="button"
        onClick={onGalleryClick}
        disabled={!canAddMore}
        className={`${cellClass} p-0 disabled:opacity-40`}
        style={{ background: "var(--story-add-gradient-cell)" }}
        aria-label="Choose from gallery"
      >
        <svg
          className="w-10 h-10 text-white/70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </button>

      {items.map((it) => {
        const isPrimary = primaryId === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onSetPrimary(it.id)}
            className={`${cellClass} p-0`}
            style={{ background: "var(--story-add-gradient-cell)" }}
            aria-label={isPrimary ? "Selected (primary)" : "Select as primary"}
          >
            {it.isVideo ? (
              <video
                src={it.previewUrl}
                className="absolute inset-0 w-full h-full object-cover"
                muted
                playsInline
                preload="metadata"
              />
            ) : (
              <img
                src={it.previewUrl}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}

            {/* Selection indicator: empty/filled white circle top-right */}
            <span
              className={`absolute top-1.5 right-1.5 w-5 h-5 rounded-full border-2 border-white ${
                isPrimary ? "bg-white" : "bg-transparent"
              }`}
              aria-hidden
            />

            {/* Remove (top-left) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemoveItem(it.id);
              }}
              className="absolute top-1.5 left-1.5 w-7 h-7 rounded-full bg-black/55 text-white flex items-center justify-center hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/30"
              aria-label="Remove"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Video duration bottom-right */}
            {it.isVideo && it.videoDuration && (
              <span
                className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-xs font-medium"
                aria-hidden
              >
                {it.videoDuration}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
