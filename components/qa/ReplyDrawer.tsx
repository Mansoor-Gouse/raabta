"use client";

import { useEffect, useState } from "react";
import { IconShare } from "@/components/layout/InstagramIcons";

type ReplyDrawerProps = {
  open: boolean;
  onClose: () => void;
  questionId: string;
  parentAnswerId?: string | null;
  replyingToLabel?: string;
  quotedText?: string;
  onCreated?: (answer: any) => void;
};

function IconClose({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

function IconLink({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 4.93" />
      <path d="M14 11a5 5 0 0 0-7.07 0L5.52 12.4a5 5 0 0 0 7.07 7.07L14 19.07" />
    </svg>
  );
}

export function ReplyDrawer({
  open,
  onClose,
  questionId,
  parentAnswerId,
  replyingToLabel,
  quotedText,
  onCreated,
}: ReplyDrawerProps) {
  const [text, setText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/qa/questions/${questionId}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          text: trimmed,
          isAnonymousToMembers: isAnonymous,
          parentAnswerId: parentAnswerId ?? null,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setError(payload?.error || "Could not post reply.");
      } else {
        onCreated?.(payload);
        setText("");
        setIsAnonymous(false);
        onClose();
      }
    } catch {
      setError("Could not post reply.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-[var(--ig-bg-primary)]" role="dialog" aria-modal="true" aria-label="Add comment">
        <header className="sticky top-0 z-10 flex items-center justify-between px-3 py-3 border-b border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)]">
          <button type="button" onClick={onClose} className="p-2 -m-2 text-[var(--ig-text)]" aria-label="Close">
            <IconClose />
          </button>
          <div className="text-sm font-semibold text-[var(--ig-text)]">Add comment</div>
          <button
            type="button"
            onClick={(e) => void submit(e as unknown as React.FormEvent)}
            disabled={submitting || !text.trim()}
            className="text-sm font-semibold text-[var(--ig-link)] disabled:opacity-40"
          >
            Post
          </button>
        </header>

        <div className="px-4 pt-3">
          {(quotedText || replyingToLabel) && (
            <div className="pb-3 border-b border-[var(--ig-border-light)]">
              {quotedText && (
                <div className="text-sm text-[var(--ig-text)] line-clamp-3">{quotedText}</div>
              )}
              {replyingToLabel && (
                <div className="mt-1 text-xs text-[var(--ig-text-secondary)]">Replying to {replyingToLabel}</div>
              )}
            </div>
          )}
          {error && (
            <div className="mt-3 text-xs text-red-600 dark:text-red-400">{error}</div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={4000}
            placeholder="Your comment"
            className="mt-3 w-full min-h-[45vh] bg-transparent text-[15px] text-[var(--ig-text)] outline-none resize-none"
          />
        </div>

        <footer className="fixed inset-x-0 bottom-0 z-10 px-4 py-3 border-t border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)] flex items-center justify-between">
          <button type="button" className="p-2 -m-2 text-[var(--ig-text-secondary)]" aria-label="Attach link">
            <IconLink />
          </button>
          <label className="flex items-center gap-2 text-xs text-[var(--ig-text-secondary)]">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
            />
            Discreet
          </label>
          <button type="button" className="p-2 -m-2 text-[var(--ig-text-secondary)]" aria-label="Share">
            <IconShare className="w-5 h-5" />
          </button>
        </footer>
      </div>
    </>
  );
}

