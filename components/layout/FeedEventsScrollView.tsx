"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FeedClient } from "@/app/app/feed/FeedClient";
import { EliteEventsClient } from "@/components/events/elite/EliteEventsClient";
import ChatsPage from "@/app/app/chats/page";
import MembersPage from "@/app/app/members/page";
import { ProfileGrid } from "@/app/app/profile/ProfileGrid";
import { useAppUser } from "@/components/layout/AppShell";

const ROUTES = ["/app/feed", "/app/events", "/app/chats", "/app/members", "/app/profile"] as const;
type PanelIndex = 0 | 1 | 2 | 3 | 4;

export function FeedEventsScrollView() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAppUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);
  const scrollEndTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentIndex = ROUTES.indexOf(pathname as (typeof ROUTES)[number]);
  const panelIndex: PanelIndex = (currentIndex >= 0 ? currentIndex : 0) as PanelIndex;

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
      const clamped = Math.max(0, Math.min(ROUTES.length - 1, index)) as PanelIndex;
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

  return (
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
        <FeedClient isActive={panelIndex === 0} />
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

      {/* Panel 4: Profile */}
      <section
        aria-label="Profile"
        className="min-w-full w-full flex-shrink-0 snap-start overflow-y-auto overflow-x-hidden bg-[var(--elite-bg)]"
      >
        <ProfileGrid />
      </section>
    </div>
  );
}
