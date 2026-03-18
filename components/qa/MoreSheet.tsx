"use client";

import { useEffect, useState } from "react";

export function MoreSheet({
  open,
  onClose,
  link,
  reportTargetType,
  reportTargetId,
}: {
  open: boolean;
  onClose: () => void;
  link: string;
  reportTargetType: "qa_question" | "qa_answer";
  reportTargetId: string;
}) {
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    setReported(false);
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // ignore
    } finally {
      onClose();
    }
  }

  async function report() {
    if (reporting) return;
    setReporting(true);
    try {
      await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          targetType: reportTargetType,
          targetId: reportTargetId,
        }),
      });
      setReported(true);
      setTimeout(() => onClose(), 800);
    } finally {
      setReporting(false);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden />
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col rounded-t-2xl bg-[var(--ig-bg-primary)] border-t border-[var(--ig-border-light)] shadow-[0_-4px_20px_rgba(0,0,0,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-label="More options"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
          <div className="w-9 h-1 rounded-full bg-[var(--ig-border)]" />
        </div>
        <div className="px-4 pb-4 space-y-2">
          <button type="button" className="w-full qa-action-btn text-sm border border-[var(--qa-card-border)]" onClick={copy}>
            Copy link
          </button>
          <button
            type="button"
            className="w-full qa-action-btn text-sm border border-[var(--qa-card-border)] text-red-600 dark:text-red-400"
            onClick={report}
            disabled={reporting || reported}
          >
            {reported ? "Reported" : reporting ? "Reporting…" : "Report"}
          </button>
          <button type="button" className="w-full qa-action-btn text-sm border border-[var(--qa-card-border)]" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </>
  );
}

