"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconCircleInner, IconTrusted, IconMessenger } from "@/components/layout/InstagramIcons";

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
  /** When false, hide the message button (e.g. on member profile where message is redundant). */
  showMessage?: boolean;
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
  showMessage: showMessageProp = true,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [activeCircle, setActiveCircle] = useState<Props["currentCircle"]>(currentCircle);
  const [ack, setAck] = useState<null | { kind: "success" | "error"; message: string; circle?: "INNER" | "TRUSTED" }>(null);

  useEffect(() => {
    setActiveCircle(currentCircle);
  }, [currentCircle]);

  useEffect(() => {
    if (!ack) return;
    const t = window.setTimeout(() => setAck(null), 2400);
    return () => window.clearTimeout(t);
  }, [ack]);

  const addDirect = async (circle: "INNER" | "TRUSTED") => {
    setLoading(true);
    try {
      const res = await fetch("/api/circles/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relatedUserId, circleType: circle }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setAck({ kind: "error", message: data.error || "Could not update circle." });
        setLoading(false);
        return;
      }
      setActiveCircle(circle);
      setAck({
        kind: "success",
        circle,
        message: circle === "INNER" ? "Added to Inner Circle" : "Added to Trusted Circle",
      });
      onUpdated?.();
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("circles-updated"));
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const remove = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/circles/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relatedUserId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setAck({ kind: "error", message: data.error || "Could not update circle." });
        setLoading(false);
        return;
      }
      setActiveCircle(null);
      setAck({ kind: "success", message: "Removed from circle" });
      onUpdated?.();
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("circles-updated"));
    } catch {
      // ignore
    }
    setLoading(false);
  };

  const canAddInner = innerCount < innerMax;
  const canAddTrusted = trustedCount < trustedMax;

  const wrapperClass = inline
    ? "flex items-center gap-1 shrink-0"
    : compact
      ? "flex items-center gap-1"
      : showMessageProp === false
        ? "mt-3 flex flex-nowrap items-center gap-2"
        : "mt-3 flex flex-wrap items-center gap-2";

  const msgBtnClass = inline
    ? "elite-events inline-flex items-center justify-center h-7 w-7 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors shrink-0"
    : "elite-events inline-flex items-center justify-center h-8 w-8 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors";

  const showMessage = showMessageProp && (!compact || inline);

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
        {activeCircle === "INNER" && !compact && !inline && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500/90 to-pink-500/90 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm">
            <IconCircleInner className="w-3.5 h-3.5 shrink-0" />
            Inner Circle
          </span>
        )}
        {activeCircle === "TRUSTED" && !compact && !inline && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800/90 px-3 py-1.5 text-[11px] font-medium text-slate-100 ring-1 ring-slate-500/70">
            <IconTrusted className="w-3.5 h-3.5 shrink-0" />
            Trusted Circle
          </span>
        )}
        {activeCircle && inline && (
          <button
            type="button"
            onClick={remove}
            disabled={loading}
            className="elite-events inline-flex items-center justify-center h-7 w-7 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors shrink-0 disabled:opacity-50"
            aria-label={activeCircle === "INNER" ? "Remove from Inner Circle" : "Remove from Trusted Circle"}
            title="Remove from circle"
          >
            {activeCircle === "INNER" ? <IconCircleInner className="w-3.5 h-3.5" /> : <IconTrusted className="w-3.5 h-3.5" />}
          </button>
        )}
        {activeCircle && !compact && !inline && (
          <button
            type="button"
            onClick={remove}
            disabled={loading}
            className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Remove
          </button>
        )}
        {!activeCircle && (
          <>
            {canAddTrusted && (
              <button
                type="button"
                onClick={() => addDirect("TRUSTED")}
                disabled={loading}
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
                onClick={() => addDirect("INNER")}
                disabled={loading}
                className={
                  inline
                    ? "elite-events inline-flex items-center justify-center h-7 w-7 rounded-full bg-gradient-to-br from-white to-[var(--elite-border-light)] border border-[var(--elite-border)] text-[var(--elite-text)] shadow-sm hover:from-gray-50 hover:to-[var(--elite-border-light)] transition-all shrink-0 disabled:opacity-50"
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

      {ack && (
        <div
          className="fixed left-1/2 bottom-4 z-50 -translate-x-1/2"
          role="status"
          aria-live="polite"
        >
          <div className="elite-events flex items-center gap-3 rounded-[var(--elite-radius)] border border-[var(--elite-border)] bg-[var(--elite-surface)] px-4 py-3 shadow-[var(--elite-shadow)]">
            <span
              className={`inline-flex items-center justify-center rounded-full h-10 w-10 border ${
                ack.kind === "success" ? "bg-white border-[var(--elite-border-light)]" : "bg-[var(--elite-surface)] border-[var(--elite-error)]/40"
              }`}
            >
              {ack.kind === "success" ? (
                <svg className="w-5 h-5 text-[var(--elite-accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-[var(--elite-error)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <circle cx="12" cy="12" r="10" />
                </svg>
              )}
            </span>

            <div className="min-w-0">
              <p className="elite-heading text-sm font-semibold text-[var(--elite-text)] truncate">
                {ack.kind === "success" ? "Done" : "Couldn’t update"}
              </p>
              <p className="elite-body text-xs text-[var(--elite-text-muted)] truncate">{ack.message}</p>
            </div>

            {ack.circle && (
              <span className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)]">
                {ack.circle === "INNER" ? (
                  <IconCircleInner className="w-4 h-4 text-[var(--elite-text)]" />
                ) : (
                  <IconTrusted className="w-4 h-4 text-[var(--elite-text-secondary)]" />
                )}
              </span>
            )}

            <button
              type="button"
              onClick={() => setAck(null)}
              className="shrink-0 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] px-2 py-1 text-xs text-[var(--elite-text-secondary)] hover:text-[var(--elite-text)] transition-colors"
              aria-label="Close"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
