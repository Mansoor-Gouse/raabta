"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

export type DrawerComment = {
  _id: string;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  text: string;
  createdAt: string;
  likeCount?: number;
  likedByMe?: boolean;
  parentId?: string;
  replyCount?: number;
};

const QUICK_EMOJIS = ["❤️", "👏", "🔥", "😢", "😍", "😮", "😂"];

function timeAgo(date: string) {
  const d = new Date(date);
  const now = new Date();
  const s = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  if (s < 2592000) return `${Math.floor(s / 604800)}w`;
  return d.toLocaleDateString();
}

type CommentsDrawerProps = {
  open: boolean;
  onClose: () => void;
  postId: string;
  postAuthorName: string;
  currentUserId: string | null;
  currentUserImage?: string | null;
  currentUserName?: string;
  onCommentAdded?: () => void;
  onCommentDeleted?: (delta?: number) => void;
};

export function CommentsDrawer({
  open,
  onClose,
  postId,
  postAuthorName,
  currentUserId,
  currentUserImage,
  currentUserName,
  onCommentAdded,
  onCommentDeleted,
}: CommentsDrawerProps) {
  const [comments, setComments] = useState<DrawerComment[]>([]);
  const [repliesByParentId, setRepliesByParentId] = useState<Record<string, DrawerComment[]>>({});
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchComments = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`);
      if (!res.ok) return;
      const data = await res.json();
      const list = (data.comments || []) as DrawerComment[];
      setComments([...list].reverse());
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    if (open && postId) fetchComments();
  }, [open, postId, fetchComments]);

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

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || submitting || !currentUserId) return;
    setSubmitting(true);
    const parentId = replyingTo?.commentId;
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parentId ? { text, parentId } : { text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post");
      const created: DrawerComment = {
        _id: data._id,
        authorId: data.authorId,
        authorName: data.authorName ?? currentUserName ?? "You",
        authorImage: data.authorImage ?? currentUserImage,
        text: data.text,
        createdAt: data.createdAt,
        likeCount: 0,
        likedByMe: false,
        parentId: data.parentId,
      };
      if (parentId) {
        setRepliesByParentId((prev) => ({
          ...prev,
          [parentId]: [...(prev[parentId] ?? []), created],
        }));
        setComments((prev) =>
          prev.map((c) =>
            c._id === parentId ? { ...c, replyCount: (c.replyCount ?? 0) + 1 } : c
          )
        );
        setExpandedReplies((prev) => new Set(prev).add(parentId));
      } else {
        setComments((prev) => [...prev, created]);
      }
      setCommentText("");
      setReplyingTo(null);
      onCommentAdded?.();
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }), 100);
    } catch {
      // could show toast
    } finally {
      setSubmitting(false);
    }
  }

  function appendQuickEmoji(emoji: string) {
    setCommentText((prev) => prev + emoji);
  }

  async function deleteComment(commentId: string, parentId?: string) {
    if (deletingId) return;
    setDeletingId(commentId);
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { deleted?: number };
        setComments((prev) => {
          if (parentId) return prev.map((c) => (c._id === parentId ? { ...c, replyCount: Math.max(0, (c.replyCount ?? 0) - 1) } : c));
          return prev.filter((c) => c._id !== commentId);
        });
        setRepliesByParentId((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            next[key] = next[key].filter((r) => r._id !== commentId);
          }
          return next;
        });
        onCommentDeleted?.(data.deleted ?? 1);
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function loadReplies(parentId: string) {
    if (repliesByParentId[parentId]?.length) {
      setExpandedReplies((prev) => {
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
      return;
    }
    const res = await fetch(`/api/posts/${postId}/comments?parentId=${encodeURIComponent(parentId)}`);
    if (!res.ok) return;
    const data = await res.json();
    const list = (data.comments || []) as DrawerComment[];
    setRepliesByParentId((prev) => ({ ...prev, [parentId]: list }));
    setExpandedReplies((prev) => new Set(prev).add(parentId));
  }

  async function toggleCommentLike(c: DrawerComment) {
    if (!currentUserId) return;
    const liked = c.likedByMe ?? false;
    const method = liked ? "DELETE" : "POST";
    const res = await fetch(`/api/posts/${postId}/comments/${c._id}/like`, { method });
    if (!res.ok) return;
    setComments((prev) =>
      prev.map((x) =>
        x._id === c._id
          ? {
              ...x,
              likedByMe: !liked,
              likeCount: Math.max(0, (x.likeCount ?? 0) + (liked ? -1 : 1)),
            }
          : x
      )
    );
    setRepliesByParentId((prev) => {
      const next: typeof prev = {};
      for (const key of Object.keys(prev)) {
        next[key] = prev[key].map((r) =>
          r._id === c._id
            ? {
                ...r,
                likedByMe: !liked,
                likeCount: Math.max(0, (r.likeCount ?? 0) + (liked ? -1 : 1)),
              }
            : r
        );
      }
      return next;
    });
  }

  if (!open) return null;

  const placeholder = replyingTo
    ? `Reply to @${replyingTo.authorName.replace(/\s+/g, "").slice(0, 16)}...`
    : `Add a comment for ${postAuthorName.replace(/\s+/g, "").slice(0, 24)}...`;

  const avatarOuter = "w-8 h-8 rounded-lg p-[1px] border border-[var(--ig-border)] flex items-center justify-center shrink-0 overflow-hidden bg-[var(--ig-border-light)]";
  const avatarInner = "w-full h-full rounded-[5px] flex items-center justify-center overflow-hidden bg-[var(--ig-bg-primary)]";

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
        aria-label="Comments"
      >
        {/* Header: drag handle, then title left (feed/event font) */}
        <div className="shrink-0 border-b border-[var(--ig-border-light)]">
          <div className="flex justify-center pt-2.5 pb-1" aria-hidden>
            <div className="w-9 h-1 rounded-full bg-[var(--ig-border)] cursor-grab active:cursor-grabbing" />
          </div>
          <h2 className="feed-title-font text-lg font-semibold text-[var(--ig-text)] text-left px-4 pb-3">Comments</h2>
        </div>

        {/* Scrollable comments */}
        <div
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pb-2 bg-[var(--ig-bg)]"
        >
          {loading ? (
            <div className="py-8 text-center text-sm text-[var(--ig-text-secondary)]">Loading comments…</div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-sm text-[var(--ig-text-secondary)]">No comments yet.</div>
          ) : (
            <ul className="space-y-1 py-1">
              {comments.map((c) => (
                <li key={c._id} className="py-3 group">
                  <div className="flex gap-3">
                    <Link href={`/app/members/${c.authorId}`} className="shrink-0">
                      <div className={avatarOuter}>
                        <div className={avatarInner}>
                          {c.authorImage ? (
                            <img src={c.authorImage} alt="" className="w-full h-full rounded-[5px] object-cover" />
                          ) : (
                            <span className="text-xs font-medium text-[var(--ig-text-secondary)]">
                              {c.authorName?.charAt(0)?.toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-[var(--ig-text)] leading-tight">
                        <Link href={`/app/members/${c.authorId}`} className="font-semibold hover:opacity-80">
                          {c.authorName}
                        </Link>
                        <span className="text-[var(--ig-text-secondary)] font-normal ml-1">{timeAgo(c.createdAt)}</span>
                      </p>
                      <p className="text-sm text-[var(--ig-text)] break-words whitespace-pre-wrap mt-0.5">{c.text}</p>
                      <button
                        type="button"
                        onClick={() => { setReplyingTo({ commentId: c._id, authorName: c.authorName }); inputRef.current?.focus(); }}
                        className="text-xs text-[var(--ig-text-secondary)] hover:opacity-80 mt-1 font-semibold"
                      >
                        Reply
                      </button>
                    </div>
                    <div className="shrink-0 flex flex-col items-center justify-start">
                      <button
                        type="button"
                        onClick={() => toggleCommentLike(c)}
                        className={`p-1 ${c.likedByMe ? "text-[var(--ig-like)]" : "text-[var(--ig-text-secondary)] hover:text-[var(--ig-like)]"}`}
                        aria-label={c.likedByMe ? "Unlike comment" : "Like comment"}
                      >
                        {c.likedByMe ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                        )}
                      </button>
                      <span className="text-xs text-[var(--ig-text-secondary)] mt-0.5">{(c.likeCount ?? 0)}</span>
                    </div>
                    {currentUserId && c.authorId === currentUserId && (
                      <button
                        type="button"
                        onClick={() => deleteComment(c._id)}
                        disabled={deletingId === c._id}
                        className="shrink-0 p-1 text-[var(--ig-text-secondary)] hover:text-[var(--ig-error)] opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50 transition-opacity"
                        aria-label="Delete comment"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  {(c.replyCount ?? 0) > 0 && (
                    <div className="ml-11 mt-2 pt-2 border-t border-[var(--ig-border-light)]">
                      {!expandedReplies.has(c._id) ? (
                        <button
                          type="button"
                          onClick={() => loadReplies(c._id)}
                          className="text-xs text-[var(--ig-text-secondary)] hover:opacity-80 font-medium"
                        >
                          View {c.replyCount} more repl{c.replyCount === 1 ? "y" : "ies"}
                        </button>
                      ) : (
                        <>
                          <div className="pl-3 ml-0.5 border-l border-[var(--ig-border)]">
                            <ul className="space-y-3 py-1">
                              {(repliesByParentId[c._id] ?? []).map((r) => (
                                <li key={r._id} className="flex gap-2 group">
                                  <Link href={`/app/members/${r.authorId}`} className="shrink-0">
                                    <div className={avatarOuter}>
                                      <div className={avatarInner}>
                                        {r.authorImage ? (
                                          <img src={r.authorImage} alt="" className="w-full h-full rounded-[5px] object-cover" />
                                        ) : (
                                          <span className="text-xs font-medium text-[var(--ig-text-secondary)]">{r.authorName?.charAt(0) || "?"}</span>
                                        )}
                                      </div>
                                    </div>
                                  </Link>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm text-[var(--ig-text)] leading-tight">
                                      <Link href={`/app/members/${r.authorId}`} className="font-semibold hover:opacity-80">{r.authorName}</Link>
                                      <span className="text-[var(--ig-text-secondary)] font-normal ml-1">{timeAgo(r.createdAt)}</span>
                                    </p>
                                    <p className="text-sm text-[var(--ig-text)] break-words whitespace-pre-wrap mt-0.5">{r.text}</p>
                                  </div>
                                  <div className="shrink-0 flex flex-col items-center justify-start">
                                    <button
                                      type="button"
                                      onClick={() => toggleCommentLike(r)}
                                      className={`p-1 ${r.likedByMe ? "text-[var(--ig-like)]" : "text-[var(--ig-text-secondary)] hover:text-[var(--ig-like)]"}`}
                                      aria-label={r.likedByMe ? "Unlike" : "Like"}
                                    >
                                      {r.likedByMe ? (
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                                      ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                      )}
                                    </button>
                                    <span className="text-xs text-[var(--ig-text-secondary)] mt-0.5">{(r.likeCount ?? 0)}</span>
                                  </div>
                                  {currentUserId && r.authorId === currentUserId && (
                                    <button
                                      type="button"
                                      onClick={() => deleteComment(r._id, c._id)}
                                      disabled={deletingId === r._id}
                                      className="shrink-0 opacity-0 group-hover:opacity-100 p-1 text-[var(--ig-text-secondary)] hover:text-[var(--ig-error)]"
                                      aria-label="Delete"
                                    >
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedReplies((prev) => { const n = new Set(prev); n.delete(c._id); return n; })}
                            className="mt-2 text-xs text-[var(--ig-text-secondary)] hover:opacity-80 font-medium block w-full text-center"
                          >
                            Hide replies
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Sticky footer: emoji strip then [avatar, input, emoji icon] + Post when has text */}
        <div className="shrink-0 border-t border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)]">
          <div className="flex gap-1 px-3 py-2 overflow-x-auto no-scrollbar">
            {QUICK_EMOJIS.map((emoji, i) => (
              <button
                key={i}
                type="button"
                onClick={() => appendQuickEmoji(emoji)}
                className="shrink-0 w-8 h-8 flex items-center justify-center text-lg rounded-lg border border-transparent hover:bg-[var(--ig-border-light)] hover:border-[var(--ig-border)] focus:outline-none focus:ring-2 focus:ring-[var(--ig-link)] transition-colors"
                aria-label={`Add ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <form onSubmit={submitComment} className="flex items-center gap-2 px-4 pb-4 pt-0">
            <div className={avatarOuter}>
              <div className={avatarInner}>
                {currentUserImage ? (
                  <img src={currentUserImage} alt="" className="w-full h-full rounded-[5px] object-cover" />
                ) : (
                  <span className="text-xs font-medium text-[var(--ig-text-secondary)]">
                    {currentUserName?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={placeholder}
              className="flex-1 min-w-0 rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg)] px-3 py-2 text-sm text-[var(--ig-text)] placeholder:text-[var(--ig-text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--ig-link)] focus:border-transparent"
              autoComplete="off"
              aria-label="Add a comment"
            />
            <button
              type="button"
              className="shrink-0 p-2 text-[var(--ig-text-secondary)] hover:text-[var(--ig-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ig-link)] rounded-full"
              aria-label="Emoji"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {replyingTo && (
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-xs text-[var(--ig-text-secondary)] shrink-0"
              >
                Cancel
              </button>
            )}
            {commentText.trim() ? (
              <button
                type="submit"
                disabled={submitting}
                className="text-sm font-semibold text-[var(--ig-link)] hover:opacity-80 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--ig-link)]"
              >
                Post
              </button>
            ) : null}
          </form>
        </div>
      </div>
    </>
  );
}
