"use client";

import { useState } from "react";
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

  const addDirect = async (circle: "INNER" | "TRUSTED") => {
    setLoading(true);
    try {
      const res = await fetch("/api/circles/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ relatedUserId, circleType: circle }),
      });
      if (!res.ok) {
        setLoading(false);
        return;
      }
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
        setLoading(false);
        return;
      }
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
            onClick={remove}
            disabled={loading}
            className="elite-events inline-flex items-center justify-center h-7 w-7 rounded-full border border-[var(--elite-border)] bg-[var(--elite-surface)] text-[var(--elite-text)] hover:border-[var(--elite-accent-muted)] transition-colors shrink-0 disabled:opacity-50"
            aria-label={currentCircle === "INNER" ? "Remove from Inner Circle" : "Remove from Trusted Circle"}
            title="Remove from circle"
          >
            {currentCircle === "INNER" ? <IconCircleInner className="w-3.5 h-3.5" /> : <IconTrusted className="w-3.5 h-3.5" />}
          </button>
        )}
        {currentCircle && !compact && !inline && (
          <button
            type="button"
            onClick={remove}
            disabled={loading}
            className="rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[11px] font-medium text-slate-100 hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Remove
          </button>
        )}
        {!currentCircle && (
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
    </>
  );
}
