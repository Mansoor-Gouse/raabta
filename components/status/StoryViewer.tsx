"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { StoryProgressBars } from "./StoryProgressBars";
import { StoryViewersDrawer } from "./StoryViewersDrawer";
import type { TextOverlay } from "@/types/status";
import { StoryShareSheet, type StoryShareSheetStory } from "@/components/status/StoryShareSheet";
import { useVideoMute } from "@/components/layout/VideoMuteContext";
import { StoryPostEmbed } from "@/components/feed/StoryPostEmbed";
import type { PostCardPost } from "@/components/feed/PostCard";
import { StoryFeedStyleMedia } from "./StoryFeedStyleMedia";
import { FeedPostReactionBarPlaceholder } from "@/components/feed/FeedPostReactionBar";

const IMAGE_DURATION_MS = 5000;

const REACTION_TYPES = [
  { type: "heart", label: "Love", emoji: "❤️" },
  { type: "fire", label: "Fire", emoji: "🔥" },
  { type: "laugh", label: "Laugh", emoji: "😂" },
  { type: "cry", label: "Sad", emoji: "😢" },
  { type: "wow", label: "Wow", emoji: "😮" },
  { type: "like", label: "Like", emoji: "👍" },
] as const;

export type StatusItem = {
  _id: string;
  mediaUrl: string;
  type: "image" | "video";
  expiresAt?: string;
  caption?: string;
  textOverlays?: TextOverlay[];
  mediaTransform?: { scale: number; translateX: number; translateY: number };
  /** When set, story was created from a feed post — render feed PostCard embed. */
  sourcePostId?: string;
};

export type StorySession = {
  userId: string;
  userName?: string;
  userImage?: string;
  statuses: StatusItem[];
};

