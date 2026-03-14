"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { PostCard } from "@/components/feed/PostCard";
import { FeedPostsSkeleton } from "@/components/feed/FeedSkeleton";
import { StoryBar } from "@/components/feed/StoryBar";
import { CommentsDrawer } from "@/components/feed/CommentsDrawer";
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

export function FeedClient() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [me, setMe] = useState<{ _id?: string; fullName?: string; name?: string; profileImage?: string; image?: string } | null>(null);
  const [commentsDrawerPostId, setCommentsDrawerPostId] = useState<string | null>(null);
  const [commentsDrawerAuthorName, setCommentsDrawerAuthorName] = useState("");
  const [shareSheetPost, setShareSheetPost] = useState<FeedPost | null>(null);
  const [activeIndex, setActiveIndex] = useState<SegmentIndex>(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const prevIndexRef = useRef<SegmentIndex>(0);

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
    const url = cursor ? `/api/feed?cursor=${encodeURIComponent(cursor)}` : "/api/feed";
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json();
    const list = (data.posts || []) as FeedPost[];
    if (cursor) {
      setPosts((prev) => [...prev, ...list]);
    } else {
      setPosts(list);
    }
    setNextCursor(data.nextCursor ?? null);
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

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    await loadFeed(nextCursor);
    setLoadingMore(false);
  }

  function updatePost(postId: string, upd: Partial<FeedPost>) {
    setPosts((prev) =>
      prev.map((p) => (p._id === postId ? { ...p, ...upd } : p))
    );
  }

  function removePost(postId: string) {
    setPosts((prev) => prev.filter((p) => p._id !== postId));
  }

  function openCommentsDrawer(postId: string, authorName: string) {
    setCommentsDrawerPostId(postId);
    setCommentsDrawerAuthorName(authorName);
  }

  function handleCommentCountChange(postId: string, delta: number) {
    setPosts((prev) =>
      prev.map((p) => (p._id === postId ? { ...p, commentCount: Math.max(0, p.commentCount + delta) } : p))
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--ig-bg)] relative">
      {/* Sticky header: title + segment bar */}
      <div className="sticky top-0 z-30 shrink-0 bg-[var(--ig-bg-primary)] border-b border-[var(--ig-border-light)]">
        <div className="flex items-center px-4 py-2.5">
          <h1 className="feed-title-font text-lg font-semibold text-[var(--ig-text)]">The Rope</h1>
        </div>
        {/* Segment control: sliding underline follows scroll */}
        <div
          role="tablist"
          aria-label="Feed sections"
          className="relative flex border-b border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)]"
        >
          {SEGMENTS.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={activeIndex === i}
              aria-controls={`feed-panel-${i}`}
              id={`feed-tab-${i}`}
              onClick={() => scrollToIndex(i as SegmentIndex)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeIndex === i ? "text-[var(--ig-text)]" : "text-[var(--ig-text-secondary)] hover:text-[var(--ig-text)]"
              }`}
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

      {/* Horizontal scroll: one panel visible at a time */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scroll-smooth no-scrollbar"
        style={{ scrollbarWidth: "none" }}
      >
        {/* Panel 0: Posts (left) — static shell; only list shows skeleton while loading */}
        <section
          id="feed-panel-0"
          role="tabpanel"
          aria-labelledby="feed-tab-0"
          aria-label="Posts"
          className="min-w-full flex-shrink-0 snap-start overflow-y-auto bg-[var(--ig-bg)] px-3 pb-1"
        >
          {loading ? (
            <FeedPostsSkeleton />
          ) : posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 bg-[var(--ig-bg-primary)] rounded-xl">
              <p className="text-sm text-[var(--ig-text-secondary)] text-center mb-4">
                No posts yet. Be the first to share.
              </p>
              <Link
                href="/app/feed/new"
                className="rounded-lg bg-[var(--ig-link)] text-white px-4 py-2 text-sm font-semibold hover:opacity-90"
              >
                Create post
              </Link>
            </div>
          ) : (
            <>
              <ul className="space-y-4">
                {posts.map((post) => (
                  <li key={post._id}>
                    <PostCard
                      post={post}
                      currentUserId={currentUserId}
                      onUpdate={(upd) => updatePost(post._id, upd)}
                      onDeleted={() => removePost(post._id)}
                      onOpenComments={openCommentsDrawer}
                      onShare={(p) => setShareSheetPost(p)}
                    />
                  </li>
                ))}
              </ul>
              {nextCursor && (
                <div className="p-4 flex justify-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-sm text-[var(--ig-link)] hover:opacity-80 disabled:opacity-50"
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Panel 1: Stories (right) */}
        <section
          id="feed-panel-1"
          role="tabpanel"
          aria-labelledby="feed-tab-1"
          aria-label="Stories"
          className="min-w-full flex-shrink-0 snap-start overflow-y-auto bg-[var(--ig-bg-primary)]"
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

      <ShareSheet
        open={!!shareSheetPost}
        onClose={() => setShareSheetPost(null)}
        post={shareSheetPost}
      />

      {/* Floating create button above bottom nav (mobile) */}
      <Link
        href="/app/feed/new"
        className="md:hidden fixed right-4 bottom-[72px] z-40 w-12 h-12 rounded-full bg-black text-white flex items-center justify-center shadow-lg shadow-black/40"
        aria-label="Create post"
      >
        <span className="text-2xl leading-none">+</span>
      </Link>
    </div>
  );
}
