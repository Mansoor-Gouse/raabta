"use client";

import { useState, useRef, useEffect, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  IconHeart,
  IconComment,
  IconShare,
  IconBookmark,
  IconCircleInner,
  IconTrusted,
} from "@/components/layout/InstagramIcons";
import { useVideoMute } from "@/components/layout/VideoMuteContext";
import type { PostCardPost } from "@/components/feed/PostCard";
import { POST_CARD_MEDIA_CONTAINER_CLASS } from "@/components/feed/PostCardMediaStyles";

const CAPTION_LINE_HEIGHT = 1.35;

type StoryPostEmbedProps = {
  post: PostCardPost;
  className?: string;
  /** When false, navigation on tap is disabled (e.g. composer-only preview). */
  navigateOnTap?: boolean;
  /** Sync main video element with StoryViewer progress / pause (feed post videos only). */
  externalVideoRef?: React.MutableRefObject<HTMLVideoElement | null>;
  /** Feed preview loops; story viewer must not loop so `ended` advances the story. */
  videoLoop?: boolean;
  /** Fires when main image/video is ready (for story progress / loading UI). */
  onMediaReady?: () => void;
};

function timeAgo(date: string) {
  const d = new Date(date);
  const now = new Date();
  const s = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (s < 60) return "Just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return d.toLocaleDateString();
}

function timeLabelFrom(date: string) {
  const t = timeAgo(date);
  return t === "Just now" ? t : /^\d+[mhd]$/.test(t) ? `${t} ago` : t;
}

function isVideoUrl(url: string) {
  return !url.match(/\.(gif|webp|png|jpe?g|avif)$/i);
}

/**
 * Read-only feed PostCard for story embed and composer preview.
 * Tap (outside interactive controls) opens the post detail when `navigateOnTap` is true.
 */
