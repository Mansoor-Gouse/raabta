"use client";

import { useRef, useState, useEffect } from "react";
import { useMessageInputContext } from "stream-chat-react";

/**
 * Single attach button that expands to show Photo and File options when clicked.
 * Clean style: media options only visible after clicking the attachment icon.
 */
export function RichMediaBar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { uploadNewFiles, isUploadEnabled, maxFilesLeft } = useMessageInputContext();

  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  if (!isUploadEnabled || maxFilesLeft === 0) return null;

  const handlePhoto = () => {
    inputRef.current?.click();
    setExpanded(false);
  };
  const handleFile = () => {
    fileRef.current?.click();
    setExpanded(false);
  };

  return (
      <div className="relative flex items-center" ref={panelRef}>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files?.length) uploadNewFiles(files);
            e.target.value = "";
          }}
          aria-label="Add photo"
        />
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files?.length) uploadNewFiles(files);
            e.target.value = "";
          }}
          aria-label="Add file"
        />
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="p-2 rounded-lg text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)] min-h-[40px] min-w-[40px] flex items-center justify-center touch-manipulation"
          aria-label={expanded ? "Close attachments" : "Add attachment"}
          aria-expanded={expanded}
        >
          <AttachIcon />
        </button>
        {expanded && (
          <div className="absolute bottom-full left-0 mb-1 py-1.5 px-1 bg-[var(--ig-bg-primary)] rounded-lg border border-[var(--ig-border)] shadow-lg flex items-center gap-0.5 z-10">
            <button
              type="button"
              onClick={handlePhoto}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] min-h-[40px] touch-manipulation"
            >
              <PhotoIcon />
              <span>Photo</span>
            </button>
            <button
              type="button"
              onClick={handleFile}
              className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] min-h-[40px] touch-manipulation"
            >
              <FileIcon />
              <span>File</span>
            </button>
          </div>
        )}
      </div>
  );
}

function AttachIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
      />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5a2 2 0 011.414.586l2.5 2.5A2 2 0 0118 8.414V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
