"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

type VideoMuteContextValue = {
  muted: boolean;
  setMuted: (next: boolean) => void;
  toggleMuted: () => void;
};

const VideoMuteContext = createContext<VideoMuteContextValue | null>(null);

const STORAGE_KEY = "ig_global_video_muted";

export function VideoMuteProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "true") setMuted(true);
      if (raw === "false") setMuted(false);
    } catch {
      // ignore
    }
  }, []);

  const setMutedAndPersist = useCallback((next: boolean) => {
    setMuted(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
  }, []);

  const toggleMuted = useCallback(() => {
    setMutedAndPersist(!muted);
  }, [muted, setMutedAndPersist]);

  const value = useMemo<VideoMuteContextValue>(
    () => ({
      muted,
      setMuted: setMutedAndPersist,
      toggleMuted,
    }),
    [muted, setMutedAndPersist, toggleMuted]
  );

  return <VideoMuteContext.Provider value={value}>{children}</VideoMuteContext.Provider>;
}

export function useVideoMute() {
  const ctx = useContext(VideoMuteContext);
  if (!ctx) {
    return {
      muted: false,
      setMuted: () => {},
      toggleMuted: () => {},
    };
  }
  return ctx;
}

