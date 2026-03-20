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

function triggerHaptic() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(10);
  }
}

export function PostCard({
  post,
  currentUserId,
  onUpdate,
  onDeleted,
  onOpenComments,
  onOpenLikes,
  onShare,
}: {
  post: PostCardPost;
  currentUserId?: string | null;
  onUpdate: (upd: Partial<PostCardPost>) => void;
  onDeleted?: () => void;
  onOpenComments?: (postId: string, authorName: string) => void;
  onOpenLikes?: (postId: string) => void;
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
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<string>("16 / 10");
  const [mediaFullScreenOpen, setMediaFullScreenOpen] = useState(false);
  // Instagram-like behavior: attempt autoplay with audio (browser may block; we fall back).
  const [isMuted, setIsMuted] = useState(false);
  const cardRef = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  const userPausedRef = useRef(false);
  const [reelOffsetPx, setReelOffsetPx] = useState(0);

  const isAuthor = currentUserId && post.authorId === currentUserId;

  const isVideoUrl = (url: string) => !url.match(/\.(gif|webp|png|jpe?g|avif)$/i);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!cardRef.current) return;
    const el = cardRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setInView(!!entry?.isIntersecting);
      },
      {
        threshold: 0.6,
        rootMargin: "0px 0px -20% 0px",
      }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const toggleLike = useCallback(async () => {
    triggerHaptic();
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

  function handleMediaClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const hasMultiple = post.mediaUrls.length > 1;
    if (hasMultiple && x < rect.width * 0.4) {
      setMediaIndex((i) => (i === 0 ? post.mediaUrls.length - 1 : i - 1));
      return;
    }
    if (hasMultiple && x > rect.width * 0.6) {
      setMediaIndex((i) => (i === post.mediaUrls.length - 1 ? 0 : i + 1));
      return;
    }
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      lastTapRef.current = 0;
      toggleLike();
      return;
    }
    lastTapRef.current = now;
    if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    singleTapTimeoutRef.current = setTimeout(() => {
      singleTapTimeoutRef.current = null;
      setMediaFullScreenOpen(true);
    }, 300);
  }

  useEffect(() => {
    if (!moreOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [moreOpen]);

  useEffect(() => {
    return () => {
      if (singleTapTimeoutRef.current) clearTimeout(singleTapTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (mediaFullScreenOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mediaFullScreenOpen]);

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
  const timeLabel = (() => {
    const t = timeAgo(post.createdAt);
    return t === "Just now" ? t : /^\d+[mhd]$/.test(t) ? `${t} ago` : t;
  })();

  const media = post.mediaUrls[mediaIndex];
  const hasMultiple = post.mediaUrls.length > 1;
  const currentIsVideo = media ? isVideoUrl(media) : false;
  const postHasVideo = post.mediaUrls.some((u) => isVideoUrl(u));

  // Reel-like mode: when a feed video is playing and the card is in view.
  // Used to make the global header transparent and shift the media under it.
  // IMPORTANT: activate based on media type (video) instead of playback state.
  const reelActive = postHasVideo && currentIsVideo && inView && !mediaFullScreenOpen;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!reelActive) {
      setReelOffsetPx(0);
      return;
    }

    const computeOffset = () => {
      // Shift video under the global sticky header only.
      // (We intentionally do not include the Posts/Stories tab row here to avoid
      // an overly aggressive shift.)
      const globalHeader = document.querySelector("[data-rope-global-header]") as HTMLElement | null;
      const card = cardRef.current;
      const internalHeaderEls = card?.querySelectorAll("[data-rope-card-header]") ?? [];
      let internalHeaderHeight = 0;
      internalHeaderEls.forEach((el) => {
        const node = el as HTMLElement;
        internalHeaderHeight += node.offsetHeight || 0;
      });

      const offset = (globalHeader?.offsetHeight ?? 0) + internalHeaderHeight;
      setReelOffsetPx(offset);
    };

    computeOffset();
    window.addEventListener("resize", computeOffset);
    return () => window.removeEventListener("resize", computeOffset);
  }, [reelActive]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("rope:feedReelActive", {
        detail: { active: reelActive },
      })
    );
  }, [reelActive]);

  useEffect(() => {
    if (!currentIsVideo) setVideoPlaying(false);
    else videoRef.current?.pause();
  }, [mediaIndex, currentIsVideo]);

  // Instagram-like autoplay: play when the card is in view, pause when out.
  useEffect(() => {
    if (!currentIsVideo) return;
    if (mediaFullScreenOpen) {
      videoRef.current?.pause();
      setVideoPlaying(false);
      return;
    }

    if (inView) {
      if (!userPausedRef.current) {
        videoRef.current
          ?.play()
          .then(() => {
            setVideoPlaying(true);
          })
          .catch(() => {
            // Autoplay with audio is blocked in many browsers.
            // Fall back to muted autoplay so the video still plays.
            setIsMuted(true);
            try {
              if (videoRef.current) {
                videoRef.current.muted = true;
                videoRef.current.play().then(() => setVideoPlaying(true)).catch(() => setVideoPlaying(false));
              } else {
                setVideoPlaying(false);
              }
            } catch {
              setVideoPlaying(false);
            }
          });
      }
    } else {
      userPausedRef.current = false;
      videoRef.current?.pause();
      setVideoPlaying(false);
    }
  }, [inView, currentIsVideo, mediaFullScreenOpen]);

  const prevMediaKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${mediaIndex}:${media ?? ""}`;
    if (prevMediaKeyRef.current !== null && prevMediaKeyRef.current !== key) setMediaLoaded(false);
    if (prevMediaKeyRef.current !== null && prevMediaKeyRef.current !== key) setMediaAspectRatio("16 / 10");
    prevMediaKeyRef.current = key;
  }, [mediaIndex, media]);

  const setImgRef = useCallback((el: HTMLImageElement | null) => {
    (imgRef as React.MutableRefObject<HTMLImageElement | null>).current = el;
    if (el?.complete && el.naturalWidth > 0) setMediaLoaded(true);
  }, []);

  const toggleVideoPlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPausedRef.current = false;
      video.play().catch(() => {});
      setVideoPlaying(true);
    } else {
      userPausedRef.current = true;
      video.pause();
      setVideoPlaying(false);
    }
  }, []);

  const toggleMute = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
      if (!nextMuted && inView && !videoRef.current.paused && !mediaFullScreenOpen) {
        // Attempt to resume playback with sound if the card is visible.
        videoRef.current.play().catch(() => {});
      }
    }
  }, [inView, isMuted, mediaFullScreenOpen]);

  const totalReactions = likeCount;
  const repostCount: number = 0; // placeholder until backend supports it

  const caption = post.caption ?? "";
  const captionNeedsExpand = caption.length > 120;
  const showCaptionPreview = captionNeedsExpand && !captionExpanded;
  const likedSampleName = post.likedSampleName;
  const likedSampleInitial = likedSampleName?.charAt(0)?.toUpperCase() || "?";

  return (
    <article
      ref={cardRef as React.RefObject<HTMLElement>}
      className="bg-[var(--ig-bg-primary)] border border-[var(--ig-border-light)] rounded-xl overflow-hidden shadow-sm"
    >
      {/* 1. Top row — Likes (only when inner/trusted liker sample is available) */}
      {likedSampleName && likeCount > 0 && (
        <button
          type="button"
          onClick={() => onOpenLikes?.(post._id)}
          className={[
            "w-full flex items-center gap-2 px-4 py-1.5 hover:bg-[var(--ig-border-light)]/40 transition-colors",
            reelActive
              ? "relative z-[9] bg-gradient-to-b from-[var(--ig-bg-primary)]/85 to-transparent border-b border-transparent"
              : "border-b border-[var(--ig-border-light)]",
          ].join(" ")}
          data-rope-card-header
        >
          <div className="flex -space-x-2">
            <div
              className={[
                "w-6 h-6 rounded-full border border-[var(--ig-bg-primary)] bg-[var(--ig-border-light)] flex items-center justify-center text-[10px] font-semibold",
                reelActive ? "text-white" : "text-[var(--ig-text-secondary)]",
              ].join(" ")}
            >
              {likedSampleInitial}
            </div>
            {likeCount > 1 && (
              <div
                className={[
                  "w-6 h-6 rounded-full border border-[var(--ig-bg-primary)] bg-[var(--ig-bg-primary)] flex items-center justify-center text-[10px] font-semibold",
                  reelActive ? "text-white" : "text-[var(--ig-text-secondary)]",
                ].join(" ")}
              >
                +{likeCount - 1}
              </div>
            )}
          </div>
          <div
            className={[
              "flex-1 min-w-0 text-left text-xs font-medium",
              reelActive ? "text-white" : "text-[var(--ig-text)]",
            ].join(" ")}
          >
            <span className="font-semibold">{likedSampleName}</span>
            {likeCount > 1 ? ` and ${likeCount - 1} others` : " likes this"}
          </div>
        </button>
      )}

      {/* 2. Author block */}
      <header
        className={[
          "flex items-center gap-3 px-4 py-2.5",
          reelActive ? "relative z-[9] bg-gradient-to-b from-[var(--ig-bg-primary)]/85 to-transparent" : "",
        ].join(" ")}
        data-rope-card-header
      >
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <Link
              href={`/app/members/${post.authorId}`}
              className={[
                "font-semibold text-sm hover:opacity-80 truncate",
                reelActive ? "text-white" : "text-[var(--ig-text)]",
              ].join(" ")}
            >
              {post.authorName}
            </Link>
            {post.fromInnerCircle && (
              <span className="inline-flex items-center text-amber-600 dark:text-amber-400" title="From your Inner Circle">
                <IconCircleInner className="w-3.5 h-3.5 shrink-0" />
              </span>
            )}
            {post.fromTrustedCircle && !post.fromInnerCircle && (
              <span
                className={[
                  "inline-flex items-center",
                  reelActive ? "text-white/80" : "text-[var(--ig-text-secondary)]",
                ].join(" ")}
                title="From your Trusted Circle"
              >
                <IconTrusted className="w-3.5 h-3.5 shrink-0" />
              </span>
            )}
          </div>
          <div className={["flex items-center text-xs mt-0.5", reelActive ? "text-white/70" : "text-[var(--ig-text-secondary)]"].join(" ")}>
            <time dateTime={post.createdAt}>{timeLabel}</time>
          </div>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
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
          className={[
            "relative w-full bg-black cursor-default",
            reelActive ? "z-[0]" : "",
          ].join(" ")}
          style={{
            aspectRatio: mediaAspectRatio,
            minHeight: "160px",
            transform: reelActive && reelOffsetPx ? `translateY(-${reelOffsetPx}px)` : undefined,
            willChange: reelActive ? "transform" : undefined,
          }}
          onClick={handleMediaClick}
          onDoubleClick={(e) => e.preventDefault()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setMediaFullScreenOpen(true); } }}
          aria-label="Tap to expand, double-tap to like"
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
                  onLoadCapture={(e) => {
                    const target = e.currentTarget;
                    if (target?.naturalWidth > 0 && target?.naturalHeight > 0) {
                      setMediaAspectRatio(`${target.naturalWidth} / ${target.naturalHeight}`);
                    }
                  }}
                  onError={() => setMediaLoaded(true)}
                />
              ) : (
                <>
                  <video
                    ref={(el) => {
                      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
                      if (el != null && el.readyState >= 2) setMediaLoaded(true);
                    }}
                    src={media}
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-200 ${
                      mediaLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    playsInline
                    loop
                    muted={isMuted}
                    onClick={toggleVideoPlay}
                    onPlay={() => setVideoPlaying(true)}
                    onPause={() => setVideoPlaying(false)}
                    onEnded={() => setVideoPlaying(false)}
                    onLoadedData={() => setMediaLoaded(true)}
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      if (v.videoWidth > 0 && v.videoHeight > 0) {
                        setMediaAspectRatio(`${v.videoWidth} / ${v.videoHeight}`);
                      }
                    }}
                    onError={() => setMediaLoaded(true)}
                  />
                  {/* Mute / unmute button */}
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute video" : "Mute video"}
                    className="absolute bottom-3 right-3 z-10 pointer-events-auto p-2 rounded-full bg-black/40 text-white backdrop-blur-sm"
                  >
                    {isMuted ? (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5l-4 4H3v6h4l4 4V5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M23 9l-5 5" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9l5 5" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5l-4 4H3v6h4l4 4V5z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 8a8 8 0 010 8" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 10a4 4 0 010 4" />
                      </svg>
                    )}
                  </button>
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

      {/* Full-screen media overlay */}
      {mediaFullScreenOpen && post.mediaUrls.length > 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Media full screen"
        >
          <button
            type="button"
            onClick={() => setMediaFullScreenOpen(false)}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div
            className="absolute inset-0 flex items-center justify-center p-4"
            onClick={() => setMediaFullScreenOpen(false)}
            aria-hidden
          >
            {(() => {
              const url = post.mediaUrls[mediaIndex];
              const isImage = url?.match(/\.(gif|webp|png|jpe?g|avif)$/i);
              if (isImage) {
                return (
                  <img
                    src={url}
                    alt=""
                    className="max-w-full max-h-full object-contain"
                    onClick={(e) => e.stopPropagation()}
                  />
                );
              }
              return (
                <video
                  src={url}
                  className="max-w-full max-h-full object-contain"
                  controls
                  autoPlay
                  playsInline
                  muted={isMuted}
                  onClick={(e) => e.stopPropagation()}
                />
              );
            })()}
          </div>
          {post.mediaUrls.length > 1 && (
            <>
              <button
                type="button"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white z-10"
                onClick={(e) => { e.stopPropagation(); setMediaIndex((i) => (i === 0 ? post.mediaUrls.length - 1 : i - 1)); }}
                aria-label="Previous"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white z-10"
                onClick={(e) => { e.stopPropagation(); setMediaIndex((i) => (i === post.mediaUrls.length - 1 ? 0 : i + 1)); }}
                aria-label="Next"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
                {post.mediaUrls.map((_, i) => (
                  <span
                    key={i}
                    className={`block rounded-full transition-all ${i === mediaIndex ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/50"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 5. Reaction bar — icon-only, compact (no background highlight, only icon changes) */}
      <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--ig-border-light)] text-sm">
        <div className="flex items-center gap-1">
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
          {likeCount > 0 && (
            <button
              type="button"
              onClick={() => onOpenLikes?.(post._id)}
              className="text-xs font-medium text-[var(--ig-text-secondary)] hover:text-[var(--ig-text)] min-h-[28px] px-1 -ml-0.5"
              aria-label="View who liked"
            >
              {likeCount}
            </button>
          )}
        </div>
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
