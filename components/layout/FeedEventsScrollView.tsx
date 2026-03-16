"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FeedClient } from "@/app/app/feed/FeedClient";
import { EliteEventsClient } from "@/components/events/elite/EliteEventsClient";
import { useAppUser } from "@/components/layout/AppShell";

const FEED_PATH = "/app/feed";
const EVENTS_PATH = "/app/events";

export function FeedEventsScrollView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAppUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const scrollEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panelIndex = pathname === EVENTS_PATH ? 1 : 0;

  // Scroll to the correct panel when pathname changes (e.g. user tapped nav)
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isSyncingRef.current) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const targetScroll = panelIndex * w;
    if (Math.abs(el.scrollLeft - targetScroll) < 2) return;
    isSyncingRef.current = true;
    el.scrollTo({ left: targetScroll, behavior: "auto" });
    const t = requestAnimationFrame(() => {
      isSyncingRef.current = false;
    });
    return () => cancelAnimationFrame(t);
  }, [panelIndex, pathname]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isSyncingRef.current) return;
    if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
    scrollEndTimeoutRef.current = setTimeout(() => {
      scrollEndTimeoutRef.current = null;
      const w = el.clientWidth;
      if (w <= 0) return;
      const index = Math.round(el.scrollLeft / w);
      const path = index >= 1 ? EVENTS_PATH : FEED_PATH;
      if (pathname !== path) {
        isSyncingRef.current = true;
        router.replace(path);
        requestAnimationFrame(() => {
          isSyncingRef.current = false;
        });
      }
    }, 120);
  }, [pathname, router]);

  useEffect(() => {
    return () => {
      if (scrollEndTimeoutRef.current) clearTimeout(scrollEndTimeoutRef.current);
    };
  }, []);

  const initialSection = searchParams.get("section") ?? undefined;

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 min-h-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth no-scrollbar"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
    >
      <section
        aria-label="Feed"
        className="min-w-full w-full flex-shrink-0 snap-start overflow-y-auto overflow-x-hidden bg-[var(--ig-bg)]"
      >
        <FeedClient />
      </section>
      <section
        aria-label="Events"
        className="min-w-full w-full flex-shrink-0 snap-start overflow-y-auto overflow-x-hidden bg-[var(--ig-bg)]"
      >
        <EliteEventsClient currentUserId={user?.id ?? null} initialSection={initialSection} />
      </section>
    </div>
  );
}
