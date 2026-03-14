"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type MediaItem } from "@/components/feed/new/MediaSelector";
import type { Visibility } from "@/components/feed/new/CaptionStep";
import { ComposeView } from "@/components/feed/new/ComposeView";
import { CropEditor } from "@/components/feed/new/CropEditor";

export default function NewPostPage() {
  const router = useRouter();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("network");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editModalItemIndex, setEditModalItemIndex] = useState<number | null>(null);

  const handleItemsChange = useCallback((newItems: MediaItem[]) => {
    setItems(newItems);
    setError("");
  }, []);

  const canPost = caption.trim().length > 0 || items.length > 0;

  function handleCropDone(blob: Blob) {
    if (editModalItemIndex === null) return;
    const url = URL.createObjectURL(blob);
    setItems((prev) => {
      const next = [...prev];
      const item = next[editModalItemIndex];
      if (item.preview) URL.revokeObjectURL(item.preview);
      next[editModalItemIndex] = {
        ...item,
        editedBlob: blob,
        editedPreview: url,
      };
      return next;
    });
    setEditModalItemIndex(null);
  }

  function handleCropSkip() {
    setEditModalItemIndex(null);
  }

  async function handleShare() {
    setError("");
    setSaving(true);
    try {
      let mediaUrls: string[] = [];
      if (items.length > 0) {
        const formData = new FormData();
        items.forEach((item) => {
          const fileToUpload =
            item.editedBlob
              ? new File([item.editedBlob], item.file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
              : item.file;
          formData.append("files", fileToUpload);
        });
        const uploadRes = await fetch("/api/posts/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          setError(uploadData.error || "Upload failed.");
          return;
        }
        mediaUrls = uploadData.mediaUrls ?? [];
        if (mediaUrls.length === 0) {
          setError("No media uploaded.");
          return;
        }
      }
      const postRes = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption: caption.trim() || undefined,
          mediaUrls,
          visibility,
        }),
      });
      const postData = await postRes.json();
      if (!postRes.ok) {
        setError(postData.error || "Failed to create post.");
        return;
      }
      router.push("/app/feed");
      router.refresh();
    } catch {
      setError("Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const editingItem = editModalItemIndex !== null ? items[editModalItemIndex] : null;
  const isEditingImage = editingItem?.type === "image";
  const isEditingVideo = editingItem?.type === "video";

  return (
    <div className="flex-1 flex flex-col overflow-hidden post-flow-page min-h-0">
      {/* Slim header */}
      <header className="shrink-0 flex items-center justify-between px-3 py-2.5 border-b border-[var(--ig-border-light)] bg-[var(--post-flow-gradient-start)]/90 backdrop-blur-sm">
        <Link
          href="/app/feed"
          className="p-2 -ml-2 rounded-lg text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] active:scale-95 transition-all duration-200"
          aria-label="Cancel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <span className="text-base font-semibold text-[var(--ig-text)]">New post</span>
        <button
          type="button"
          onClick={handleShare}
          disabled={!canPost || saving}
          className="post-flow-cta px-3 py-2 rounded-lg text-sm font-semibold hover:opacity-95 disabled:opacity-50 transition-all duration-200 active:scale-[0.98]"
        >
          {saving ? "Posting…" : "Post"}
        </button>
      </header>

      {/* Compose — content-first single screen */}
      <ComposeView
        caption={caption}
        onCaptionChange={setCaption}
        visibility={visibility}
        onVisibilityChange={setVisibility}
        items={items}
        onItemsChange={handleItemsChange}
        onEditImage={(index) => setEditModalItemIndex(index)}
        onPreview={() => {}}
        onPost={handleShare}
        saving={saving}
        error={error}
        canPost={canPost}
      />

      {/* Edit image modal — full-screen overlay */}
      {editModalItemIndex !== null && isEditingImage && editingItem && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--ig-bg)]">
          <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-[var(--ig-border-light)] bg-[var(--post-flow-gradient-start)]">
            <button
              type="button"
              onClick={handleCropSkip}
              className="p-2 rounded-lg text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-sm font-medium text-[var(--ig-text)]">Edit photo</span>
            <div className="w-9" aria-hidden />
          </div>
          <div className="flex-1 min-h-0">
            <CropEditor
              imageSrc={editingItem.preview}
              aspect={1}
              onDone={handleCropDone}
              onSkip={handleCropSkip}
            />
          </div>
        </div>
      )}

      {/* Edit video — "used as-is" overlay */}
      {editModalItemIndex !== null && isEditingVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Video"
        >
          <div className="bg-[var(--post-flow-card)] rounded-xl p-6 max-w-sm w-full text-center post-flow-animate-in">
            <p className="text-sm font-medium text-[var(--ig-text)]">Videos are used as-is</p>
            <p className="text-xs text-[var(--ig-text-secondary)] mt-1">No cropping for video clips.</p>
            <button
              type="button"
              onClick={() => setEditModalItemIndex(null)}
              className="post-flow-cta w-full mt-4 py-2.5 rounded-lg text-sm font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
