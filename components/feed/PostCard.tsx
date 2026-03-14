"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  IconHeart,
  IconComment,
  IconShare,
  IconBookmark,
  IconMore,
  IconCircleInner,
  IconTrusted,
  IconThumbsUp,
  IconClap,
} from "@/components/layout/InstagramIcons";
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
  likedSampleName?: string;
};

const CAPTION_LINE_HEIGHT = 1.35;

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
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);

  const isAuthor = currentUserId && post.authorId === currentUserId;

  const isVideoUrl = (url: string) => !url.match(/\.(gif|webp|png|jpe?g|avif)$/i);

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
  const currentIsVideo = media ? isVideoUrl(media) : false;

  useEffect(() => {
    if (!currentIsVideo) setVideoPlaying(false);
    else videoRef.current?.pause();
  }, [mediaIndex, currentIsVideo]);

  const prevMediaKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${mediaIndex}:${media ?? ""}`;
    if (prevMediaKeyRef.current !== null && prevMediaKeyRef.current !== key) setMediaLoaded(false);
    prevMediaKeyRef.current = key;
  }, [mediaIndex, media]);

  const setImgRef = useCallback((el: HTMLImageElement | null) => {
    imgRef.current = el;
    if (el?.complete && el.naturalWidth > 0) setMediaLoaded(true);
  }, []);

  const toggleVideoPlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setVideoPlaying(true);
    } else {
      video.pause();
      setVideoPlaying(false);
    }
  }, []);

  const totalReactions = likeCount;
  const repostCount: number = 0; // placeholder until backend supports it

  const caption = post.caption ?? "";
  const captionNeedsExpand = caption.length > 120;
  const showCaptionPreview = captionNeedsExpand && !captionExpanded;
  const likedSampleName = post.likedSampleName;

  return (
    <article className="bg-[var(--ig-bg-primary)] border-b border-[var(--ig-border-light)]">
      {/* 1. Top row — Likes (only when inner/trusted liker sample is available) */}
      {likedSampleName && likeCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-[var(--ig-border-light)]">
          <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center bg-[var(--ig-border-light)] shrink-0">
            <span className="text-[10px] font-semibold text-[var(--ig-text-secondary)]">
              ♥
            </span>
          </div>
          <span className="text-xs text-[var(--ig-text)] flex-1 min-w-0">
            <span className="font-semibold">{likedSampleName}</span>
            {likeCount > 1 ? ` and ${likeCount - 1} others like this` : " likes this"}
          </span>
          <div className="relative flex items-center gap-1 shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => { setMoreOpen((o) => !o); setDeleteConfirm(false); }}
              className="p-1.5 text-[var(--ig-text-secondary)] hover:text-[var(--ig-text)]"
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
        </div>
      )}

      {/* 2. Author block */}
      <header className="flex items-center gap-3 px-4 py-2.5">
        <Link href={`/app/members/${post.authorId}`} className="shrink-0">
          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-[var(--ig-border-light)]">
            {post.authorImage ? (
              <img src={post.authorImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-base font-semibold text-[var(--ig-text-secondary)]">
                {post.authorName?.charAt(0)?.toUpperCase() || "?"}
              </span>
            )}
          </div>
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/app/members/${post.authorId}`}
              className="font-semibold text-sm text-[var(--ig-text)] hover:opacity-80 truncate"
            >
              {post.authorName}
            </Link>
            {post.fromInnerCircle && (
              <span className="inline-flex items-center text-amber-600 dark:text-amber-400" title="From your Inner Circle">
                <IconCircleInner className="w-3.5 h-3.5 shrink-0" />
              </span>
            )}
            {post.fromTrustedCircle && !post.fromInnerCircle && (
              <span className="inline-flex items-center text-[var(--ig-text-secondary)]" title="From your Trusted Circle">
                <IconTrusted className="w-3.5 h-3.5 shrink-0" />
              </span>
            )}
          </div>
          <div className="flex items-center text-xs text-[var(--ig-text-secondary)] mt-0.5">
            <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
          </div>
        </div>
        {likeCount === 0 && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => { setMoreOpen((o) => !o); setDeleteConfirm(false); }}
              className="p-1.5 text-[var(--ig-text)]"
              aria-label="More options"
              aria-expanded={moreOpen}
            >
              <IconMore className="w-5 h-5" />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 py-1 min-w-[180px] rounded-lg border border-[var(--ig-border)] bg-[var(--ig-bg-primary)] shadow-lg z-10">
                {isAuthor ? (
                  <>
                    <Link href={`/app/feed/${post._id}/edit`} className="block px-4 py-2 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]" onClick={() => setMoreOpen(false)}>Edit</Link>
                    <button type="button" onClick={handleDelete} className="block w-full text-left px-4 py-2 text-sm text-[var(--ig-error)] hover:bg-[var(--ig-border-light)]">{deleteConfirm ? "Confirm delete?" : "Delete"}</button>
                    {deleteConfirm && <button type="button" onClick={() => setDeleteConfirm(false)} className="block w-full text-left px-4 py-2 text-sm text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]">Cancel</button>}
                  </>
                ) : (
                  <>
                    <div className="px-2 py-1" onClick={(e) => e.stopPropagation()}><ReportButton targetType="post" targetId={post._id} /></div>
                    <button type="button" onClick={() => setMoreOpen(false)} className="block w-full text-left px-4 py-2 text-sm text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]">Cancel</button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </header>

      {/* 3. Caption / body text */}
      {caption && (
        <div className="px-4 pb-2">
          <p className="text-sm text-[var(--ig-text)]" style={{ lineHeight: CAPTION_LINE_HEIGHT }}>
            {showCaptionPreview ? (
              <>
                {caption.slice(0, 120).trim()}
                {caption.length > 120 && "… "}
                <button
                  type="button"
                  onClick={() => setCaptionExpanded(true)}
                  className="text-[var(--ig-link)] font-medium hover:underline"
                >
                  ... more
                </button>
              </>
            ) : (
              caption
            )}
          </p>
        </div>
      )}

      {/* Black gradient for liked heart */}
      <svg aria-hidden className="absolute w-0 h-0 overflow-hidden" focusable="false">
        <defs>
          <linearGradient id={`heart-gradient-${post._id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="50%" stopColor="#000000" />
            <stop offset="100%" stopColor="#2d2d2d" />
          </linearGradient>
        </defs>
      </svg>

      {/* 4. Main image — rectangular (omit when text-only post) */}
      {post.mediaUrls.length > 0 && (
        <div
          className="relative aspect-[16/10] w-full bg-black cursor-default"
          onClick={handleMediaClick}
          onDoubleClick={(e) => { e.preventDefault(); toggleLike(); }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleMediaDoubleTap(); } }}
          aria-label="Double-tap to like"
        >
          {media ? (
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
                <>
                  <video
                    ref={(el) => {
                      videoRef.current = el;
                      if (el?.readyState >= 2) setMediaLoaded(true);
                    }}
                    src={media}
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-200 ${
                      mediaLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    playsInline
                    loop
                    muted={false}
                    onClick={toggleVideoPlay}
                    onPlay={() => setVideoPlaying(true)}
                    onPause={() => setVideoPlaying(false)}
                    onEnded={() => setVideoPlaying(false)}
                    onLoadedData={() => setMediaLoaded(true)}
                    onError={() => setMediaLoaded(true)}
                  />
                  <div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    aria-hidden
                  >
                    {!videoPlaying && (
                      <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center">
                        <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {/* Center tap zone for play/pause; left/right zones still trigger slide change when hasMultiple */}
                  <div
                    className="absolute inset-y-0 left-1/4 right-1/4 cursor-pointer pointer-events-auto"
                    onClick={(e) => { e.stopPropagation(); toggleVideoPlay(e); }}
                    onDoubleClick={(e) => e.stopPropagation()}
                    aria-label={videoPlaying ? "Pause" : "Play"}
                  />
                </>
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
      )}

      {/* 5. Reaction bar — icon-only, compact (no background highlight, only icon changes) */}
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
            filledGradientId={liked ? `heart-gradient-${post._id}` : undefined}
          />
        </button>
        {onOpenComments ? (
          <button
            type="button"
            onClick={() => onOpenComments(post._id, post.authorName)}
            className="p-1.5 rounded-full text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] transition-colors"
            aria-label="Comments"
          >
            <IconComment className="w-5 h-5" />
          </button>
        ) : (
          <Link
            href={`/app/feed/${post._id}`}
            className="p-1.5 rounded-full text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] transition-colors"
            aria-label="Comments"
          >
            <IconComment className="w-5 h-5" />
          </Link>
        )}
        <button
          type="button"
          onClick={() => onShare?.(post)}
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
    </article>
  );
}
