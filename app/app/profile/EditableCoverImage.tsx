"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  bannerImage: string | null | undefined;
};

export function EditableCoverImage({ bannerImage }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith("image/")) return;
    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("type", "banner");
      const res = await fetch("/api/me/upload-image", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="relative group" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="block w-full h-32 sm:h-40 bg-[var(--elite-border-light)] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)] focus-visible:ring-inset cursor-pointer"
        style={{
          backgroundImage: bannerImage ? `url(${bannerImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Cover photo options"
      >
        <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 rounded-[var(--elite-radius)] bg-black/60 text-white px-3 py-1.5 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {bannerImage ? "View / Change cover" : "Add cover"}
          </span>
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
        aria-hidden
      />

      {open && (
        <div className="absolute right-4 bottom-2 z-20 min-w-[180px] rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-card)] shadow-lg py-1">
          {bannerImage && (
            <a
              href={bannerImage}
              target="_blank"
              rel="noopener noreferrer"
              className="elite-events flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-[var(--elite-text)] hover:bg-[var(--elite-surface)]"
              onClick={() => setOpen(false)}
            >
              <svg className="w-4 h-4 shrink-0 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View cover
            </a>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="elite-events flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-[var(--elite-text)] hover:bg-[var(--elite-surface)] disabled:opacity-50"
          >
            <svg className="w-4 h-4 shrink-0 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {uploading ? "Uploading…" : bannerImage ? "Change cover" : "Add cover"}
          </button>
          {error && (
            <p className="px-3 py-2 text-xs text-red-500 dark:text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
