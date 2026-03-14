"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import type { MediaItem } from "./MediaSelector";
import { processFiles, ACCEPT, MAX_FILES } from "./MediaSelector";

type MediaStripProps = {
  items: MediaItem[];
  onItemsChange: (items: MediaItem[]) => void;
  onEditImage: (index: number) => void;
};

export function MediaStrip({ items, onItemsChange, onEditImage }: MediaStripProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const [activeThumb, setActiveThumb] = useState<number | null>(null);

  useEffect(() => {
    if (activeThumb === null) return;
    const close = (e: MouseEvent) => {
      if (!stripRef.current?.contains(e.target as Node)) setActiveThumb(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [activeThumb]);

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

  if (items.length === 0) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="flex items-center justify-center gap-3 w-full min-h-[56px] px-4 py-3 rounded-xl border-2 border-dashed border-[var(--ig-border)] text-[var(--ig-text-secondary)] transition-all duration-200 cursor-pointer hover:border-[var(--ig-text-tertiary)] hover:bg-[var(--ig-border-light)]/60 hover:text-[var(--ig-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ig-text)] focus:ring-offset-2"
      >
        <svg className="w-6 h-6 shrink-0 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-semibold">Add photos or video</span>
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
    );
  }

  return (
    <div
      ref={stripRef}
      data-media-strip
      className="flex gap-3 overflow-x-auto no-scrollbar items-center min-h-[52px]"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className="relative shrink-0 w-12 h-12 rounded-xl overflow-hidden bg-[var(--ig-border-light)] group transition-transform hover:scale-[1.03] ring-1 ring-[var(--ig-border)]"
          role={item.type === "video" ? "button" : undefined}
          tabIndex={item.type === "video" ? 0 : undefined}
          onClick={(e) => {
            if (item.type === "video") {
              onEditImage(i);
            } else {
              e.stopPropagation();
              setActiveThumb((prev) => (prev === i ? null : i));
            }
          }}
          onKeyDown={item.type === "video" ? (e) => e.key === "Enter" && onEditImage(i) : undefined}
        >
          {item.type === "image" ? (
            <img src={item.editedPreview ?? item.preview} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--ig-text-secondary)]">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4h-3l-2-4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
              </svg>
            </div>
          )}
          <div className={`absolute inset-0 bg-black/50 flex items-center justify-center gap-0.5 transition-opacity ${activeThumb === i ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
            {item.type === "image" && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveThumb(null); onEditImage(i); }}
                className="w-6 h-6 rounded-full bg-white/90 text-black flex items-center justify-center text-xs font-bold hover:scale-110 transition-transform"
                aria-label="Edit"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
            )}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); move(i, -1); }}
              disabled={i === 0}
              className="w-6 h-6 rounded-full bg-white/90 text-black flex items-center justify-center text-xs disabled:opacity-40 hover:scale-110 transition-transform"
              aria-label="Move left"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(i); }}
              className="w-6 h-6 rounded-full bg-white/90 text-black flex items-center justify-center text-xs font-bold hover:scale-110 transition-transform"
              aria-label="Remove"
            >
              ×
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); move(i, 1); }}
              disabled={i === items.length - 1}
              className="w-6 h-6 rounded-full bg-white/90 text-black flex items-center justify-center text-xs disabled:opacity-40 hover:scale-110 transition-transform"
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
          className="shrink-0 w-12 h-12 rounded-xl border-2 border-dashed border-[var(--ig-border)] flex items-center justify-center text-[var(--ig-text-tertiary)] hover:border-[var(--ig-text-tertiary)] hover:bg-[var(--ig-border-light)]/60 hover:text-[var(--ig-text)] transition-all duration-200 active:scale-95"
          aria-label="Add more"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={handleFileSelect}
        aria-label="Select more media"
      />
    </div>
  );
}
