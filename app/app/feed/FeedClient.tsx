"use client";

import { useEffect, useState, useCallback, useRef, startTransition } from "react";
import Link from "next/link";
import { PostCard } from "@/components/feed/PostCard";
import { FeedPostsSkeleton } from "@/components/feed/FeedSkeleton";
import { PostCardSkeleton } from "@/components/feed/PostCardSkeleton";
import { StoryBar } from "@/components/feed/StoryBar";
import { CommentsDrawer } from "@/components/feed/CommentsDrawer";
import { LikesDrawer } from "@/components/feed/LikesDrawer";
import { ShareSheet } from "@/components/feed/ShareSheet";

const SEGMENTS = ["Posts", "Stories"] as const;
type SegmentIndex = 0 | 1;

function triggerHaptic() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(10);
  }
}

export type FeedPost = {
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

export function FeedClient({ isActive = true, showTitle = true }: { isActive?: boolean; showTitle?: boolean }) {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [me, setMe] = useState<{ _id?: string; fullName?: string; name?: string; profileImage?: string; image?: string } | null>(null);
  const [commentsDrawerPostId, setCommentsDrawerPostId] = useState<string | null>(null);
  const [commentsDrawerAuthorName, setCommentsDrawerAuthorName] = useState("");
  const [likesDrawerPostId, setLikesDrawerPostId] = useState<string | null>(null);
  const [shareSheetPost, setShareSheetPost] = useState<FeedPost | null>(null);
  const [activeIndex, setActiveIndex] = useState<SegmentIndex>(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const postsPanelRef = useRef<HTMLElement>(null);
  const storiesPanelRef = useRef<HTMLElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const prevIndexRef = useRef<SegmentIndex>(0);
  const lastScrollTopRef = useRef(0);
  const activeIndexRef = useRef<SegmentIndex>(0);
  const loadingMoreRef = useRef(false);

  const [tabsHidden, setTabsHidden] = useState(false);
  const tabsHiddenRef = useRef(false);
  const [feedReelActive, setFeedReelActive] = useState(false);

  const dispatchChromeHidden = useCallback((hidden: boolean) => {
    if (typeof window === "undefined") return;
    if (tabsHiddenRef.current === hidden) return;
    tabsHiddenRef.current = hidden;
    setTabsHidden(hidden);
    window.dispatchEvent(new CustomEvent("rope:feedChromeHidden", { detail: { hidden } }));
  }, []);

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const panel = activeIndex === 0 ? postsPanelRef.current : storiesPanelRef.current;
    if (panel) lastScrollTopRef.current = panel.scrollTop;
  }, [activeIndex]);

  const handlePanelScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    // Use the actual scrolling element to avoid any ref/staleness issues.
    const newTop = (e.currentTarget as HTMLElement).scrollTop;
    const delta = newTop - lastScrollTopRef.current;
    // Ignore true-zero and extremely tiny jitter, but allow small deltas
    // so hide/show triggers reliably.
    if (delta === 0) return;
    if (Math.abs(delta) < 1) return;
    dispatchChromeHidden(delta > 0);
    lastScrollTopRef.current = newTop;
  }, [dispatchChromeHidden]);

  useEffect(() => {
    // Reset chrome when feed panel becomes inactive.
    if (!isActive) {
      dispatchChromeHidden(false);
      setTabsHidden(false);
    }
  }, [isActive, dispatchChromeHidden]);

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
    if (!isActive) setFeedReelActive(false);
  }, [isActive]);

  useEffect(() => {
    // Ensure chrome is restored on unmount.
    return () => {
      dispatchChromeHidden(false);
    };
  }, [dispatchChromeHidden]);

  const scrollToIndex = useCallback((index: SegmentIndex) => {
    const el = scrollRef.current;
    if (!el) return;
    triggerHaptic();
    setScrollProgress(index);
    setActiveIndex(index);
    prevIndexRef.current = index;
    const w = el.clientWidth;
    el.scrollTo({ left: index * w, behavior: "smooth" });
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const progress = w > 0 ? Math.max(0, Math.min(1, el.scrollLeft / w)) : 0;
    if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current);
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      setScrollProgress(progress);
    });
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      scrollTimeoutRef.current = null;
      const currentEl = scrollRef.current;
      if (!currentEl) return;
      const currentW = currentEl.clientWidth;
      const currentProgress = currentW > 0 ? currentEl.scrollLeft / currentW : 0;
      const index = Math.round(currentProgress) as SegmentIndex;
      if (index >= 0 && index <= 1 && index !== prevIndexRef.current) {
        triggerHaptic();
        prevIndexRef.current = index;
        setActiveIndex(index);
      }
    }, 100);
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current);
    };
  }, []);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((data) => {
        setCurrentUserId(data._id ? String(data._id) : null);
        setMe(data._id ? data : null);
      })
      .catch(() => {});
  }, []);

  const loadFeed = useCallback(async (cursor?: string | null) => {
    const isLoadMore = !!cursor;
    try {
      const url = cursor ? `/api/feed?cursor=${encodeURIComponent(cursor)}` : "/api/feed";
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(isLoadMore ? "Could not load more posts." : "Could not load your feed.");
      }
      const data = await res.json();
      const list = (data.posts || []) as FeedPost[];
      const next = data.nextCursor ?? null;
      if (cursor) {
        startTransition(() => {
          setPosts((prev) => [...prev, ...list]);
          setNextCursor(next);
        });
      } else {
        setPosts(list);
        setNextCursor(next);
      }
      setError(null);
    } catch (err) {
      if (!isLoadMore) {
        setPosts([]);
        setNextCursor(null);
      }
      const message =
        err instanceof Error ? err.message : "Something went wrong while loading your feed.";
      setError(message);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadFeed(null);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [loadFeed]);

  const handleRetryInitial = useCallback(async () => {
    setLoading(true);
    setError(null);
    await loadFeed(null);
    setLoading(false);
  }, [loadFeed]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      await loadFeed(nextCursor);
    } finally {
      loadingMoreRef.current = false;
      startTransition(() => setLoadingMore(false));
    }
  }, [nextCursor, loadFeed]);

  const updatePost = useCallback((postId: string, upd: Partial<FeedPost>) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === postId ? { ...p, ...upd } : p))
    );
  }, []);

  const removePost = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  }, []);

  const openCommentsDrawer = useCallback((postId: string, authorName: string) => {
    setCommentsDrawerPostId(postId);
    setCommentsDrawerAuthorName(authorName);
  }, []);

  const handleCommentCountChange = useCallback((postId: string, delta: number) => {
    setPosts((prev) =>
      prev.map((p) => (p._id === postId ? { ...p, commentCount: Math.max(0, p.commentCount + delta) } : p))
    );
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--ig-bg)] relative">
      {/* Sticky header inside feed panel: title (optional) + segment tabs */}
      <div
        data-rope-feed-tabs
        className={[
          "sticky top-0 z-10 shrink-0 bg-[var(--ig-bg-primary)] border-b border-[var(--ig-border-light)] overflow-hidden",
          "transition-[max-height,opacity] duration-200 ease-out",
          tabsHidden ? "max-h-0 opacity-0 pointer-events-none" : "max-h-[120px] opacity-100 pointer-events-auto",
        ].join(" ")}
      >
        {showTitle && (
          <div className="flex items-center px-4 py-2.5">
            <h1 className="feed-title-font text-lg font-semibold text-[var(--ig-text)]">The Rope</h1>
          </div>
        )}
        {/* Segment control: sliding underline follows scroll */}
        <div role="tablist" aria-label="Feed sections" className="no-scrollbar overflow-x-auto">
          <div className="relative flex min-w-full">
            {SEGMENTS.map((label, i) => (
              <button
                key={label}
                type="button"
                role="tab"
                aria-selected={activeIndex === i}
                aria-controls={`feed-panel-${i}`}
                id={`feed-tab-${i}`}
                onClick={() => scrollToIndex(i as SegmentIndex)}
                disabled={loading}
                className={`flex-1 py-3 text-sm font-semibold transition-colors min-h-[44px] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--elite-accent)] focus-visible:ring-inset ${
                  activeIndex === i
                    ? "text-[var(--ig-text)]"
                    : "text-[var(--ig-text-secondary)] hover:text-[var(--ig-text)]"
                } ${loading ? "pointer-events-none" : ""}`}
              >
                {label}
              </button>
            ))}
            <div
              className="absolute bottom-0 h-0.5 bg-[var(--ig-text)]"
              style={{
                width: `${100 / SEGMENTS.length}%`,
                left: `${scrollProgress * (100 / SEGMENTS.length)}%`,
              }}
              aria-hidden
            />
          </div>
        </div>
      </div>

      {/* Horizontal scroll: one panel visible at a time */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth no-scrollbar"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Panel 0: Posts (left) — static shell; only list shows skeleton while loading */}
        <section
          ref={postsPanelRef}
          id="feed-panel-0"
          role="tabpanel"
          aria-labelledby="feed-tab-0"
          aria-label="Posts"
          className="min-w-full flex-shrink-0 min-h-0 h-full snap-start overflow-y-auto no-scrollbar bg-[var(--ig-bg)] px-3 pb-1 flex flex-col"
          onScroll={handlePanelScroll}
        >
          {loading ? (
            <FeedPostsSkeleton />
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-[var(--ig-bg-primary)] rounded-xl">
              {error && (
                <div className="mb-4 w-full max-w-sm rounded-lg bg-red-50 text-red-700 px-3 py-2 text-xs flex items-center justify-between gap-2">
                  <span className="truncate">{error}</span>
                  <button
                    type="button"
                    onClick={handleRetryInitial}
                    className="shrink-0 rounded-md border border-red-200 bg-white/80 px-2 py-1 text-[11px] font-semibold hover:bg-white"
                  >
                    Retry
                  </button>
                </div>
              )}
              <p className="text-sm text-[var(--ig-text-secondary)] text-center mb-3">
                There&apos;s nothing here yet. Start the conversation with your first post.
              </p>
              <div className="flex flex-col items-center gap-2">
                <Link
                  href="/app/feed/new"
                  className="rounded-lg bg-[var(--ig-link)] text-white px-4 py-2 text-sm font-semibold hover:opacity-90"
                >
                  Create post
                </Link>
                <Link
                  href="/app/events"
                  className="text-xs text-[var(--ig-text-secondary)] hover:text-[var(--ig-text)]"
                >
                  Or explore events instead
                </Link>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-3 mx-0 rounded-lg bg-red-50 text-red-700 px-3 py-2 text-xs flex items-center justify-between gap-2">
                  <span className="truncate">{error}</span>
                  <button
                    type="button"
                    onClick={handleRetryInitial}
                    className="shrink-0 rounded-md border border-red-200 bg-white/80 px-2 py-1 text-[11px] font-semibold hover:bg-white"
                  >
                    Retry
                  </button>
                </div>
              )}
              <ul className="space-y-4">
                {posts.map((post) => (
                  <li key={post._id}>
                    <PostCard
                      post={post}
                      currentUserId={currentUserId}
                      onUpdate={(upd) => updatePost(post._id, upd)}
                      onDeleted={() => removePost(post._id)}
                    onOpenComments={openCommentsDrawer}
                    onOpenLikes={(id) => setLikesDrawerPostId(id)}
                    onShare={(p) => setShareSheetPost(p)}
                    />
                  </li>
                ))}
              </ul>
              {nextCursor && (
                <div className="p-4 flex justify-center min-h-[52px] items-center">
                  {loadingMore ? (
                    <div className="w-full max-w-xl space-y-4">
                      <PostCardSkeleton />
                      <PostCardSkeleton />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={loadMore}
                      disabled={loadingMore}
                      className="inline-flex items-center justify-center gap-2 text-sm text-[var(--ig-link)] hover:opacity-80 disabled:opacity-50 min-w-[120px] min-h-[40px]"
                    >
                      Load more
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </section>

        {/* Panel 1: Stories (right) */}
        <section
          ref={storiesPanelRef}
          id="feed-panel-1"
          role="tabpanel"
          aria-labelledby="feed-tab-1"
          aria-label="Stories"
          className="min-w-full flex-shrink-0 min-h-0 h-full snap-start overflow-y-auto no-scrollbar bg-[var(--ig-bg-primary)] flex flex-col"
          onScroll={handlePanelScroll}
        >
          <StoryBar />
        </section>
      </div>

      <CommentsDrawer
        open={!!commentsDrawerPostId}
        onClose={() => { setCommentsDrawerPostId(null); setCommentsDrawerAuthorName(""); }}
        postId={commentsDrawerPostId ?? ""}
        postAuthorName={commentsDrawerAuthorName}
        currentUserId={currentUserId}
        currentUserImage={me?.profileImage ?? me?.image}
        currentUserName={me?.fullName ?? me?.name}
        onCommentAdded={commentsDrawerPostId ? () => handleCommentCountChange(commentsDrawerPostId, 1) : undefined}
        onCommentDeleted={commentsDrawerPostId ? (delta) => handleCommentCountChange(commentsDrawerPostId, -(delta ?? 1)) : undefined}
      />

      <LikesDrawer
        open={!!likesDrawerPostId}
        onClose={() => setLikesDrawerPostId(null)}
        postId={likesDrawerPostId ?? ""}
      />

      <ShareSheet
        open={!!shareSheetPost}
        onClose={() => setShareSheetPost(null)}
        post={shareSheetPost}
      />

      {/* Floating create button above bottom nav (mobile) */}
      {isActive && (
        <Link
          href="/app/feed/new"
          className="md:hidden fixed right-4 bottom-[72px] z-40 w-12 h-12 rounded-full bg-gradient-to-br from-white via-gray-50 to-gray-100 text-black flex items-center justify-center shadow-lg shadow-black/15 border border-gray-200/80"
          aria-label="Create post"
        >
          <span className="text-2xl leading-none font-medium">+</span>
        </Link>
      )}
    </div>
  );
}