export function StoryPostEmbed({
  post,
  className = "",
  navigateOnTap = true,
  externalVideoRef,
  videoLoop = true,
  onMediaReady,
}: StoryPostEmbedProps) {
  const router = useRouter();
  const [mediaIndex, setMediaIndex] = useState(0);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<string>("16 / 10");
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { muted: isMuted, setMuted: setIsMuted } = useVideoMute();

  const caption = post.caption ?? "";
  const captionNeedsExpand = caption.length > 120;
  const showCaptionPreview = captionNeedsExpand && !captionExpanded;
  const media = post.mediaUrls[mediaIndex];
  const hasMultiple = post.mediaUrls.length > 1;
  const hasMedia = post.mediaUrls.length > 0;
  const currentIsVideo = media ? isVideoUrl(media) : false;
  const postHasVideo = post.mediaUrls.some((u) => isVideoUrl(u));
  const reelLayoutActive = postHasVideo && currentIsVideo && !captionExpanded;

  const likedSampleName = post.likedSampleName;
  const likedSampleInitial = likedSampleName?.charAt(0)?.toUpperCase() || "?";
  const likeCount = post.likeCount;

  /** Match PostCard: only pause when switching media, not on first paint (story has no inView replay). */
  const prevMediaKeyRef = useRef<string | null>(null);
  useEffect(() => {
    const key = `${mediaIndex}:${media ?? ""}`;
    if (!currentIsVideo) {
      setVideoPlaying(false);
      prevMediaKeyRef.current = key;
      return;
    }
    if (prevMediaKeyRef.current !== null && prevMediaKeyRef.current !== key) {
      videoRef.current?.pause();
    }
    prevMediaKeyRef.current = key;
  }, [mediaIndex, currentIsVideo, media]);

  useEffect(() => {
    setMediaLoaded(false);
    setMediaAspectRatio("16 / 10");
  }, [media]);

  const toggleMute = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const next = !isMuted;
      setIsMuted(next);
      if (videoRef.current) {
        videoRef.current.muted = next;
        if (!next && !videoRef.current.paused) {
          videoRef.current.play().catch(() => {});
        }
      }
    },
    [isMuted, setIsMuted]
  );

  const toggleVideoPlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setVideoPlaying(true);
    } else {
      v.pause();
      setVideoPlaying(false);
    }
  }, []);

  const handleMediaClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (hasMultiple && x < rect.width * 0.4) {
        e.stopPropagation();
        setMediaIndex((i) => (i === 0 ? post.mediaUrls.length - 1 : i - 1));
        return;
      }
      if (hasMultiple && x > rect.width * 0.6) {
        e.stopPropagation();
        setMediaIndex((i) => (i === post.mediaUrls.length - 1 ? 0 : i + 1));
        return;
      }
      if (navigateOnTap) {
        router.push(`/app/feed/${post._id}`);
      }
    },
    [hasMultiple, post.mediaUrls.length, post._id, navigateOnTap, router]
  );

  const handleCardClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const el = e.target as HTMLElement;
      if (el.closest("button, a, [data-stop-nav]")) return;
      if (navigateOnTap) router.push(`/app/feed/${post._id}`);
    },
    [navigateOnTap, post._id, router]
  );

  return (
    <article
      className={`bg-[var(--ig-bg-primary)] border border-[var(--ig-border-light)] rounded-xl overflow-hidden shadow-sm w-full ${className}`}
      onClick={handleCardClick}
      role={navigateOnTap ? "link" : undefined}
      tabIndex={navigateOnTap ? 0 : undefined}
      onKeyDown={
        navigateOnTap
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/app/feed/${post._id}`);
              }
            }
          : undefined
      }
      aria-label={navigateOnTap ? `Open post by ${post.authorName}` : undefined}
    >
      <svg aria-hidden className="absolute w-0 h-0 overflow-hidden" focusable="false">
        <defs>
          <linearGradient id={`heart-gradient-embed-${post._id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="50%" stopColor="#000000" />
            <stop offset="100%" stopColor="#2d2d2d" />
          </linearGradient>
        </defs>
      </svg>

      {likedSampleName && likeCount > 0 && (
        <div
          className={[
            "w-full flex items-center gap-2 px-4 py-1.5 pointer-events-none",
            reelLayoutActive
              ? "relative z-[9] bg-gradient-to-b from-[var(--ig-bg-primary)]/85 to-transparent border-b border-transparent"
              : "border-b border-[var(--ig-border-light)]",
          ].join(" ")}
        >
          <div className="flex -space-x-2">
            <div
              className={[
                "w-6 h-6 rounded-full border border-[var(--ig-bg-primary)] bg-[var(--ig-border-light)] flex items-center justify-center text-[10px] font-semibold",
                reelLayoutActive ? "text-white" : "text-[var(--ig-text-secondary)]",
              ].join(" ")}
            >
              {likedSampleInitial}
            </div>
            {likeCount > 1 && (
              <div
                className={[
                  "w-6 h-6 rounded-full border border-[var(--ig-bg-primary)] bg-[var(--ig-bg-primary)] flex items-center justify-center text-[10px] font-semibold",
                  reelLayoutActive ? "text-white" : "text-[var(--ig-text-secondary)]",
                ].join(" ")}
              >
                +{likeCount - 1}
              </div>
            )}
          </div>
          <div
            className={[
              "flex-1 min-w-0 text-left text-xs font-medium",
              reelLayoutActive ? "text-white" : "text-[var(--ig-text)]",
            ].join(" ")}
          >
            <span className="font-semibold">{likedSampleName}</span>
            {likeCount > 1 ? ` and ${likeCount - 1} others` : " likes this"}
          </div>
        </div>
      )}

      <header
        className={[
          "flex items-center gap-3 px-4 py-2.5",
          reelLayoutActive ? "relative z-[9] bg-gradient-to-b from-[var(--ig-bg-primary)]/85 to-transparent" : "",
        ].join(" ")}
      >
        <Link href={`/app/members/${post.authorId}`} className="shrink-0" data-stop-nav onClick={(e) => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-lg p-[1px] border border-[var(--ig-border)] flex items-center justify-center shrink-0 bg-[var(--ig-bg-primary)]">
            <div className="w-full h-full rounded-[5px] flex items-center justify-center overflow-hidden bg-[var(--ig-bg-primary)]">
              {post.authorImage ? (
                // eslint-disable-next-line @next/next/no-img-element
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
                reelLayoutActive ? "text-white" : "text-[var(--ig-text)]",
              ].join(" ")}
              data-stop-nav
              onClick={(e) => e.stopPropagation()}
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
                  reelLayoutActive ? "text-white/80" : "text-[var(--ig-text-secondary)]",
                ].join(" ")}
                title="From your Trusted Circle"
              >
                <IconTrusted className="w-3.5 h-3.5 shrink-0" />
              </span>
            )}
          </div>
          <div className={["flex items-center text-xs mt-0.5", reelLayoutActive ? "text-white/70" : "text-[var(--ig-text-secondary)]"].join(" ")}>
            <time dateTime={post.createdAt}>{timeLabelFrom(post.createdAt)}</time>
          </div>
        </div>
      </header>

      {caption && (!hasMedia || captionExpanded) && (
        <div className="px-4 pb-2" data-stop-nav onClick={(e) => e.stopPropagation()}>
          <p
            className="text-sm text-[var(--ig-text)]"
            style={{
              lineHeight: CAPTION_LINE_HEIGHT,
              ...(showCaptionPreview
                ? ({
                    display: "-webkit-box",
                    WebkitLineClamp: 1,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  } as React.CSSProperties)
                : undefined),
            }}
          >
            {showCaptionPreview ? (
              <>
                {caption.slice(0, 120).trim()}
                {caption.length > 120 && "… "}
                <button
                  type="button"
                  onClick={() => setCaptionExpanded(true)}
                  className="text-[var(--ig-link)] font-medium hover:underline"
                >
                  See more
                </button>
              </>
            ) : (
              caption
            )}
          </p>
        </div>
      )}

      {post.mediaUrls.length > 0 && (
        <div
          className={[POST_CARD_MEDIA_CONTAINER_CLASS, reelLayoutActive ? "z-[0]" : ""].join(" ")}
          style={{
            aspectRatio: mediaAspectRatio,
            minHeight: "160px",
          }}
          onClick={handleMediaClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (navigateOnTap) router.push(`/app/feed/${post._id}`);
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={navigateOnTap ? "Open post" : "Media"}
        >
          {media ? (
            <>
              <div
                className={`absolute inset-0 bg-[var(--ig-border-light)] animate-pulse transition-opacity duration-200 ${
                  mediaLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
                }`}
                aria-hidden
              />
              {media.match(/\.(gif|webp|png|jpe?g|avif)$/i) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
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
                    key={media}
                    ref={(el) => {
                      (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = el;
                      if (externalVideoRef) externalVideoRef.current = el;
                      if (el != null && el.readyState >= 2) {
                        setMediaLoaded(true);
                        onMediaReady?.();
                      }
                    }}
                    src={media}
                    className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-200 ${
                      mediaLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    playsInline
                    loop={videoLoop}
                    muted={isMuted}
                    autoPlay
                    onClick={toggleVideoPlay}
                    onPlay={() => setVideoPlaying(true)}
                    onPause={() => setVideoPlaying(false)}
                    onLoadedData={() => {
                      setMediaLoaded(true);
                      onMediaReady?.();
                    }}
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      if (v.videoWidth > 0 && v.videoHeight > 0) {
                        setMediaAspectRatio(`${v.videoWidth} / ${v.videoHeight}`);
                      }
                    }}
                    onError={() => {
                      setMediaLoaded(true);
                      onMediaReady?.();
                    }}
                  />
                  <button
                    type="button"
                    onClick={toggleMute}
                    aria-label={isMuted ? "Unmute video" : "Mute video"}
                    className="absolute bottom-4 right-3 z-30 pointer-events-auto p-2 rounded-full bg-black/40 text-white backdrop-blur-sm"
                    data-stop-nav
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
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden>
                    {!videoPlaying && (
                      <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center">
                        <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div
                    className="absolute inset-y-0 left-1/4 right-1/4 cursor-pointer pointer-events-auto z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVideoPlay(e);
                    }}
                    aria-label={videoPlaying ? "Pause" : "Play"}
                  />
                </>
              )}
              {hasMultiple && (
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-30" aria-hidden>
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

              {caption && hasMedia && !captionExpanded && (
                <div
                  className="absolute left-0 right-12 bottom-0 px-4 pb-3 pt-6 z-20 pointer-events-auto bg-gradient-to-t from-black/70 via-black/30 to-transparent"
                  data-stop-nav
                  onClick={(e) => e.stopPropagation()}
                >
                  <p
                    className="text-sm text-white break-words"
                    style={{
                      lineHeight: CAPTION_LINE_HEIGHT,
                      ...(showCaptionPreview
                        ? ({
                            display: "-webkit-box",
                            WebkitLineClamp: 1,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          } as CSSProperties)
                        : undefined),
                    }}
                  >
                    {showCaptionPreview ? (
                      <>
                        {caption.slice(0, 120).trim()}
                        {caption.length > 120 && "… "}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCaptionExpanded(true);
                          }}
                          className="text-[var(--ig-link)] font-medium hover:underline"
                        >
                          See more
                        </button>
                      </>
                    ) : (
                      caption
                    )}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-[var(--ig-text-secondary)]">No media</div>
          )}
        </div>
      )}

      <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--ig-border-light)] text-sm pointer-events-none">
        <div className="flex items-center gap-1">
          <div className="p-1.5 rounded-full text-[var(--ig-text)]">
            <IconHeart className="w-5 h-5" filled={post.likedByMe} filledGradientId={`heart-gradient-embed-${post._id}`} />
          </div>
          {likeCount > 0 && <span className="text-xs font-medium text-[var(--ig-text-secondary)]">{likeCount}</span>}
        </div>
        <div className="p-1.5 rounded-full text-[var(--ig-text)]">
          <IconComment className="w-5 h-5" />
        </div>
        <div className="p-1.5 rounded-full text-[var(--ig-text)]">
          <IconShare className="w-5 h-5" />
        </div>
        <div className="ml-auto p-1.5 rounded-full text-[var(--ig-text)]">
          <IconBookmark className="w-5 h-5" filled={post.savedByMe} />
        </div>
      </div>

      {navigateOnTap && (
        <div className="px-4 pb-3 pt-0" data-stop-nav onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/app/feed/${post._id}`}
            className="text-xs font-semibold text-[var(--ig-link)] hover:underline"
          >
            View full post
          </Link>
        </div>
      )}
    </article>
  );
}
