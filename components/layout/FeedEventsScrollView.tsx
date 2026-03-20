"use client";

import { useEffect, useRef, useCallback, useLayoutEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FeedClient } from "@/app/app/feed/FeedClient";
import { EliteEventsClient } from "@/components/events/elite/EliteEventsClient";
import ChatsPage from "@/app/app/chats/page";
import MembersPage from "@/app/app/members/page";
import { useAppUser } from "@/components/layout/AppShell";

const ROUTES = ["/app/feed", "/app/events", "/app/chats", "/app/members"] as const;
type PanelIndex = 0 | 1 | 2 | 3;

export function FeedEventsScrollView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAppUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const scrollEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [feedChromeHidden, setFeedChromeHidden] = useState(false);
  const [feedReelActive, setFeedReelActive] = useState(false);

  const currentIndex = ROUTES.indexOf(pathname as (typeof ROUTES)[number]);
  const panelIndex: PanelIndex = (currentIndex >= 0 ? currentIndex : 0) as PanelIndex;

  // Scroll to the correct panel when pathname changes (e.g. user tapped nav).
  // UseLayoutEffect avoids a visible flash at panel 0 then sliding to chats.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || isSyncingRef.current) return;
    const w = el.clientWidth;
    if (w <= 0) {
      requestAnimationFrame(() => {
        const el2 = scrollRef.current;
        if (!el2 || isSyncingRef.current) return;
        const w2 = el2.clientWidth;
        if (w2 <= 0) return;
        const targetScroll2 = panelIndex * w2;
        if (Math.abs(el2.scrollLeft - targetScroll2) < 2) return;
        isSyncingRef.current = true;
        el2.scrollTo({ left: targetScroll2, behavior: "auto" });
        const t2 = requestAnimationFrame(() => {
          isSyncingRef.current = false;
        });
        return () => cancelAnimationFrame(t2);
      });
      return;
    }
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
      const raw = el.scrollLeft / w;
      let targetIndex = Math.round(raw) as PanelIndex;
      // Do not jump more than one panel at a time
      const maxStep = 1;
      const delta = targetIndex - panelIndex;
      if (Math.abs(delta) > maxStep) {
        targetIndex = (panelIndex + (delta > 0 ? 1 : -1)) as PanelIndex;
      }
      const clamped = Math.max(0, Math.min(ROUTES.length - 1, targetIndex)) as PanelIndex;
      const path = ROUTES[clamped];
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      const hidden = !!ce.detail?.hidden;
      setFeedChromeHidden(hidden);
    };
    window.addEventListener("rope:feedChromeHidden", handler as EventListener);
    return () => window.removeEventListener("rope:feedChromeHidden", handler as EventListener);
  }, []);

  const isFeedRoute = pathname.startsWith("/app/feed");

  useEffect(() => {
    if (!isFeedRoute) setFeedChromeHidden(false);
  }, [isFeedRoute]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      setFeedReelActive(!!ce.detail?.active);
    };
    window.addEventListener("rope:feedReelActive", handler as EventListener);
    return () => window.removeEventListener("rope:feedReelActive", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!isFeedRoute) setFeedReelActive(false);
  }, [isFeedRoute]);

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-[var(--ig-bg)]">
      {/* Global sticky title header: stays fixed across sections */}
      <div
        data-rope-global-header
        className={[
          "shrink-0 sticky top-0 z-30 overflow-hidden transition-[max-height] duration-200 ease-out",
          // Opaque background (no transparency) in reel/video mode.
          "bg-[var(--ig-bg-primary)]",
          isFeedRoute && feedChromeHidden && !feedReelActive ? "max-h-0" : "max-h-[64px]",
        ].join(" ")}
      >
        <div className="flex items-center px-4 py-2.5">
          <h1
            className={[
              "feed-title-font text-lg font-semibold",
              "text-[var(--ig-text)]",
            ].join(" ")}
          >
            The Rope
          </h1>
        </div>
      </div>

      {/* Horizontal strip of main sections */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth no-scrollbar"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {/* Panel 0: Feed */}
        <section
          aria-label="Feed"
          className="min-w-full w-full flex-shrink-0 snap-start overflow-y-auto overflow-x-hidden bg-[var(--ig-bg)]"
        >
          <FeedClient isActive={panelIndex === 0} showTitle={false} />
        </section>

        {/* Panel 1: Events */}
        <section
          aria-label="Events"
          className="min-w-full w-full flex-shrink-0 snap-start overflow-y-auto overflow-x-hidden bg-[var(--ig-bg)]"
        >
          <EliteEventsClient
            currentUserId={user?.id ?? null}
            initialSection={initialSection}
            isActive={panelIndex === 1}
            showTitle={false}
          />
        </section>

        {/* Panel 2: Messages */}
        <section
          aria-label="Messages"
          className="min-w-full w-full flex-shrink-0 snap-start overflow-y-auto overflow-x-hidden bg-[var(--ig-bg-primary)]"
        >
          <ChatsPage />
        </section>

        {/* Panel 3: Members */}
        <section
          aria-label="Members"
          className="min-w-full w-full flex-shrink-0 snap-start overflow-y-auto overflow-x-hidden bg-[var(--elite-bg)]"
        >
          <MembersPage />
        </section>
      </div>
    </div>
  );
}