type StoryViewerProps = {
  sessions: StorySession[];
  initialSessionIndex?: number;
  initialStatusIndex?: number;
  onClose: () => void;
  currentUserId?: string;
  /** When a status is deleted (e.g. from viewers drawer), parent can remove it from list */
  onStatusDeleted?: (statusId: string) => void;
};

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function StoryViewer({
  sessions,
  initialSessionIndex = 0,
  initialStatusIndex = 0,
  onClose,
  currentUserId,
  onStatusDeleted,
}: StoryViewerProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { muted: globalMuted, setMuted: setGlobalMuted } = useVideoMute();
  const [sessionIndex, setSessionIndex] = useState(initialSessionIndex);
  const [statusIndex, setStatusIndex] = useState(initialStatusIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [myReaction, setMyReaction] = useState<Record<string, string>>({});
  const [reactionSending, setReactionSending] = useState(false);
  const [reactionJustSet, setReactionJustSet] = useState<string | null>(null);
  const [viewersDrawerOpen, setViewersDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [storyShareOpen, setStoryShareOpen] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);
  const [embedPost, setEmbedPost] = useState<PostCardPost | null>(null);
  const [embedLoading, setEmbedLoading] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const recordedViewRef = useRef<Set<string>>(new Set());

  const session = sessions[sessionIndex];
  const statuses = session?.statuses ?? [];
  const currentStatus = statuses[statusIndex];
  const totalInSession = statuses.length;
  /** Post-embed stories: StoryPostEmbed owns play/pause; StoryViewer must not fight with video.play(). */
  const isEmbedStory = Boolean(currentStatus?.sourcePostId && embedPost);

  useEffect(() => {
    setMediaReady(false);
  }, [currentStatus?._id]);

  useEffect(() => {
    setStoryShareOpen(false);
  }, [currentStatus?._id]);

  useEffect(() => {
    const sid = currentStatus?.sourcePostId;
    if (!sid) {
      setEmbedPost(null);
      setEmbedLoading(false);
      return;
    }
    let cancelled = false;
    setEmbedLoading(true);
    setEmbedPost(null);
    fetch(`/api/posts/${String(sid)}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (data: {
          _id?: string;
          authorId?: string;
          authorName?: string;
          authorImage?: string | null;
          mediaUrls?: string[];
          caption?: string;
          createdAt?: string;
          likeCount?: number;
          commentCount?: number;
          likedByMe?: boolean;
          savedByMe?: boolean;
        } | null) => {
          if (cancelled || !data?._id || !data.authorId) return;
          const urls = (data.mediaUrls ?? []).filter(Boolean);
          const card: PostCardPost = {
            _id: data._id,
            authorId: data.authorId,
            authorName: data.authorName ?? "Someone",
            authorImage: data.authorImage ?? null,
            mediaUrls: urls,
            caption: data.caption ?? "",
            createdAt: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
            likeCount: data.likeCount ?? 0,
            commentCount: data.commentCount ?? 0,
            likedByMe: data.likedByMe ?? false,
            savedByMe: data.savedByMe ?? false,
          };
          setEmbedPost(card);
        }
      )
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setEmbedLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentStatus?._id, currentStatus?.sourcePostId]);

  // Preload adjacent media so next/prev load instantly from cache (second time is fast)
  useEffect(() => {
    const toPreload: StatusItem[] = [];
    if (statusIndex > 0 && statuses[statusIndex - 1]) toPreload.push(statuses[statusIndex - 1]);
    if (statusIndex < totalInSession - 1 && statuses[statusIndex + 1]) toPreload.push(statuses[statusIndex + 1]);
    if (statusIndex === totalInSession - 1 && sessionIndex < sessions.length - 1) {
      const nextSession = sessions[sessionIndex + 1];
      if (nextSession?.statuses?.[0]) toPreload.push(nextSession.statuses[0]);
    }
    if (statusIndex === 0 && sessionIndex > 0) {
      const prevSession = sessions[sessionIndex - 1];
      const last = prevSession?.statuses?.length ?? 0;
      if (last > 0 && prevSession?.statuses?.[last - 1]) toPreload.push(prevSession.statuses[last - 1]);
    }
    toPreload.forEach((item) => {
      if (item.type === "image") {
        const img = new Image();
        img.src = item.mediaUrl;
      } else {
        const video = document.createElement("video");
        video.preload = "auto";
        video.src = item.mediaUrl;
      }
    });
  }, [sessionIndex, statusIndex, statuses, totalInSession, sessions]);

  useEffect(() => {
    if (session && totalInSession === 0) onClose();
  }, [session, totalInSession, onClose]);

  const advance = useCallback(() => {
    if (statusIndex < totalInSession - 1) {
      setStatusIndex((i) => i + 1);
      setProgress(0);
      return;
    }
    if (sessionIndex < sessions.length - 1) {
      setSessionIndex((i) => i + 1);
      setStatusIndex(0);
      setProgress(0);
      return;
    }
    onClose();
  }, [sessionIndex, sessions.length, statusIndex, totalInSession, onClose]);

  const goPrev = useCallback(() => {
    if (statusIndex > 0) {
      setStatusIndex((i) => i - 1);
      setProgress(0);
      return;
    }
    if (sessionIndex > 0) {
      const prevSession = sessions[sessionIndex - 1];
      setSessionIndex((i) => i - 1);
      setStatusIndex(prevSession.statuses.length - 1);
      setProgress(0);
      return;
    }
  }, [sessionIndex, sessions, statusIndex, totalInSession]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    const duration = reducedMotion ? 0 : 200;
    setTimeout(() => {
      onClose();
    }, duration);
  }, [onClose, reducedMotion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (menuOpen) setMenuOpen(false);
        else if (viewersDrawerOpen) setViewersDrawerOpen(false);
        else handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleClose, viewersDrawerOpen, menuOpen]);

  const isOwnStory = Boolean(currentUserId && session?.userId === currentUserId);

  const handleDeleteStatus = useCallback(
    async (statusId: string) => {
      try {
        const res = await fetch(`/api/status/${statusId}`, { method: "DELETE" });
        if (res.ok) {
          onStatusDeleted?.(statusId);
          router.push("/app/feed");
        }
      } catch {
        // ignore
      }
    },
    [onStatusDeleted, router]
  );

  useEffect(() => {
    if (!currentStatus?._id || !currentUserId || isOwnStory) return;
    if (recordedViewRef.current.has(currentStatus._id)) return;
    recordedViewRef.current.add(currentStatus._id);
    fetch(`/api/status/${currentStatus._id}/view`, { method: "POST" }).catch(() => {});
  }, [currentStatus?._id, currentUserId, isOwnStory]);

  const isVideo = currentStatus?.type === "video";

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (viewersDrawerOpen) {
      video.pause();
      return;
    }
    if (isEmbedStory) {
      video.muted = globalMuted;
      if (isPaused) video.pause();
      return;
    }
    video.muted = globalMuted;
    if (isPaused) {
      video.pause();
      return;
    }
    video.play().catch(() => {
      if (!globalMuted) setGlobalMuted(true);
    });
  }, [isEmbedStory, isPaused, viewersDrawerOpen, currentStatus?._id, globalMuted, setGlobalMuted]);

  /** After long-press pause, StoryPostEmbed can resume; clear paused so we don't keep forcing pause. */
  useEffect(() => {
    if (!isEmbedStory || !mediaReady) return;
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setIsPaused(false);
    video.addEventListener("play", onPlay);
    return () => video.removeEventListener("play", onPlay);
  }, [isEmbedStory, mediaReady, currentStatus?._id]);

  useEffect(() => {
    if (!currentStatus || isPaused || viewersDrawerOpen) return;

    if (isVideo) {
      const video = videoRef.current;
      if (!video) return;

      const onTimeUpdate = () => {
        if (video.duration && isFinite(video.duration)) {
          setProgress(video.currentTime / video.duration);
        }
      };
      const onEnded = () => advance();
      video.addEventListener("timeupdate", onTimeUpdate);
      video.addEventListener("ended", onEnded);
      return () => {
        video.removeEventListener("timeupdate", onTimeUpdate);
        video.removeEventListener("ended", onEnded);
      };
    }

    if (!mediaReady) return;

    const start = Date.now();
    const duration = IMAGE_DURATION_MS;
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const p = Math.min(1, elapsed / duration);
      setProgress(p);
      if (p >= 1) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        advance();
      }
    }, 50);
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [currentStatus?._id, isVideo, isPaused, viewersDrawerOpen, mediaReady, advance]);

  const handleTap = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const third = rect.width / 3;
      if (x < third) goPrev();
      else if (x > 2 * third) advance();
      else if (isVideo) setIsPaused((p) => !p);
    },
    [goPrev, advance, isVideo]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  }, []);

  const SWIPE_DOWN_THRESHOLD = 80;
  const SWIPE_UP_THRESHOLD = 60;

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY === null) return;
      const y = e.touches[0].clientY;
      const delta = y - touchStartY;
      if (delta > SWIPE_DOWN_THRESHOLD) {
        handleClose();
        setTouchStartY(null);
      } else if (isOwnStory && delta < -SWIPE_UP_THRESHOLD) {
        setViewersDrawerOpen(true);
        setTouchStartY(null);
      }
    },
    [touchStartY, handleClose, isOwnStory]
  );

  const handleTouchEnd = useCallback(() => {
    setTouchStartY(null);
  }, []);

  const handleLongPressStart = useCallback(() => {
    if (isVideo) {
      longPressTimerRef.current = setTimeout(() => setIsPaused(true), 400);
    }
  }, [isVideo]);

  const handleLongPressEnd = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, []);

  const handleReaction = useCallback(
    async (reactionType: string) => {
      if (!currentStatus?._id || reactionSending) return;
      setReactionSending(true);
      setReactionJustSet(null);
      try {
        const res = await fetch(`/api/status/${currentStatus._id}/react`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reactionType }),
        });
        if (res.ok) {
          setMyReaction((prev) => ({ ...prev, [currentStatus._id]: reactionType }));
          setReactionJustSet(reactionType);
        }
      } catch {
        // ignore
      } finally {
        setReactionSending(false);
      }
    },
    [currentStatus?._id, reactionSending]
  );

  useEffect(() => {
    if (!reactionJustSet) return;
    const t = setTimeout(() => setReactionJustSet(null), 600);
    return () => clearTimeout(t);
  }, [reactionJustSet]);

  const content = useMemo(() => {
    if (!currentStatus) return null;
    return (
      <div
        ref={containerRef}
        className={`fixed inset-0 z-50 flex flex-col bg-black ${
          isClosing ? "animate-story-viewer-out" : "animate-story-viewer-in"
        }`}
        style={{
          animationDuration: reducedMotion ? "0s" : undefined,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Story viewer"
      >
        <StoryProgressBars
          total={totalInSession}
          activeIndex={statusIndex}
          progress={progress}
        />

        {/* Drag handle hint: swipe down to close — below progress bars */}
        <div
          className="absolute left-1/2 -translate-x-1/2 z-20 w-9 h-1 rounded-full bg-white/40 pointer-events-none"
          style={{ top: "calc(0.5rem + var(--safe-area-inset-top) + 2px + 6px)" }}
          aria-hidden
        />
        {/* Mobile: swipe up hint for viewers (own story only) */}
        {isOwnStory && (
          <div
            className="absolute left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 pointer-events-none md:hidden"
            style={{ bottom: "calc(4rem + var(--safe-area-inset-bottom))" }}
            aria-hidden
          >
            <span className="text-[11px] text-white/60 uppercase tracking-wider">Swipe up</span>
            <svg className="w-5 h-5 text-white/50 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </div>
        )}

        <div
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
          onClick={currentStatus.sourcePostId && embedPost ? undefined : handleTap}
          onTouchStart={handleTouchStart}
          onTouchMove={(e) => {
            handleLongPressEnd();
            handleTouchMove(e);
          }}
          onTouchEnd={(e) => {
            handleLongPressEnd();
            handleTouchEnd();
          }}
          onTouchCancel={handleTouchEnd}
          onMouseDown={handleLongPressStart}
          onMouseUp={handleLongPressEnd}
          onMouseLeave={handleLongPressEnd}
        >
          {currentStatus.sourcePostId && embedLoading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
              <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}
          {currentStatus.sourcePostId && embedPost ? (
            <div className="absolute inset-0 flex items-stretch">
              <button
                type="button"
                className="w-[28%] min-w-[80px] h-full shrink-0 z-20 cursor-default bg-transparent border-0 p-0"
                aria-label="Previous story"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                }}
              />
              <div className="flex-1 min-w-0 flex items-center justify-center min-h-0 overflow-hidden pointer-events-none">
                <div className="pointer-events-auto w-full px-3 py-2 flex flex-col justify-center min-h-0">
                  <StoryPostEmbed
                    post={embedPost}
                    navigateOnTap
                    externalVideoRef={videoRef}
                    videoLoop={false}
                    className="w-full"
                    onMediaReady={() => setMediaReady(true)}
                  />
                </div>
              </div>
              <button
                type="button"
                className="w-[28%] min-w-[80px] h-full shrink-0 z-20 cursor-default bg-transparent border-0 p-0"
                aria-label="Next story"
                onClick={(e) => {
                  e.stopPropagation();
                  advance();
                }}
              />
            </div>
          ) : (
            (() => {
              const t = currentStatus.mediaTransform ?? { scale: 1, translateX: 0, translateY: 0 };
              const transformStyle = {
                transformOrigin: "center center",
                transform: `scale(${t.scale}) translate(${t.translateX}px, ${t.translateY}px)`,
              };
              return (
                <div className="absolute inset-0 flex items-center justify-center px-3">
                  <article className="w-full max-w-full bg-[var(--ig-bg-primary)] border border-[var(--ig-border-light)] rounded-xl overflow-hidden shadow-sm">
                    <StoryFeedStyleMedia
                      mediaUrl={currentStatus.mediaUrl}
                      type={currentStatus.type}
                      transformStyle={transformStyle}
                      videoRef={videoRef}
                      onReady={() => setMediaReady(true)}
                      showPausedOverlay={isVideo && isPaused}
                    />
                    <FeedPostReactionBarPlaceholder />
                  </article>
                </div>
              );
            })()
          )}
        </div>

        {/* Text overlays — same % positioning as add flow */}
        {(currentStatus.textOverlays?.length ?? 0) > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            {currentStatus.textOverlays!.map((overlay) => {
                const fontFamily =
                  overlay.fontFamily === "serif"
                    ? "Georgia, serif"
                    : overlay.fontFamily === "mono"
                      ? "ui-monospace, monospace"
                      : "system-ui, sans-serif";
                return (
                  <div
                    key={overlay.id}
                    style={{
                      position: "absolute",
                      left: `${overlay.x}%`,
                      top: `${overlay.y}%`,
                      transform: `translate(-50%, -50%) scale(${overlay.scale ?? 1}) rotate(${overlay.rotation ?? 0}deg)`,
                      fontSize: overlay.fontSize,
                      fontFamily,
                      color: overlay.color,
                      backgroundColor: overlay.backgroundColor || "transparent",
                      fontWeight: overlay.fontWeight || "normal",
                      textAlign: (overlay.textAlign as "left" | "center" | "right") || "center",
                      padding: "4px 8px",
                      borderRadius: 4,
                      maxWidth: "90%",
                    }}
                  >
                    {overlay.text}
                  </div>
                );
              })}
          </div>
        )}

        {currentStatus.caption && !currentStatus.sourcePostId ? (
          <div
            className="absolute left-0 right-0 z-20 px-4"
            style={{ bottom: "calc(5.25rem + var(--safe-area-inset-bottom))" }}
          >
            <div className="inline-block max-w-full rounded-2xl bg-black/45 px-3 py-2 text-white text-sm leading-snug">
              {currentStatus.caption}
            </div>
          </div>
        ) : null}

        <div
          className="absolute left-0 right-0 z-20 flex items-center justify-between px-3 py-2"
          style={{
            top: "calc(0.5rem + var(--safe-area-inset-top) + 2px + 6px)",
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <Link
            href={isOwnStory ? "/app/profile" : `/app/members/${session?.userId ?? ""}`}
            className="flex items-center gap-2 min-w-0 flex-1 min-w-0 hover:opacity-90 transition-opacity"
            onClick={(e) => e.stopPropagation()}
            aria-label={isOwnStory ? "Go to your profile" : `View ${session?.userName ?? "user"}'s profile`}
          >
            {session?.userImage ? (
              <img
                src={session.userImage}
                alt=""
                className="w-8 h-8 rounded-full object-cover border-2 border-white/50 shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-medium shrink-0">
                {(session?.userName || "?")[0]}
              </div>
            )}
            <span className="text-white text-sm font-medium truncate">
              {isOwnStory ? "Your story" : (session?.userName || "Story")}
            </span>
          </Link>
          <div className="flex items-center gap-1 shrink-0">
            {isOwnStory && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                    router.push("/app/status/new");
                  }}
                  className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/50 font-medium text-sm"
                  aria-label="Add to story"
                  title="Add"
                >
                  + Add
                </button>
                {/* Viewers: on desktop use icon; on mobile use swipe up (icon hidden) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewersDrawerOpen(true);
                  }}
                  className="hidden md:flex p-2 rounded-full bg-black/30 text-white hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                  aria-label="View who viewed your story"
                  title="Viewers (or swipe up on mobile)"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </>
            )}
            {!isOwnStory && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setStoryShareOpen(true);
                }}
                className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Share story"
                title="Share"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12l-7-7-7 7" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const next = !globalMuted;
                setGlobalMuted(next);
                const v = videoRef.current;
                if (v) {
                  v.muted = next;
                  if (!next && !isPaused && !viewersDrawerOpen) {
                    v.play().catch(() => setGlobalMuted(true));
                  }
                }
              }}
              className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label={globalMuted ? "Unmute story video" : "Mute story video"}
              title={globalMuted ? "Unmute" : "Mute"}
            >
              {globalMuted ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5l-4 4H3v10h4l4 4V5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 9l-6 6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9l6 6" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5l-4 4H3v10h4l4 4V5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 9a5 5 0 010 6" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 6a10 10 0 010 12" />
                </svg>
              )}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((o) => !o);
                }}
                className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="More options"
                aria-expanded={menuOpen}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="6" r="1.5" />
                  <circle cx="12" cy="12" r="1.5" />
                  <circle cx="12" cy="18" r="1.5" />
                </svg>
              </button>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    aria-hidden
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                  />
                  <div
                    className="absolute right-0 top-full mt-1 z-40 min-w-[140px] py-1 rounded-xl bg-black/80 backdrop-blur-sm border border-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleClose();
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 rounded-lg"
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <StoryViewersDrawer
          open={viewersDrawerOpen}
          onClose={() => setViewersDrawerOpen(false)}
          statusId={isOwnStory ? currentStatus?._id : undefined}
          onDeleteStatus={isOwnStory ? handleDeleteStatus : undefined}
        />

        <StoryShareSheet
          open={storyShareOpen}
          onClose={() => setStoryShareOpen(false)}
          story={
            currentStatus && session
              ? {
                  statusId: currentStatus._id,
                  mediaUrl: currentStatus.mediaUrl,
                  type: currentStatus.type,
                  caption: currentStatus.caption ?? "",
                  authorName: session.userName ?? "Someone",
                  authorImage: session.userImage ?? null,
                }
              : null
          }
        />

        {/* Reaction strip: bottom center, above safe area */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 flex justify-center gap-2 px-4 pointer-events-none"
          style={{ paddingBottom: "calc(1rem + var(--safe-area-inset-bottom))" }}
        >
          <div
            className="flex items-center gap-2 rounded-full bg-black/50 backdrop-blur-md px-2 py-2 pointer-events-auto border border-white/10"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {REACTION_TYPES.map(({ type, label, emoji }) => {
              const isActive = myReaction[currentStatus._id] === type;
              const justSet = reactionJustSet === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleReaction(type)}
                  disabled={reactionSending}
                  className={`min-w-[48px] min-h-[48px] flex items-center justify-center rounded-full text-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-black active:scale-95 hover:scale-105 touch-manipulation ${
                    isActive ? "bg-white/25 scale-110 ring-2 ring-white/50" : "hover:bg-white/15"
                  } ${justSet ? "animate-[reaction-pop_0.4s_ease-out]" : ""}`}
                  style={{
                    WebkitTapHighlightColor: "transparent",
                  }}
                  aria-label={`React with ${label}`}
                  title={label}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }, [
    currentStatus,
    session,
    statusIndex,
    totalInSession,
    progress,
    isClosing,
    reducedMotion,
    handleTap,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleLongPressStart,
    handleLongPressEnd,
    handleClose,
    myReaction,
    reactionSending,
    handleReaction,
    isOwnStory,
    viewersDrawerOpen,
    menuOpen,
    embedPost,
    embedLoading,
    goPrev,
    advance,
    globalMuted,
    setGlobalMuted,
    isPaused,
    isVideo,
    isEmbedStory,
  ]);

  if (typeof document === "undefined" || !session || statuses.length === 0) return null;
  return createPortal(content, document.body);
}
