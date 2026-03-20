"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { type MediaItem } from "@/components/feed/new/MediaSelector";
import type { Visibility } from "@/components/feed/new/CaptionStep";
import { ComposeView } from "@/components/feed/new/ComposeView";
import { CropEditor } from "@/components/feed/new/CropEditor";
import { profileToPostVisibility } from "@/lib/visibility";
import { upload } from "@vercel/blob/client";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB
const MAX_TOTAL_UPLOAD_BYTES = 300 * 1024 * 1024; // 300 MB guardrail
const MAX_VIDEO_DURATION_SECONDS = 60; // Standard feed videos

export default function NewPostPage() {
  const router = useRouter();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("network");
  const [visibilityInitialized, setVisibilityInitialized] = useState(false);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data: { profileVisibilityPosts?: "everyone" | "trusted_circle" | "inner_circle" }) => {
        const profilePosts = data.profileVisibilityPosts ?? "everyone";
        setVisibility(profileToPostVisibility(profilePosts));
        setVisibilityInitialized(true);
      })
      .catch(() => setVisibilityInitialized(true));
  }, []);
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
        const urls: string[] = [];
        let totalUploadBytes = 0;

        const getVideoDurationSeconds = (file: File) =>
          new Promise<number>((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const v = document.createElement("video");
            v.preload = "metadata";
            v.muted = true;
            v.playsInline = true;
            v.onloadedmetadata = () => {
              const d = v.duration;
              URL.revokeObjectURL(url);
              v.remove();
              if (!Number.isFinite(d)) reject(new Error("Invalid duration"));
              else resolve(d);
            };
            v.onerror = () => {
              URL.revokeObjectURL(url);
              v.remove();
              reject(new Error("Could not read duration"));
            };
            v.src = url;
          });

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const asImage = item.type === "image";

          const fileToUpload = item.editedBlob
            ? new File([item.editedBlob], item.file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })
            : item.file;

          if (asImage && fileToUpload.size > MAX_IMAGE_SIZE_BYTES) {
            setError(`Image ${fileToUpload.name} exceeds ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} MB limit`);
            return;
          }
          if (!asImage && fileToUpload.size > MAX_VIDEO_SIZE_BYTES) {
            setError(`Video ${fileToUpload.name} exceeds ${MAX_VIDEO_SIZE_BYTES / 1024 / 1024} MB limit`);
            return;
          }

          totalUploadBytes += fileToUpload.size ?? 0;
          if (totalUploadBytes > MAX_TOTAL_UPLOAD_BYTES) {
            setError("Total upload is too large. Please reduce the number/size of files.");
            return;
          }

          const ext = (fileToUpload.name.split(".").pop() || (asImage ? "jpg" : "mp4")).toLowerCase();
          const blobPath = `posts/${Date.now()}-${i}-${Math.random().toString(16).slice(2)}.${ext}`;

          if (!asImage) {
            const durationSec = await getVideoDurationSeconds(fileToUpload);
            if (durationSec > MAX_VIDEO_DURATION_SECONDS) {
              setError(`Video is too long for posts (max ${MAX_VIDEO_DURATION_SECONDS}s).`);
              return;
            }
          }

          // Upload directly to Vercel Blob to avoid 413 from serverless request body limits.
          const uploadResult = await upload(blobPath, fileToUpload, {
            access: "public",
            handleUploadUrl: "/api/posts/client-upload",
          });
          urls.push(uploadResult.url);
        }

        mediaUrls = urls;
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
      {/* Header: slim, title left */}
      <header className="shrink-0 flex items-center gap-3 px-3 py-2 border-b border-[var(--ig-border-light)] bg-[var(--post-flow-gradient-start)]/95 backdrop-blur-md">
        <Link
          href="/app/feed"
          className="p-2 -ml-1 rounded-lg text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] active:scale-95 transition-all duration-200 flex items-center justify-center"
          aria-label="Cancel"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="post-flow-heading text-lg font-semibold text-[var(--ig-text)]">New post</h1>
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
          <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--ig-border-light)] bg-[var(--post-flow-gradient-start)]/95 backdrop-blur-md">
            <button
              type="button"
              onClick={handleCropSkip}
              className="p-2.5 rounded-xl text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="post-flow-heading text-lg">Edit photo</span>
            <div className="w-10" aria-hidden />
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
          <div className="post-flow-section rounded-2xl p-6 max-w-sm w-full text-center post-flow-animate-in border-0 shadow-xl">
            <p className="post-flow-section-title">Videos are used as-is</p>
            <p className="post-flow-label mt-2">No cropping for video clips.</p>
            <button
              type="button"
              onClick={() => setEditModalItemIndex(null)}
              className="post-flow-cta w-full mt-5 py-3 rounded-xl text-sm font-semibold shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
