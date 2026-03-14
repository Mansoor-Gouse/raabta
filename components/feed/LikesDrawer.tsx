"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export type LikesDrawerUser = {
  userId: string;
  userName: string;
  userImage?: string | null;
};

type LikesDrawerProps = {
  open: boolean;
  onClose: () => void;
  postId: string;
};

const avatarOuter = "w-10 h-10 rounded-lg p-[1px] border border-[var(--ig-border)] flex items-center justify-center shrink-0 overflow-hidden bg-[var(--ig-bg-primary)]";
const avatarInner = "w-full h-full rounded-[5px] flex items-center justify-center overflow-hidden bg-[var(--ig-bg-primary)]";

export function LikesDrawer({ open, onClose, postId }: LikesDrawerProps) {
  const [users, setUsers] = useState<LikesDrawerUser[]>([]);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !postId) return;
    setLoading(true);
    fetch(`/api/posts/${postId}/likes`)
      .then((res) => res.ok ? res.json() : { likes: [] })
      .then((data) => {
        setUsers(data.likes ?? []);
      })
      .finally(() => setLoading(false));
  }, [open, postId]);

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

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 flex flex-col max-h-[88vh] rounded-t-2xl bg-[var(--ig-bg-primary)] border-t border-[var(--ig-border-light)] shadow-[0_-4px_20px_rgba(0,0,0,0.12)]"
        role="dialog"
        aria-modal="true"
        aria-label="Likes"
      >
        {/* Header: drag handle, then title left (same as Comments) */}
        <div className="shrink-0 border-b border-[var(--ig-border-light)]">
          <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
            <div className="w-9 h-1 rounded-full bg-[var(--ig-border)] cursor-grab active:cursor-grabbing" />
          </div>
          <h2 className="feed-title-font text-lg font-semibold text-[var(--ig-text)] text-left px-4 pb-3">Likes</h2>
        </div>

        <div
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 bg-[var(--ig-bg)]"
        >
          {loading ? (
            <div className="py-8 text-center text-sm text-[var(--ig-text-secondary)]">Loading…</div>
          ) : users.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--ig-text-secondary)]">No likes yet.</div>
          ) : (
            <ul className="space-y-0">
              {users.map((u) => (
                <li key={u.userId}>
                  <Link
                    href={`/app/members/${u.userId}`}
                    onClick={onClose}
                    className="flex items-center gap-3 py-3 rounded-lg hover:bg-[var(--ig-border-light)]/50 active:bg-[var(--ig-border-light)] transition-colors"
                  >
                    <div className={avatarOuter}>
                      <div className={avatarInner}>
                        {u.userImage ? (
                          <img src={u.userImage} alt="" className="w-full h-full rounded-[5px] object-cover" />
                        ) : (
                          <span className="text-sm font-semibold text-[var(--ig-text-secondary)]">
                            {u.userName?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-[var(--ig-text)] truncate">{u.userName}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
