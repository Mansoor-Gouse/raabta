"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ReportButton } from "@/components/report/ReportButton";
import { ShareSheet } from "@/components/feed/ShareSheet";
import { IconHeart, IconThumbsUp, IconClap, IconShare, IconBookmark, IconComment } from "@/components/layout/InstagramIcons";

type Post = {
  _id: string;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  mediaUrls: string[];
  caption?: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  savedByMe: boolean;
};

type Comment = {
  _id: string;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  text: string;
  createdAt: string;
  likeCount?: number;
  likedByMe?: boolean;
  replyCount?: number;
};

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
function timeLabelAgo(date: string) {
  const t = timeAgo(date);
  return t === "Just now" ? t : /^\d+[mhdw]$/.test(t) ? `${t} ago` : t;
}

export function PostDetailClient({
  post,
  initialComments,
  currentUserId,
}: {
  post: Post;
  initialComments: Comment[];
  currentUserId: string;
}) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [repliesByParentId, setRepliesByParentId] = useState<Record<string, Comment[]>>({});
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ commentId: string; authorName: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const router = useRouter();
  const isAuthor = post.authorId === currentUserId;

  function handleMediaDoubleTap() {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      toggleLike();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  }

  function handleMediaClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!hasMultiple) {
      handleMediaDoubleTap();
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.4) setMediaIndex((i) => (i === 0 ? post.mediaUrls.length - 1 : i - 1));
    else if (x > rect.width * 0.6) setMediaIndex((i) => (i === post.mediaUrls.length - 1 ? 0 : i + 1));
    else handleMediaDoubleTap();
  }

  useEffect(() => {
    if (!moreOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
        setDeleteConfirm(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreOpen]);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.savedByMe);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const media = post.mediaUrls[mediaIndex];
  const hasMultiple = post.mediaUrls.length > 1;

  const prevMediaKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${mediaIndex}:${media ?? ""}`;
    if (prevMediaKeyRef.current !== null && prevMediaKeyRef.current !== key) setMediaLoaded(false);
    prevMediaKeyRef.current = key;
  }, [mediaIndex, media]);

  const setImgRef = useCallback((el: HTMLImageElement | null) => {
    (imgRef as React.MutableRefObject<HTMLImageElement | null>).current = el;
    if (el?.complete && el.naturalWidth > 0) setMediaLoaded(true);
  }, []);

  async function submitComment(e: React.FormEvent) {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    const parentId = replyingTo?.commentId;
    try {
      const res = await fetch(`/api/posts/${post._id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parentId ? { text, parentId } : { text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to post comment");
      const newComment: Comment = { ...data, likeCount: 0, likedByMe: false };
      if (parentId) {
        setRepliesByParentId((prev) => ({
          ...prev,
          [parentId]: [...(prev[parentId] ?? []), newComment],
        }));
        setComments((prev) =>
          prev.map((c) =>
            c._id === parentId ? { ...c, replyCount: (c.replyCount ?? 0) + 1 } : c
          )
        );
        setExpandedReplies((prev) => new Set(prev).add(parentId));
      } else {
        setComments((prev) => [...prev, newComment]);
      }
      setCommentCount((c) => c + 1);
      setCommentText("");
      setReplyingTo(null);
    } catch {
      // show error in UI if needed
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLike() {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => (newLiked ? c + 1 : c - 1));
    try {
      if (newLiked) await fetch(`/api/posts/${post._id}/like`, { method: "POST" });
      else await fetch(`/api/posts/${post._id}/like`, { method: "DELETE" });
    } catch {
      setLiked(!newLiked);
      setLikeCount((c) => (newLiked ? c - 1 : c + 1));
    }
  }

  async function toggleSave() {
    const newSaved = !saved;
    setSaved(newSaved);
    try {
      if (newSaved) await fetch(`/api/posts/${post._id}/save`, { method: "POST" });
      else await fetch(`/api/posts/${post._id}/save`, { method: "DELETE" });
    } catch {
      setSaved(!newSaved);
    }
  }

  async function deletePost() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    try {
      const res = await fetch(`/api/posts/${post._id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/app/feed");
        router.refresh();
      }
    } catch {
      setDeleteConfirm(false);
    }
  }

  async function deleteComment(commentId: string, parentId?: string) {
    if (deletingId) return;
    setDeletingId(commentId);
    try {
      const res = await fetch(`/api/posts/${post._id}/comments/${commentId}`, { method: "DELETE" });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { deleted?: number };
        const delta = data.deleted ?? 1;
        if (parentId) {
          setComments((prev) => prev.map((c) => (c._id === parentId ? { ...c, replyCount: Math.max(0, (c.replyCount ?? 0) - 1) } : c)));
          setRepliesByParentId((prev) => ({ ...prev, [parentId]: (prev[parentId] ?? []).filter((r) => r._id !== commentId) }));
        } else {
          setComments((prev) => prev.filter((c) => c._id !== commentId));
        }
        setCommentCount((c) => Math.max(0, c - delta));
      }
    } finally {
      setDeletingId(null);
    }
  }

  async function loadReplies(parentId: string) {
    if (repliesByParentId[parentId]?.length) {
      setExpandedReplies((prev) => { const next = new Set(prev); next.delete(parentId); return next; });
      return;
    }
    const res = await fetch(`/api/posts/${post._id}/comments?parentId=${encodeURIComponent(parentId)}`);
    if (!res.ok) return;
    const data = await res.json();
    const list = (data.comments || []) as Comment[];
    setRepliesByParentId((prev) => ({ ...prev, [parentId]: list }));
    setExpandedReplies((prev) => new Set(prev).add(parentId));
  }

  async function toggleCommentLike(c: Comment) {
    const liked = c.likedByMe ?? false;
    const method = liked ? "DELETE" : "POST";
    const res = await fetch(`/api/posts/${post._id}/comments/${c._id}/like`, { method });
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

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--ig-bg-primary)]">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between gap-2 p-4 border-b border-[var(--ig-border-light)]">
          <div className="flex items-center gap-2">
            <Link
              href="/app/feed"
              className="p-2 -ml-2 rounded-full text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
              aria-label="Back to feed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-lg font-semibold text-[var(--ig-text)]">Post</span>
          </div>
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => { setMoreOpen((o) => !o); setDeleteConfirm(false); }}
              className="p-2 text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] rounded-full"
              aria-label="More options"
              aria-expanded={moreOpen}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 py-1 min-w-[180px] rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] shadow-lg z-10">
                {isAuthor ? (
                  <>
                    <Link
                      href={`/app/feed/${post._id}/edit`}
                      className="block px-4 py-2 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
                      onClick={() => setMoreOpen(false)}
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={deletePost}
                      className="block w-full text-left px-4 py-2 text-sm text-[var(--ig-error)] hover:bg-[var(--ig-border-light)]"
                    >
                      {deleteConfirm ? "Confirm delete?" : "Delete"}
                    </button>
                    {deleteConfirm && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(false)}
                        className="block w-full text-left px-4 py-2 text-sm text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]"
                      >
                        Cancel
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <div className="px-2 py-1" onClick={(e) => e.stopPropagation()}>
                      <ReportButton targetType="post" targetId={post._id} />
                    </div>
                    <button
                      type="button"
                      onClick={() => setMoreOpen(false)}
                      className="block w-full text-left px-4 py-2 text-sm text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Likes row (when likeCount > 0) */}
        {likeCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--ig-border-light)]">
            <div className="w-6 h-6 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center shrink-0">
              <span className="text-xs">♥</span>
            </div>
            <span className="text-sm text-[var(--ig-text)] flex-1">
              <span className="font-semibold">{likeCount}</span> {likeCount === 1 ? "likes" : "others like"} this
            </span>
          </div>
        )}

        {/* Author block */}
        <header className="flex items-center gap-3 px-4 py-3">
          <Link href={`/app/members/${post.authorId}`} className="shrink-0">
            <div className="w-12 h-12 rounded-lg p-[1px] border border-[var(--ig-border)] flex items-center justify-center shrink-0 bg-[var(--ig-bg-primary)]">
              <div className="w-full h-full rounded-[5px] flex items-center justify-center overflow-hidden bg-[var(--ig-bg-primary)]">
                {post.authorImage ? (
                  <img src={post.authorImage} alt="" className="w-full h-full rounded-[5px] object-cover" />
                ) : (
                  <span className="text-base font-semibold text-[var(--ig-text-secondary)]">
                    {post.authorName?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
            </div>
          </Link>
          <div className="min-w-0 flex-1">
            <Link href={`/app/members/${post.authorId}`} className="font-semibold text-[var(--ig-text)] text-sm hover:opacity-80 block truncate">
              {post.authorName}
            </Link>
            <div className="flex items-center text-xs text-[var(--ig-text-secondary)] mt-0.5">
              <time dateTime={post.createdAt}>{timeLabelAgo(post.createdAt)}</time>
            </div>
          </div>
        </header>

        {/* Caption */}
        {post.caption && (
          <div className="px-4 pb-2">
            <p className="text-sm text-[var(--ig-text)] leading-snug">
              <Link href={`/app/members/${post.authorId}`} className="font-semibold mr-1.5 hover:underline">{post.authorName}</Link>
              {post.caption}
            </p>
          </div>
        )}

        {/* Gradient for liked heart */}
        <svg aria-hidden className="absolute w-0 h-0 overflow-hidden" focusable="false">
          <defs>
            <linearGradient id={`heart-gradient-detail-${post._id}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="50%" stopColor="#000000" />
              <stop offset="100%" stopColor="#2d2d2d" />
            </linearGradient>
          </defs>
        </svg>

        {/* Rectangular media (omit when text-only post) */}
        {post.mediaUrls.length > 0 && (
          <div
            className="relative aspect-[16/10] w-full bg-black cursor-default"
            onClick={handleMediaClick}
            onDoubleClick={(e) => { e.preventDefault(); toggleLike(); }}
            role="button"
            tabIndex={0}
            aria-label="Double-tap to like"
          >
            {media && (
              <>
                {/* Skeleton while media loads */}
                <div
                  className={`absolute inset-0 bg-[var(--ig-border-light)] animate-pulse transition-opacity duration-200 ${
                    mediaLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
                  }`}
                  aria-hidden
                />
                {media.match(/\.(gif|webp|png|jpe?g|avif)$/i) ? (
                  <img
                    ref={setImgRef}
                    src={media}
                    alt=""
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-200 ${
                      mediaLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    onLoad={() => setMediaLoaded(true)}
                    onError={() => setMediaLoaded(true)}
                  />
                ) : (
                  <video
                    src={media}
                    controls
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-auto transition-opacity duration-200 ${
                      mediaLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    onClick={(ev) => ev.stopPropagation()}
                    onLoadedData={() => setMediaLoaded(true)}
                    onError={() => setMediaLoaded(true)}
                  />
                )}
                {hasMultiple && (
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none" aria-hidden>
                    {post.mediaUrls.map((_, i) => (
                      <span
                        key={i}
                        className={`block rounded-full transition-all ${
                          i === mediaIndex ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Footer: reaction bar — icon-only, compact (no background highlight, only icon changes) */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--ig-border-light)] text-sm">
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={liked}
            className="p-1.5 rounded-full text-[var(--ig-text)] transition-transform hover:scale-105"
          >
            <IconHeart
              className="w-5 h-5"
              filled={liked}
              filledGradientId={liked ? `heart-gradient-detail-${post._id}` : undefined}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              const commentsEl = document.getElementById("comments");
              commentsEl?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="p-1.5 rounded-full text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] transition-colors"
            aria-label="Comments"
          >
            <IconComment className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => setShareSheetOpen(true)}
            className="p-1.5 rounded-full text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] transition-colors"
            aria-label="Share"
          >
            <IconShare className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={toggleSave}
            className="ml-auto p-1.5 rounded-full text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] transition-colors"
            aria-label={saved ? "Unsave" : "Save"}
          >
            <IconBookmark className="w-5 h-5" filled={saved} />
          </button>
        </div>

        <div id="comments" className="px-4 py-2 border-t border-[var(--ig-border-light)]">
          <ul className="space-y-2 mb-3">
            {comments.map((c) => (
              <React.Fragment key={c._id}>
              <li className="flex gap-2 group">
                <Link href={`/app/members/${c.authorId}`} className="shrink-0">
                  <div className="w-8 h-8 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center overflow-hidden">
                    {c.authorImage ? (
                      <img src={c.authorImage} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-medium text-[var(--ig-text-secondary)]">{c.authorName?.charAt(0) || "?"}</span>
                    )}
                  </div>
                </Link>
                <div className="min-w-0 flex-1">
                  <span className="text-sm text-[var(--ig-text)]">
                    <Link href={`/app/members/${c.authorId}`} className="font-semibold hover:underline mr-1">
                      {c.authorName}
                    </Link>
                    {c.text}
                  </span>
                  <p className="text-xs text-[var(--ig-text-secondary)] mt-0.5">
                    {timeAgo(c.createdAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setReplyingTo({ commentId: c._id, authorName: c.authorName })}
                    className="text-xs text-[var(--ig-text-secondary)] hover:opacity-80 font-semibold"
                  >
                    Reply
                  </button>
                </div>
                <div className="shrink-0 flex flex-col items-center">
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
                  <span className="text-xs text-[var(--ig-text-secondary)]">{(c.likeCount ?? 0)}</span>
                </div>
                {c.authorId === currentUserId && (
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => deleteComment(c._id, undefined)}
                      disabled={deletingId === c._id}
                      className="p-1 text-[var(--ig-text-secondary)] hover:text-[var(--ig-error)] disabled:opacity-50"
                      aria-label="Delete comment"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                      </svg>
                    </button>
                  </div>
                )}
              </li>
              {(c.replyCount ?? 0) > 0 && (
                <li className="mt-2 pt-2 border-t border-[var(--ig-border-light)]">
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
                        {(repliesByParentId[c._id] ?? []).map((r) => (
                          <div key={r._id} className="flex gap-2 py-2 group">
                            <Link href={`/app/members/${r.authorId}`} className="shrink-0">
                              <div className="w-8 h-8 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center overflow-hidden">
                                {r.authorImage ? <img src={r.authorImage} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-medium text-[var(--ig-text-secondary)]">{r.authorName?.charAt(0) || "?"}</span>}
                              </div>
                            </Link>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-[var(--ig-text)] leading-tight">
                                <Link href={`/app/members/${r.authorId}`} className="font-semibold hover:underline">{r.authorName}</Link>
                                <span className="text-[var(--ig-text-secondary)] font-normal ml-1">{timeAgo(r.createdAt)}</span>
                              </p>
                              <p className="text-sm text-[var(--ig-text)] break-words whitespace-pre-wrap mt-0.5">{r.text}</p>
                            </div>
                            <div className="shrink-0 flex flex-col items-center">
                              <button type="button" onClick={() => toggleCommentLike(r)} className={`p-1 ${r.likedByMe ? "text-[var(--ig-like)]" : "text-[var(--ig-text-secondary)] hover:text-[var(--ig-like)]"}`} aria-label={r.likedByMe ? "Unlike" : "Like"}>
                                {r.likedByMe ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>}
                              </button>
                              <span className="text-xs text-[var(--ig-text-secondary)]">{(r.likeCount ?? 0)}</span>
                            </div>
                            {r.authorId === currentUserId && (
                              <button type="button" onClick={() => deleteComment(r._id, c._id)} disabled={deletingId === r._id} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--ig-text-secondary)] hover:text-[var(--ig-error)]" aria-label="Delete">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" /></svg>
                              </button>
                            )}
                          </div>
                        ))}
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
                </li>
              )}
              </React.Fragment>
            ))}
          </ul>

          <form onSubmit={submitComment} className="flex gap-2 items-center">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder={replyingTo ? `Reply to @${replyingTo.authorName}` : "Add a comment..."}
              className="flex-1 rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] px-3 py-2 text-sm text-[var(--ig-text)] placeholder:text-[var(--ig-text-tertiary)] focus:outline-none focus:ring-1 focus:ring-[var(--ig-link)]"
            />
            {replyingTo && (
              <button type="button" onClick={() => setReplyingTo(null)} className="text-xs text-[var(--ig-text-secondary)] shrink-0">
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!commentText.trim() || submitting}
              className="text-sm font-semibold text-[var(--ig-link)] disabled:opacity-40 hover:opacity-80"
            >
              Post
            </button>
          </form>
        </div>

        <ShareSheet
          open={shareSheetOpen}
          onClose={() => setShareSheetOpen(false)}
          post={shareSheetOpen ? post : null}
        />
      </div>
    </div>
  );
}
