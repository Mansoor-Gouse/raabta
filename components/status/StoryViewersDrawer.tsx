"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

type ViewerRow = {
  statusId: string;
  viewerId: string;
  viewerName: string;
  viewerImage?: string;
  viewedAt: string;
};

type ReactionRow = {
  statusId: string;
  userId: string;
  userName: string;
  userImage?: string;
  reactionType: string;
  createdAt: string;
};

type StoryViewersDrawerProps = {
  open: boolean;
  onClose: () => void;
  /** When set, only viewers/reactions for this status are shown */
  statusId?: string | null;
  /** When set with statusId, shows a delete icon. Can return a Promise; drawer shows loader until it resolves. */
  onDeleteStatus?: (statusId: string) => void | Promise<void>;
};

const REACTION_EMOJI: Record<string, string> = {
  heart: "❤️",
  fire: "🔥",
  laugh: "😂",
  cry: "😢",
  wow: "😮",
  like: "👍",
};

export function StoryViewersDrawer({ open, onClose, statusId, onDeleteStatus }: StoryViewersDrawerProps) {
  const [viewers, setViewers] = useState<ViewerRow[]>([]);
  const [reactions, setReactions] = useState<ReactionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const fetchData = useCallback(() => {
    if (!open) return;
    setLoading(true);
    const url = statusId
      ? `/api/me/status-viewers?statusId=${encodeURIComponent(statusId)}`
      : "/api/me/status-viewers";
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setViewers(data.viewers || []);
        setReactions(data.reactions || []);
      })
      .catch(() => {
        setViewers([]);
        setReactions([]);
      })
      .finally(() => setLoading(false));
  }, [open, statusId]);

  useEffect(() => {
    if (open) fetchData();
  }, [open, fetchData]);

  const reactorIds = new Set(reactions.map((r) => r.userId));
  const viewersOnly = viewers.filter((v) => !reactorIds.has(v.viewerId));

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  }, [onClose]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (open) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  const content = (
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-[59] bg-black/60 backdrop-blur-[2px]"
        onClick={handleClose}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 z-[60] flex flex-col max-h-[85vh] rounded-t-2xl overflow-hidden story-viewers-drawer ${
          isClosing ? "animate-story-viewer-out" : "animate-story-viewer-in"
        }`}
        style={{
          paddingBottom: "var(--safe-area-inset-bottom)",
          background: "var(--story-add-gradient-bar, linear-gradient(180deg, #242424 0%, #151515 100%))",
          color: "var(--story-add-text, #fff)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Story viewers and reactions"
      >
        {/* Handle bar + close affordance + delete (top right) */}
        <div
          className="shrink-0 flex flex-col pt-2 pb-2"
          style={{ paddingTop: "calc(var(--safe-area-inset-top) + 6px)" }}
        >
          <div className="flex items-center justify-between px-4">
            <div className="w-10" aria-hidden />
            <div
              className="w-10 h-1 rounded-full bg-white/40 flex-shrink-0"
              style={{ minWidth: 40, height: 4 }}
              aria-hidden
            />
            <div className="w-10 flex justify-end">
              {statusId && onDeleteStatus ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (deleting) return;
                    setDeleting(true);
                    try {
                      await Promise.resolve(onDeleteStatus(statusId));
                      handleClose();
                    } catch {
                      setDeleting(false);
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting}
                  className="p-1.5 rounded-full text-red-400 hover:text-red-300 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-60 disabled:pointer-events-none"
                  aria-label="Delete this story"
                  title="Delete story"
                >
                  {deleting ? (
                    <span className="w-5 h-5 flex items-center justify-center" aria-hidden>
                      <svg className="w-5 h-5 animate-spin text-red-400" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </span>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="mt-2 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 mx-auto"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <div className="shrink-0 border-b border-white/10" aria-hidden />

        <div className="flex-1 min-h-0 relative">
          {deleting && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black/50 rounded-t-2xl"
              aria-live="polite"
              aria-busy="true"
              role="status"
            >
              <div className="w-10 h-10 rounded-full border-2 border-white/40 border-t-white animate-spin shrink-0" />
              <p className="text-sm font-medium text-white">Deleting story…</p>
            </div>
          )}
          <div className="flex-1 overflow-y-auto min-h-0 h-full">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-white/70">Loading…</p>
            </div>
          ) : reactions.length === 0 && viewersOnly.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <p className="text-sm text-white/70 text-center">
                No one has viewed or reacted to your story yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-white/10 px-4 py-3 pb-6">
              {reactions.map((r, i) => (
                <li
                  key={`reaction-${r.statusId}-${r.userId}-${r.createdAt}-${i}`}
                  className="flex items-center gap-4 py-3"
                >
                  <div className="relative shrink-0 w-12 h-12">
                    {r.userImage ? (
                      <img
                        src={r.userImage}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover ring-2 ring-white/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-white font-semibold text-base ring-2 ring-white/20">
                        {r.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span
                      className="absolute -right-0.5 -bottom-0.5 w-6 h-6 rounded-md bg-black/80 flex items-center justify-center text-sm ring-2 ring-[#242424]"
                      aria-hidden
                    >
                      {REACTION_EMOJI[r.reactionType] ?? "👍"}
                    </span>
                  </div>
                  <p className="text-[15px] font-medium text-white truncate flex-1 min-w-0 story-viewers-drawer-name">
                    {r.userName}
                  </p>
                </li>
              ))}
              {viewersOnly.map((v, i) => (
                <li key={`viewer-${v.statusId}-${v.viewerId}-${i}`} className="flex items-center gap-4 py-3">
                  <div className="shrink-0 w-12 h-12">
                    {v.viewerImage ? (
                      <img
                        src={v.viewerImage}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover ring-2 ring-white/20"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/20 flex items-center justify-center text-white font-semibold text-base ring-2 ring-white/20">
                        {v.viewerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className="text-[15px] font-medium text-white truncate flex-1 min-w-0 story-viewers-drawer-name">
                    {v.viewerName}
                  </p>
                </li>
              ))}
            </ul>
          )}
          </div>
        </div>
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
