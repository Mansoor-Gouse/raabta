"use client";

import { useState } from "react";
import Link from "next/link";
import { IconCircleInner, IconTrusted, IconMessenger } from "@/components/layout/InstagramIcons";

export type CircleReasonOption =
  | "mentor"
  | "collaborator"
  | "trusted_advisor"
  | "intellectual_companion"
  | "friend";

const REASON_LABELS: Record<CircleReasonOption, string> = {
  mentor: "Mentor",
  collaborator: "Collaborator",
  trusted_advisor: "Trusted advisor",
  intellectual_companion: "Intellectual companion",
  friend: "Friend",
};

type Props = {
  relatedUserId: string;
  currentCircle: "INNER" | "TRUSTED" | null;
  innerCount: number;
  trustedCount: number;
  innerMax?: number;
  trustedMax?: number;
  onUpdated?: () => void;
  /** When true, only show a single "Add to Trusted" action (e.g. in suggestions list). */
  compact?: boolean;
  /** When true, render in one row with no margin (same row as name: message + circle actions). */
  inline?: boolean;
};

export function AddToCircleButton({
  relatedUserId,
  currentCircle,
  innerCount,
  trustedCount,
  innerMax = 12,
  trustedMax = 50,
  onUpdated,
  compact = false,
  inline = false,
}: Props) {
  const [showModal, setShowModal] = useState(false);
  const [targetCircle, setTargetCircle] = useState<"INNER" | "TRUSTED" | null>(null);
  const [reason, setReason] = useState<CircleReasonOption | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openAdd = (circle: "INNER" | "TRUSTED") => {
    setTargetCircle(circle);
    setReason("");
    setError(null);
    setShowModal(true);
  };

  const openChange = (circle: "INNER" | "TRUSTED") => {
    setTargetCircle(circle);
    setReason("");
    setError(null);
    setShowModal(true);
  };

  const submit = async () => {
    if (!targetCircle) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/circles/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relatedUserId,
          circleType: targetCircle,
          ...(reason ? { reason } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        if (data.code === "INNER_CIRCLE_FULL" || data.code === "TRUSTED_CIRCLE_FULL") {
          setError(data.error);
        }
        setLoading(false);
        return;
      }
      setShowModal(false);
      onUpdated?.();
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("circles-updated"));
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  };

  const remove = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/circles/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relatedUserId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      setShowModal(false);
      onUpdated?.();
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("circles-updated"));
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  };

  const canAddInner = innerCount < innerMax;
  const canAddTrusted = trustedCount < trustedMax;

  const wrapperClass = inline
    ? "flex items-center gap-1 shrink-0"
    : compact
      ? "flex items-center gap-1"
      : "mt-3 flex flex-wrap items-center gap-2";

  const msgBtnClass = inline
    ? "elite-events inline-flex items-center justify-center h-7 w-7 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors shrink-0"
    : "elite-events inline-flex items-center justify-center h-8 w-8 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors";

  const showMessage = !compact || inline;

  return (
    <>
      <div className={wrapperClass}>
        {showMessage && (
          <Link
            href={`/app/new?userId=${relatedUserId}`}
            className={msgBtnClass}
            aria-label="Message"
          >
            <IconMessenger className={inline ? "w-3.5 h-3.5" : "w-4 h-4"} />
          </Link>
        )}
        {currentCircle === "INNER" && !compact && !inline && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/90 to-pink-500/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm">
            <IconCircleInner className="w-3.5 h-3.5 shrink-0" />
            Inner Circle
          </span>
        )}
        {currentCircle === "TRUSTED" && !compact && !inline && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/90 px-3 py-1.5 text-[11px] font-medium text-slate-100 ring-1 ring-slate-500/70">
            <IconTrusted className="w-3.5 h-3.5 shrink-0" />
            Trusted Circle
          </span>
        )}
        {currentCircle && inline && (
          <button
            type="button"
            onClick={() => openChange(currentCircle)}
            className="elite-events inline-flex items-center justify-center h-7 w-7 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors shrink-0"
            aria-label={currentCircle === "INNER" ? "In Inner Circle" : "In Trusted Circle"}
            title="Change circle"
          >
            {currentCircle === "INNER" ? <IconCircleInner className="w-3.5 h-3.5" /> : <IconTrusted className="w-3.5 h-3.5" />}
          </button>
        )}
        {currentCircle && !compact && !inline && (
          <button
            type="button"
            onClick={() => openChange(currentCircle)}
            className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-white/10 transition-colors"
          >
            Change circle
          </button>
        )}
        {!currentCircle && (
          <>
            {canAddTrusted && (
              <button
                type="button"
                onClick={() => openAdd("TRUSTED")}
                className={
                  inline
                    ? "elite-events inline-flex items-center justify-center h-7 w-7 rounded-full bg-[var(--elite-surface)] border border-[var(--elite-border)] text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors shrink-0"
                    : compact
                      ? "elite-events inline-flex items-center gap-1.5 rounded-full bg-[var(--elite-surface)] border border-[var(--elite-border)] px-3 py-1 text-[11px] font-medium text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors"
                      : "elite-events inline-flex items-center gap-1.5 rounded-full bg-[var(--elite-surface)] border border-[var(--elite-border)] px-3 py-1.5 text-xs font-medium text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors"
                }
                aria-label="Add to Trusted Circle"
                title="Add to Trusted Circle"
              >
                <IconTrusted className="w-3.5 h-3.5 shrink-0" />
                {!inline && (compact ? "Add to Trusted" : "Add to Trusted Circle")}
              </button>
            )}
            {canAddInner && (!compact || inline) && (
              <button
                type="button"
                onClick={() => openAdd("INNER")}
                className={
                  inline
                    ? "elite-events inline-flex items-center justify-center h-7 w-7 rounded-full bg-[var(--elite-accent)] text-[var(--elite-on-accent)] hover:opacity-90 transition-opacity shrink-0"
                    : "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:shadow-md transition-transform hover:-translate-y-[0.5px]"
                }
                aria-label="Add to Inner Circle"
                title="Add to Inner Circle"
              >
                <IconCircleInner className="w-3.5 h-3.5 shrink-0" />
                {!inline && "Add to Inner Circle"}
              </button>
            )}
            {!canAddTrusted && !canAddInner && !compact && !inline && (
              <Link
                href="/app/profile/circles"
                className="text-xs text-slate-300 hover:text-amber-300 transition-colors"
              >
                Circles full — manage circles
              </Link>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="circle-modal-title"
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-gradient-to-b from-slate-900 via-slate-950 to-black p-5 shadow-2xl shadow-black/70 backdrop-blur-2xl">
            <h2
              id="circle-modal-title"
              className="text-sm font-semibold tracking-wide text-slate-50"
            >
              {currentCircle ? "Adjust circle" : "Add to Inner / Trusted Circle"}
            </h2>
            <p className="mt-1 text-xs text-slate-300/90">
              Choose the circle and the reason this person belongs there.
            </p>
            <div className="mt-4 space-y-2">
              {(Object.keys(REASON_LABELS) as CircleReasonOption[]).map((r) => (
                <label
                  key={r}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 hover:bg-white/10 transition-colors"
                >
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="h-3.5 w-3.5 rounded-full border border-slate-500 text-amber-400 focus:ring-amber-500"
                  />
                  <span className="text-xs text-slate-100">
                    {REASON_LABELS[r]}
                  </span>
                </label>
              ))}
            </div>
            {error && (
              <p className="mt-3 text-xs text-red-400">{error}</p>
            )}
            {error && (error.includes("full") || error.includes("Remove someone")) && (
              <Link
                href="/app/profile/circles"
                className="mt-1 block text-xs text-amber-300 hover:text-amber-100 transition-colors"
              >
                Manage circles
              </Link>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={loading}
                className="flex-1 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 px-3 py-2 text-xs font-semibold text-black shadow-sm hover:shadow-md disabled:opacity-50"
              >
                {loading ? "Saving…" : currentCircle ? "Update" : "Add"}
              </button>
              {currentCircle && (
                <button
                  type="button"
                  onClick={remove}
                  disabled={loading}
                  className="rounded-full border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                >
                  Remove
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="rounded-full border border-white/20 bg-black/40 px-3 py-2 text-xs font-medium text-slate-100 hover:bg-white/10 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
