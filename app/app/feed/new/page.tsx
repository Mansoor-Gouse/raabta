"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MediaSelector, type MediaItem } from "@/components/feed/new/MediaSelector";
import { CaptionStep, type Visibility } from "@/components/feed/new/CaptionStep";
import { CropEditor } from "@/components/feed/new/CropEditor";

type Step = "select" | "edit" | "caption";

const STEPS: Step[] = ["select", "edit", "caption"];

export default function NewPostPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("select");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [editIndex, setEditIndex] = useState(0);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("network");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleItemsChange = useCallback((newItems: MediaItem[]) => {
    setItems(newItems);
    setError("");
  }, []);

  const stepIndex = STEPS.indexOf(step);

  function goNext() {
    if (items.length === 0) return;
    setStep("edit");
    setEditIndex(0);
    setError("");
  }

  function goBack() {
    if (step === "caption") {
      if (items.length === 0) setStep("select");
      else {
        setStep("edit");
        setEditIndex(items.length - 1);
      }
    } else if (step === "edit") {
      setStep("select");
    }
    setError("");
  }

  const currentEditItem = step === "edit" ? items[editIndex] : null;
  const isLastEdit = editIndex >= items.length - 1;

  function handleCropDone(blob: Blob) {
    const url = URL.createObjectURL(blob);
    setItems((prev) => {
      const next = [...prev];
      const item = next[editIndex];
      if (item.preview) URL.revokeObjectURL(item.preview);
      next[editIndex] = {
        ...item,
        editedBlob: blob,
        editedPreview: url,
      };
      return next;
    });
    if (isLastEdit) setStep("caption");
    else setEditIndex((i) => i + 1);
  }

  function handleCropSkip() {
    if (isLastEdit) setStep("caption");
    else setEditIndex((i) => i + 1);
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden post-flow-page min-h-0">
      <header className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-[var(--ig-border-light)] bg-[var(--post-flow-gradient-start)]/80 backdrop-blur-sm">
        <Link
          href={step === "select" ? "/app/feed" : "#"}
          onClick={(e) => (step === "caption" || step === "edit") && (e.preventDefault(), goBack())}
          className="p-2 -ml-2 rounded-lg text-[var(--ig-text)] hover:opacity-80 transition-opacity"
          aria-label={step === "select" ? "Cancel" : "Back"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        {/* Step progress: 1 – 2 – 3 */}
        <div className="flex items-center gap-2" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={3} aria-label={`Step ${stepIndex + 1} of 3`}>
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                i < stepIndex
                  ? "bg-[var(--ig-text)] text-[var(--post-flow-gradient-start)]"
                  : i === stepIndex
                    ? "bg-[var(--ig-text)] text-[var(--post-flow-gradient-start)] ring-2 ring-[var(--ig-text)] ring-offset-2 ring-offset-[var(--post-flow-gradient-start)]"
                    : "bg-[var(--post-flow-gradient-end)] text-[var(--ig-text-secondary)] border border-[var(--ig-border)]"
              }`}
            >
              {i + 1}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[var(--ig-text)]">
            {step === "select" ? "New post" : step === "edit" ? "Edit media" : "Write post"}
          </span>
          {step === "select" ? (
            <div className="w-9" aria-hidden />
          ) : step === "caption" ? (
            <button
              type="button"
              onClick={handleShare}
              disabled={saving}
              className="text-sm font-semibold text-[var(--ig-link)] hover:opacity-80 disabled:opacity-50 transition-opacity"
            >
              {saving ? "Posting…" : "Share"}
            </button>
          ) : (
            <div className="text-xs text-[var(--ig-text-secondary)] w-9 text-center">
              {editIndex + 1}/{items.length}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
        {step === "select" && (
          <div key="select" className="flex-1 min-h-0 flex flex-col post-flow-step-enter">
            <MediaSelector
              items={items}
              onItemsChange={handleItemsChange}
              onNext={goNext}
            />
            <div className="pt-3 px-4 pb-4">
              <button
                type="button"
                onClick={() => { setStep("caption"); setError(""); }}
                className="post-flow-cta w-full py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-95"
              >
                Post without photo/video
              </button>
            </div>
          </div>
        )}
        {step === "edit" && currentEditItem && (
          <div key="edit" className="flex-1 min-h-0 flex flex-col post-flow-step-enter">
            {currentEditItem.type === "image" ? (
              <CropEditor
                imageSrc={currentEditItem.preview}
                aspect={1}
                onDone={handleCropDone}
                onSkip={handleCropSkip}
              />
            ) : (
              <div className="flex flex-col flex-1 p-4">
                <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center text-[var(--ig-text-secondary)]">
                  <p className="text-sm">Videos are used as-is.</p>
                  <p className="text-xs text-[var(--ig-text-tertiary)]">No cropping for video clips.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCropSkip}
                  className="post-flow-cta min-h-[44px] w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-95"
                >
                  {isLastEdit ? "Next" : "Next media"}
                </button>
              </div>
            )}
          </div>
        )}
        {step === "caption" && (
          <div key="caption" className="flex-1 min-h-0 flex flex-col post-flow-step-enter">
            <CaptionStep
              items={items}
              caption={caption}
              onCaptionChange={setCaption}
              visibility={visibility}
              onVisibilityChange={setVisibility}
              onBack={goBack}
              onShare={handleShare}
              saving={saving}
              error={error}
            />
          </div>
        )}
      </div>
    </div>
  );
}
