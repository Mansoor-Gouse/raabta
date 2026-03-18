"use client";

import { useEffect, useState } from "react";

type ReplyDrawerProps = {
  open: boolean;
  onClose: () => void;
  questionId: string;
  parentAnswerId?: string | null;
  replyingToLabel?: string;
  onCreated?: (answer: any) => void;
};

export function ReplyDrawer({
  open,
  onClose,
  questionId,
  parentAnswerId,
  replyingToLabel,
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
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[82vh] rounded-t-2xl bg-[var(--ig-bg-primary)] border-t border-[var(--ig-border-light)] shadow-[0_-4px_20px_rgba(0,0,0,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-label="Reply"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-[var(--ig-border-light)]">
          <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
            <div className="w-9 h-1 rounded-full bg-[var(--ig-border)]" />
          </div>
          <div className="px-4 pb-3">
            <h2 className="text-lg font-semibold text-[var(--ig-text)]">Reply</h2>
            {replyingToLabel && (
              <div className="mt-1 text-xs text-[var(--ig-text-secondary)]">
                Replying to {replyingToLabel}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={submit} className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4 space-y-3">
          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={4000}
            placeholder="Write a helpful reply…"
            className="w-full rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] px-3 py-2 text-sm text-[var(--ig-text)] resize-y"
          />
          <label className="flex items-start gap-2 text-xs text-[var(--ig-text)]">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Reply discreetly
              <span className="block text-[10px] text-[var(--ig-text-secondary)]">
                Members will see your anonymous handle (once set).
              </span>
            </span>
          </label>
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full bg-[var(--ig-text)] text-[var(--ig-bg-primary)] text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Post reply"}
          </button>
        </form>
      </div>
    </>
  );
}

