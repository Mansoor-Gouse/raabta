"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Props = {
  profileImage: string | null | undefined;
  displayName: string;
  isVerified?: boolean;
  verificationLevel?: string;
};

export function EditableProfileAvatar({
  profileImage,
  displayName,
  isVerified,
  verificationLevel,
}: Props) {
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
      formData.set("type", "profile");
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
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative block w-24 h-24 rounded-[var(--elite-radius)] border-4 border-[var(--elite-bg)] bg-[var(--elite-border)] overflow-hidden flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--elite-bg)]"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Profile photo options"
      >
        {profileImage ? (
          <img src={profileImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="elite-heading text-3xl font-medium text-[var(--elite-text-muted)]">
            {displayName?.charAt(0)?.toUpperCase() || "?"}
          </span>
        )}
        <span className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          </svg>
        </span>
        {isVerified && (
          <span
            className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[var(--elite-accent)] flex items-center justify-center text-[var(--elite-on-accent)] pointer-events-none"
            title={`Verified: ${verificationLevel ?? "member"}`}
            aria-hidden
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </span>
        )}
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
        <div className="absolute left-0 top-full mt-2 z-20 min-w-[160px] rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-card)] shadow-lg py-1">
          {profileImage && (
            <a
              href={profileImage}
              target="_blank"
              rel="noopener noreferrer"
              className="elite-events flex items-center gap-2 w-full px-3 py-2 text-left text-sm text-[var(--elite-text)] hover:bg-[var(--elite-surface)]"
              onClick={() => setOpen(false)}
            >
              <svg className="w-4 h-4 shrink-0 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              View photo
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
            {uploading ? "Uploading…" : "Change photo"}
          </button>
          {error && (
            <p className="px-3 py-2 text-xs text-red-500 dark:text-red-400">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
