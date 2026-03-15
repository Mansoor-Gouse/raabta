"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { POST_VISIBILITY_OPTIONS, type PostVisibility } from "@/lib/visibility";

type Visibility = PostVisibility;

export function PostEditClient({
  postId,
  initialCaption,
  initialVisibility,
  mediaUrls,
}: {
  postId: string;
  initialCaption: string;
  initialVisibility: Visibility;
  mediaUrls: string[];
}) {
  const router = useRouter();
  const [caption, setCaption] = useState(initialCaption);
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: caption.trim(), visibility }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to update post.");
        return;
      }
      router.push(`/app/feed/${postId}`);
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const firstMedia = mediaUrls[0];
  const isImage = firstMedia?.match(/\.(gif|webp|png|jpe?g|avif)$/i);

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--ig-bg-primary)]">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between p-4 border-b border-[var(--ig-border-light)]">
          <Link
            href={`/app/feed/${postId}`}
            className="p-2 -ml-2 rounded-full text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
            aria-label="Cancel"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Link>
          <span className="text-base font-semibold text-[var(--ig-text)]">Edit post</span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="text-sm font-semibold text-[var(--ig-link)] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <p className="text-sm text-[var(--ig-error)]">{error}</p>}
          <div className="flex gap-4">
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-[var(--ig-border-light)] shrink-0">
              {firstMedia ? (
                isImage ? (
                  <img src={firstMedia} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--ig-text-secondary)]">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )
              ) : null}
            </div>
            <div className="flex-1 min-w-0">
              <label htmlFor="caption" className="block text-sm font-medium text-[var(--ig-text)] mb-1">
                Caption
              </label>
              <textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={4}
                placeholder="Write a caption..."
                className="w-full rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] px-3 py-2 text-sm text-[var(--ig-text)] placeholder:text-[var(--ig-text-tertiary)] resize-y focus:outline-none focus:ring-2 focus:ring-[var(--ig-link)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--ig-text)] mb-2">
              Who can see this?
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as Visibility)}
              className="w-full rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] px-3 py-2 text-sm text-[var(--ig-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ig-link)]"
            >
              {POST_VISIBILITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 rounded-lg bg-[var(--ig-link)] text-white text-sm font-semibold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
