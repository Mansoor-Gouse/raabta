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

  const stepLabels = ["Choose media", "Edit & filter", "Write post"];
  const stepIcons = [
    <svg key="media" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    <svg key="edit" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
    <svg key="caption" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden post-flow-page min-h-0">
      <header className="shrink-0 flex items-center justify-between px-4 py-3.5 border-b border-[var(--ig-border-light)] bg-[var(--post-flow-gradient-start)]/90 backdrop-blur-md shadow-sm">
        <Link
          href={step === "select" ? "/app/feed" : "#"}
          onClick={(e) => (step === "caption" || step === "edit") && (e.preventDefault(), goBack())}
          className="p-2.5 -ml-2 rounded-xl text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] active:scale-95 transition-all duration-200"
          aria-label={step === "select" ? "Cancel" : "Back"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        {/* Step progress with icons */}
        <div className="flex items-center gap-1 sm:gap-2" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={3} aria-label={`Step ${stepIndex + 1} of 3`}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`flex items-center justify-center gap-1 rounded-full transition-all duration-300 ${
                i < stepIndex
                  ? "bg-[var(--ig-text)] text-[var(--post-flow-gradient-start)] w-8 h-8 sm:w-9 sm:h-9"
                  : i === stepIndex
                    ? "bg-[var(--ig-text)] text-[var(--post-flow-gradient-start)] ring-2 ring-[var(--ig-text)] ring-offset-2 ring-offset-[var(--post-flow-gradient-start)] w-8 h-8 sm:w-9 sm:h-9 post-flow-animate-in"
                    : "bg-[var(--post-flow-gradient-end)] text-[var(--ig-text-tertiary)] border border-[var(--ig-border)] w-8 h-8 sm:w-9 sm:h-9"
              }`}
            >
              {stepIcons[i]}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="post-flow-title truncate hidden sm:block">
            {stepLabels[stepIndex]}
          </span>
          {step === "select" ? (
            <div className="w-10" aria-hidden />
          ) : step === "caption" ? (
            <button
              type="button"
              onClick={handleShare}
              disabled={saving}
              className="post-flow-cta px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-95 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {saving ? "Posting…" : "Post"}
            </button>
          ) : (
            <span className="post-flow-hint text-center w-10">
              {editIndex + 1}/{items.length}
            </span>
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
            <div className="pt-3 px-4 pb-6">
              <button
                type="button"
                onClick={() => { setStep("caption"); setError(""); }}
                className="w-full py-3.5 rounded-xl text-sm font-semibold border-2 border-[var(--ig-text)] text-[var(--ig-text)] bg-transparent hover:bg-[var(--ig-text)] hover:text-[var(--post-flow-gradient-start)] transition-all duration-200 active:scale-[0.98]"
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
              <div className="flex flex-col flex-1 p-4 post-flow-animate-in">
                <div className="post-flow-card flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <div className="rounded-2xl p-5 bg-[var(--ig-border-light)]/80">
                    <svg className="w-14 h-14 text-[var(--ig-text)]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4h-3l-2-4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                    </svg>
                  </div>
                  <p className="post-flow-title">Videos are used as-is</p>
                  <p className="post-flow-hint">No cropping for video clips. Tap below to continue.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCropSkip}
                  className="post-flow-cta min-h-[48px] w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-95 active:scale-[0.98] mt-4"
                >
                  {isLastEdit ? "Next — Write post" : "Next media"}
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
