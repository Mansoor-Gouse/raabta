"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useVideoMute } from "@/components/layout/VideoMuteContext";
import { POST_CARD_MEDIA_CONTAINER_CLASS } from "@/components/feed/PostCardMediaStyles";

export type StoryFeedStyleMediaProps = {
  mediaUrl: string;
  type: "image" | "video";
  /** Pinch/zoom transform from story composer */
  transformStyle?: React.CSSProperties;
  videoRef?: React.MutableRefObject<HTMLVideoElement | null>;
  onReady?: () => void;
  /** Story playback advances on end; feed embed uses loop. Default false. */
  videoLoop?: boolean;
  /** Show center play glyph when story video is paused (matches feed PostCard). */
  showPausedOverlay?: boolean;
  className?: string;
};

/**
 * Same media treatment as feed PostCard: black frame, dynamic aspect ratio,
 * min height, skeleton, object-cover, bottom-right mute on video.
 */
export function StoryFeedStyleMedia({
  mediaUrl,
  type,
  transformStyle,
  videoRef,
  onReady,
  videoLoop = false,
  showPausedOverlay = false,
  className = "",
}: StoryFeedStyleMediaProps) {
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] = useState<string>("16 / 10");
  const internalVideoRef = useRef<HTMLVideoElement | null>(null);
  const { muted: isMuted, setMuted: setIsMuted } = useVideoMute();

  useEffect(() => {
    setMediaLoaded(false);
    setMediaAspectRatio("16 / 10");
  }, [mediaUrl, type]);

  const setVideoEl = useCallback(
    (el: HTMLVideoElement | null) => {
      internalVideoRef.current = el;
      if (videoRef) videoRef.current = el;
    },
    [videoRef]
  );

  const toggleMute = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const next = !isMuted;
      setIsMuted(next);
      const v = internalVideoRef.current;
      if (v) {
        v.muted = next;
        if (!next && !v.paused) v.play().catch(() => {});
      }
    },
    [isMuted, setIsMuted]
  );

  return (
    <div
      className={`${POST_CARD_MEDIA_CONTAINER_CLASS} ${className}`}
      style={{
        aspectRatio: mediaAspectRatio,
        minHeight: "160px",
      }}
    >
      <div
        className={`absolute inset-0 bg-[var(--ig-border-light)] animate-pulse transition-opacity duration-200 ${
          mediaLoaded ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
        aria-hidden
      />

      {type === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={mediaUrl}
          alt=""
          className={`absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-opacity duration-200 ${
            mediaLoaded ? "opacity-100" : "opacity-0"
          }`}
          style={transformStyle}
          draggable={false}
          onLoad={() => {
            setMediaLoaded(true);
            onReady?.();
          }}
          onLoadCapture={(e) => {
            const t = e.currentTarget;
            if (t.naturalWidth > 0 && t.naturalHeight > 0) {
              setMediaAspectRatio(`${t.naturalWidth} / ${t.naturalHeight}`);
            }
          }}
          onError={() => {
            setMediaLoaded(true);
            onReady?.();
          }}
        />
      ) : (
        <>
          <video
            ref={setVideoEl}
            src={mediaUrl}
            className={`absolute inset-0 w-full h-full object-cover select-none pointer-events-none transition-opacity duration-200 ${
              mediaLoaded ? "opacity-100" : "opacity-0"
            }`}
            style={transformStyle}
            playsInline
            autoPlay
            loop={videoLoop}
            muted={isMuted}
            controls={false}
            onLoadedData={() => {
              setMediaLoaded(true);
              onReady?.();
            }}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.readyState >= 2) {
                setMediaLoaded(true);
                onReady?.();
              }
              if (v.videoWidth > 0 && v.videoHeight > 0) {
                setMediaAspectRatio(`${v.videoWidth} / ${v.videoHeight}`);
              }
            }}
            onError={() => {
              setMediaLoaded(true);
              onReady?.();
            }}
          />
          <button
            type="button"
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute video" : "Mute video"}
            className="absolute bottom-4 right-3 z-30 pointer-events-auto p-2 rounded-full bg-black/40 text-white backdrop-blur-sm"
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
          {showPausedOverlay && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20" aria-hidden>
              <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center">
                <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
