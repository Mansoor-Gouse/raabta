"use client";

import { useRef, useCallback } from "react";

const MAX_FILES = 10;
const ACCEPT = "image/*,video/*";

function processFiles(files: FileList | null, existingCount: number): MediaItem[] {
  if (!files?.length) return [];
  const newItems: MediaItem[] = [];
  const remaining = MAX_FILES - existingCount;
  for (let i = 0; i < Math.min(files.length, remaining); i++) {
    const file = files[i];
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isImage && !isVideo) continue;
    const type = isVideo ? "video" : "image";
    const preview = type === "image" ? URL.createObjectURL(file) : "";
    newItems.push({ file, preview, type });
  }
  return newItems;
}

export type MediaItem = {
  file: File;
  preview: string;
  type: "image" | "video";
  editedBlob?: Blob;
  editedPreview?: string;
};

export function MediaSelector({
  items,
  onItemsChange,
  onNext,
}: {
  items: MediaItem[];
  onItemsChange: (items: MediaItem[]) => void;
  onNext: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newItems = processFiles(e.target.files, items.length);
      if (newItems.length) onItemsChange([...items, ...newItems]);
      e.target.value = "";
    },
    [items, onItemsChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const newItems = processFiles(e.dataTransfer.files, items.length);
      if (newItems.length) onItemsChange([...items, ...newItems]);
    },
    [items, onItemsChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  function remove(index: number) {
    const item = items[index];
    if (item.preview) URL.revokeObjectURL(item.preview);
    onItemsChange(items.filter((_, i) => i !== index));
  }

  function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    const arr = [...items];
    [arr[index], arr[next]] = [arr[next], arr[index]];
    onItemsChange(arr);
  }

  const canAdd = items.length < MAX_FILES;

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex-1 overflow-auto">
        <div className="post-flow-card p-6 min-h-[280px] flex flex-col gap-5 post-flow-animate-in">
        {items.length === 0 ? (
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="flex-1 w-full min-h-[260px] rounded-2xl border-2 border-dashed border-[var(--ig-border)] flex flex-col items-center justify-center gap-4 text-[var(--ig-text-secondary)] transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--ig-text)] focus:ring-offset-4 focus:ring-offset-[var(--post-flow-gradient-start)] hover:border-[var(--ig-text)] hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]"
            style={{ background: "linear-gradient(145deg, var(--post-flow-gradient-start) 0%, var(--post-flow-gradient-end) 100%)" }}
          >
            <div className="post-flow-icon-float rounded-2xl p-4 bg-[var(--ig-border-light)]/80">
              <svg className="w-14 h-14 text-[var(--ig-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="post-flow-title text-center text-[var(--ig-text)]">Add photos or videos</span>
            <span className="post-flow-hint text-center max-w-[240px]">Optional — up to {MAX_FILES} items. Drag and drop or tap to browse.</span>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={handleFileSelect}
              aria-label="Select media"
            />
          </div>
        ) : (
          <div
            className="space-y-4 flex-1 flex flex-col"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <p className="post-flow-label">Tap to reorder or remove</p>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {items.map((item, i) => (
                <div
                  key={i}
                  className="relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-[var(--ig-border-light)] group transition-all duration-200 hover:scale-105 hover:shadow-lg"
                >
                  {item.type === "image" ? (
                    <img src={item.editedPreview ?? item.preview} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[var(--ig-text-secondary)]">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); move(i, -1); }}
                      disabled={i === 0}
                      className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm font-bold disabled:opacity-40 hover:scale-110 transition-transform"
                      aria-label="Move left"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); remove(i); }}
                      className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm font-bold hover:scale-110 transition-transform"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); move(i, 1); }}
                      disabled={i === items.length - 1}
                      className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm font-bold disabled:opacity-40 hover:scale-110 transition-transform"
                      aria-label="Move right"
                    >
                      ›
                    </button>
                  </div>
                </div>
              ))}
              {canAdd && (
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="shrink-0 w-20 h-20 rounded-2xl border-2 border-dashed border-[var(--ig-border)] flex items-center justify-center text-[var(--ig-text-tertiary)] hover:border-[var(--ig-text)] hover:bg-[var(--ig-border-light)]/50 hover:text-[var(--ig-text)] transition-all duration-200 active:scale-95"
                  aria-label="Add more"
                >
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={handleFileSelect}
              aria-label="Select media"
            />
          </div>
        )}
        {items.length > 0 && (
          <div className="pt-3">
            <button
              type="button"
              onClick={onNext}
              className="post-flow-cta w-full py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-95 active:scale-[0.98] shadow-lg"
            >
              Next — Edit & filter
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
