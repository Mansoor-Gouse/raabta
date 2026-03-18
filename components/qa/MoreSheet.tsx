"use client";

import { useEffect, useState } from "react";
import { IconShare } from "@/components/layout/InstagramIcons";

function IconPencil({ className = "w-4 h-4" }: { className?: string }) {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function IconTrash({ className = "w-4 h-4" }: { className?: string }) {
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
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

function IconFlag({ className = "w-4 h-4" }: { className?: string }) {
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
      <path d="M4 22V3" />
      <path d="M4 4h13l-2 4 2 4H4" />
    </svg>
  );
}

export function MoreSheet({
  open,
  onClose,
  link,
  reportTargetType,
  reportTargetId,
  owner,
}: {
  open: boolean;
  onClose: () => void;
  link: string;
  reportTargetType: "qa_question" | "qa_answer";
  reportTargetId: string;
  owner?: {
    kind: "qa_question" | "qa_answer";
    canEdit: boolean;
    canDelete: boolean;
    initialTitle?: string;
    initialBody?: string;
    onEdited?: (payload: { title?: string; body?: string }) => void;
    onDeleted?: () => void;
  };
}) {
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);
  const [mode, setMode] = useState<"menu" | "edit">("menu");
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState(owner?.initialTitle ?? "");
  const [editBody, setEditBody] = useState(owner?.initialBody ?? "");
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEscape);
    document.body.style.overflow = "hidden";
    setReported(false);
    setMode("menu");
    setEditTitle(owner?.initialTitle ?? "");
    setEditBody(owner?.initialBody ?? "");
    setEditError(null);
    return () => {
      document.removeEventListener("keydown", onEscape);
      document.body.style.overflow = "";
    };
  }, [open, onClose, owner?.initialBody, owner?.initialTitle]);

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

  async function saveEdit() {
    if (!owner?.canEdit || saving) return;
    setSaving(true);
    setEditError(null);
    try {
      const url =
        owner.kind === "qa_question"
          ? `/api/qa/questions/${reportTargetId}/owner`
          : `/api/qa/answers/${reportTargetId}/owner`;
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          owner.kind === "qa_question"
            ? { title: editTitle, body: editBody }
            : { body: editBody }
        ),
      });
      const payload = await res.json();
      if (!res.ok) {
        setEditError(payload?.error || "Could not save.");
      } else {
        owner.onEdited?.(payload);
        onClose();
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteItem() {
    if (!owner?.canDelete) return;
    const ok = confirm("Delete this? This can’t be undone.");
    if (!ok) return;
    const url =
      owner.kind === "qa_question"
        ? `/api/qa/questions/${reportTargetId}/owner`
        : `/api/qa/answers/${reportTargetId}/owner`;
    await fetch(url, { method: "DELETE", credentials: "include" }).catch(() => {});
    owner.onDeleted?.();
    onClose();
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
          {mode === "edit" ? (
            <div className="space-y-2">
              {owner?.kind === "qa_question" && (
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={160}
                  className="w-full rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] px-3 py-2 text-sm text-[var(--ig-text)]"
                  placeholder="Title"
                />
              )}
              <textarea
                value={editBody}
                onChange={(e) => setEditBody(e.target.value)}
                maxLength={4000}
                rows={4}
                className="w-full rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] px-3 py-2 text-sm text-[var(--ig-text)] resize-y"
                placeholder={owner?.kind === "qa_question" ? "Details" : "Reply"}
              />
              {editError && (
                <div className="text-xs text-red-600 dark:text-red-400">{editError}</div>
              )}
              <button
                type="button"
                className="w-full qa-action-btn text-sm border border-[var(--qa-card-border)]"
                onClick={saveEdit}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                className="w-full qa-action-btn text-sm border border-[var(--qa-card-border)]"
                onClick={() => setMode("menu")}
              >
                Back
              </button>
            </div>
          ) : (
            <>
              {owner?.canEdit && (
                <button
                  type="button"
                  className="w-full qa-action-btn text-sm border border-[var(--qa-card-border)]"
                  onClick={() => setMode("edit")}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <IconPencil className="w-4 h-4" />
                    <span>Edit</span>
                  </span>
                </button>
              )}
              {owner?.canDelete && (
                <button
                  type="button"
                  className="w-full qa-action-btn text-sm border border-[var(--qa-card-border)] text-red-600 dark:text-red-400"
                  onClick={deleteItem}
                >
                  <span className="inline-flex items-center justify-center gap-2">
                    <IconTrash className="w-4 h-4" />
                    <span>Delete</span>
                  </span>
                </button>
              )}
              <button type="button" className="w-full qa-action-btn text-sm border border-[var(--qa-card-border)]" onClick={copy}>
                <span className="inline-flex items-center justify-center gap-2">
                  <IconShare className="w-4 h-4" />
                  <span>Copy link</span>
                </span>
              </button>
              <button
                type="button"
                className="w-full qa-action-btn text-sm border border-[var(--qa-card-border)] text-red-600 dark:text-red-400"
                onClick={report}
                disabled={reporting || reported}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <IconFlag className="w-4 h-4" />
                  <span>{reported ? "Reported" : reporting ? "Reporting…" : "Report"}</span>
                </span>
              </button>
              <button type="button" className="w-full qa-action-btn text-sm border border-[var(--qa-card-border)]" onClick={onClose}>
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

