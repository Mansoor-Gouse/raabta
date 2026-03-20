"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  src: string;
  className?: string;
};

/**
 * Renders a video preview thumbnail.
 * - Tries to capture the first frame to a dataURL (static screenshot).
 * - If CORS blocks canvas capture, falls back to showing the <video> element's first frame.
 */
export function VideoThumb({ src, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [thumb, setThumb] = useState<string | null>(null);
  const [captureFailed, setCaptureFailed] = useState(false);

  const key = useMemo(() => src, [src]);

  useEffect(() => {
    setThumb(null);
    setCaptureFailed(false);

    const v = videoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas) return;

    const onLoadedMetadata = () => {
      try {
        v.currentTime = 0;
      } catch {
        // ignore
      }
    };

    const onSeeked = () => {
      if (captureFailed) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const w = v.videoWidth || 1;
      const h = v.videoHeight || 1;
      canvas.width = w;
      canvas.height = h;
      try {
        ctx.drawImage(v, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setThumb(dataUrl);
        try {
          v.pause();
        } catch {
          // ignore
        }
      } catch {
        setCaptureFailed(true);
      }
    };

    v.addEventListener("loadedmetadata", onLoadedMetadata);
    v.addEventListener("seeked", onSeeked);

    // Start loading just enough to be able to seek/capture.
    try {
      v.load();
    } catch {
      // ignore
    }

    return () => {
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("seeked", onSeeked);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <>
      <canvas ref={canvasRef} className="hidden" aria-hidden />

      {thumb && !captureFailed ? (
        <img src={thumb} alt="" className={className} />
      ) : (
        <video
          ref={videoRef}
          src={src}
          muted
          playsInline
          preload="metadata"
          className={className}
          // No controls; video will render its first frame once ready.
        />
      )}
    </>
  );
}

