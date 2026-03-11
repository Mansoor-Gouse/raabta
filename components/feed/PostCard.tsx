"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { IconHeart, IconComment, IconShare, IconBookmark, IconMore, IconCircleInner, IconTrusted } from "@/components/layout/InstagramIcons";
import { ReportButton } from "@/components/report/ReportButton";

export type PostCardPost = {
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
  fromInnerCircle?: boolean;
  fromTrustedCircle?: boolean;
};

export function PostCard({
  post,
  currentUserId,
  onUpdate,
  onDeleted,
  onOpenComments,
  onShare,
}: {
  post: PostCardPost;
  currentUserId?: string | null;
  onUpdate: (upd: Partial<PostCardPost>) => void;
  onDeleted?: () => void;
  onOpenComments?: (postId: string, authorName: string) => void;
  onShare?: (post: PostCardPost) => void;
}) {
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.savedByMe);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);

  const isAuthor = currentUserId && post.authorId === currentUserId;

  const toggleLike = useCallback(async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => (newLiked ? c + 1 : c - 1));
    onUpdate({ likedByMe: newLiked, likeCount: likeCount + (newLiked ? 1 : -1) });
    try {
      if (newLiked) await fetch(`/api/posts/${post._id}/like`, { method: "POST" });
      else await fetch(`/api/posts/${post._id}/like`, { method: "DELETE" });
    } catch {
      setLiked((l) => !l);
      setLikeCount((c) => (newLiked ? c - 1 : c + 1));
    }
  }, [liked, likeCount, post._id, onUpdate]);

  const handleMediaDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      toggleLike();
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  }, [toggleLike]);

  function handleMediaClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const hasMultiple = post.mediaUrls.length > 1;
    if (!hasMultiple) {
      handleMediaDoubleTap();
      return;
    }
    if (x < rect.width * 0.4) setMediaIndex((i) => (i === 0 ? post.mediaUrls.length - 1 : i - 1));
    else if (x > rect.width * 0.6) setMediaIndex((i) => (i === post.mediaUrls.length - 1 ? 0 : i + 1));
    else handleMediaDoubleTap();
  }

  useEffect(() => {
    if (!moreOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreOpen]);

  async function handleDelete() {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      return;
    }
    try {
      const res = await fetch(`/api/posts/${post._id}`, { method: "DELETE" });
      if (res.ok) {
        onDeleted?.();
        setMoreOpen(false);
        setDeleteConfirm(false);
      }
    } catch {
      setDeleteConfirm(false);
    }
  }

  async function toggleSave() {
    const newSaved = !saved;
    setSaved(newSaved);
    onUpdate({ savedByMe: newSaved });
    try {
      if (newSaved) await fetch(`/api/posts/${post._id}/save`, { method: "POST" });
      else await fetch(`/api/posts/${post._id}/save`, { method: "DELETE" });
    } catch {
      setSaved(!newSaved);
    }
  }

  const timeAgo = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const s = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (s < 60) return "Just now";
    if (s < 3600) return `${Math.floor(s / 60)}m`;
    if (s < 86400) return `${Math.floor(s / 3600)}h`;
    if (s < 604800) return `${Math.floor(s / 86400)}d`;
    return d.toLocaleDateString();
  };

  const media = post.mediaUrls[mediaIndex];
  const hasMultiple = post.mediaUrls.length > 1;

  return (
    <article className="bg-[var(--ig-bg-primary)] border-b border-[var(--ig-border-light)]">
      {/* Header: avatar, post creator name, time, more */}
      <header className="flex items-center gap-3 px-4 py-2">
        <Link href={`/app/members/${post.authorId}`} className="shrink-0">
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-[var(--ig-border-light)]">
            {post.authorImage ? (
              <img src={post.authorImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-[var(--ig-text-secondary)]">
                {post.authorName?.charAt(0)?.toUpperCase() || "?"}
              </span>
            )}
          </div>
        </Link>
        <div className="min-w-0 flex-1 flex items-baseline gap-2 flex-wrap">
          <Link
            href={`/app/members/${post.authorId}`}
            className="font-semibold text-sm text-[var(--ig-text)] hover:opacity-80 truncate"
          >
            {post.authorName}
          </Link>
          {post.fromInnerCircle && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400" title="From your Inner Circle">
              <IconCircleInner className="w-3.5 h-3.5 shrink-0" />
              Inner Circle
            </span>
          )}
          {post.fromTrustedCircle && !post.fromInnerCircle && (
            <span className="inline-flex items-center gap-1 text-xs text-[var(--ig-text-secondary)]" title="From your Trusted Circle">
              <IconTrusted className="w-3.5 h-3.5 shrink-0" />
              Trusted Circle
            </span>
          )}
          <time className="text-xs text-[var(--ig-text-secondary)] shrink-0" dateTime={post.createdAt}>
            {timeAgo(post.createdAt)}
          </time>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => { setMoreOpen((o) => !o); setDeleteConfirm(false); }}
            className="p-1 text-[var(--ig-text)]"
            aria-label="More options"
            aria-expanded={moreOpen}
          >
            <IconMore className="w-5 h-5" />
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
                    onClick={handleDelete}
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
      </header>

      {/* Black gradient for liked heart (one def per post to avoid duplicate ids) */}
      <svg aria-hidden className="absolute w-0 h-0 overflow-hidden" focusable="false">
        <defs>
          <linearGradient id={`heart-gradient-${post._id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="50%" stopColor="#000000" />
            <stop offset="100%" stopColor="#2d2d2d" />
          </linearGradient>
        </defs>
      </svg>

      {/* Media: 1:1 with carousel; double-tap to like */}
      <div
        className="relative aspect-square w-full bg-black cursor-default"
        onClick={handleMediaClick}
        onDoubleClick={(e) => { e.preventDefault(); toggleLike(); }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleMediaDoubleTap(); } }}
        aria-label="Double-tap to like"
      >
        {media ? (
          <>
            {media.match(/\.(gif|webp|png|jpe?g|avif)$/i) ? (
              <img src={media} alt="" className="w-full h-full object-cover pointer-events-none" />
            ) : (
              <video src={media} controls className="w-full h-full object-cover pointer-events-auto" onClick={(e) => e.stopPropagation()} />
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
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-[var(--ig-text-secondary)]">No media</div>
        )}
      </div>

      {/* Action row: heart, comment, share, bookmark */}
      <div className="flex items-center gap-5 px-4 py-2.5">
        <button
          type="button"
          onClick={toggleLike}
          className={`p-1 -ml-1 ${liked ? "text-[var(--ig-text)]" : "text-[var(--ig-text)]"} hover:opacity-70 transition-opacity`}
          aria-label={liked ? "Unlike" : "Like"}
        >
          <IconHeart
            className="w-6 h-6"
            filled={liked}
            filledGradientId={liked ? `heart-gradient-${post._id}` : undefined}
          />
          {liked && <span className="sr-only">Liked</span>}
        </button>
        {onOpenComments ? (
          <button
            type="button"
            onClick={() => onOpenComments(post._id, post.authorName)}
            className="p-1 -ml-1 text-[var(--ig-text)] hover:opacity-70 transition-opacity"
            aria-label="Comments"
          >
            <IconComment className="w-6 h-6" />
          </button>
        ) : (
          <Link href={`/app/feed/${post._id}`} className="p-1 text-[var(--ig-text)] hover:opacity-70 transition-opacity" aria-label="Comments">
            <IconComment className="w-6 h-6" />
          </Link>
        )}
        <button
          type="button"
          onClick={() => onShare?.(post)}
          className="p-1 text-[var(--ig-text)] hover:opacity-70 transition-opacity"
          aria-label="Share"
        >
          <IconShare className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={toggleSave}
          className="ml-auto p-1 text-[var(--ig-text)] hover:opacity-70 transition-opacity"
          aria-label={saved ? "Unsave" : "Save"}
        >
          <IconBookmark className="w-6 h-6" filled={saved} />
        </button>
      </div>

      {/* Likes */}
      {likeCount > 0 && (
        <div className="px-4 pb-1">
          <span className="font-semibold text-sm text-[var(--ig-text)]">
            {likeCount} {likeCount === 1 ? "like" : "likes"}
          </span>
        </div>
      )}

      {/* Caption: username bold + caption */}
      {post.caption && (
        <div className="px-4 pb-2">
          <span className="text-sm text-[var(--ig-text)]">
            <Link href={`/app/members/${post.authorId}`} className="font-semibold mr-1.5 hover:opacity-80">
              {post.authorName}
            </Link>
            {post.caption}
          </span>
        </div>
      )}

      {/* View all comments */}
      {post.commentCount > 0 && (
        onOpenComments ? (
          <button
            type="button"
            onClick={() => onOpenComments(post._id, post.authorName)}
            className="block px-4 pb-3 text-sm text-[var(--ig-text-secondary)] hover:opacity-80 text-left w-full"
          >
            View all {post.commentCount} comments
          </button>
        ) : (
          <Link
            href={`/app/feed/${post._id}`}
            className="block px-4 pb-3 text-sm text-[var(--ig-text-secondary)] hover:opacity-80"
          >
            View all {post.commentCount} comments
          </Link>
        )
      )}
    </article>
  );
}
