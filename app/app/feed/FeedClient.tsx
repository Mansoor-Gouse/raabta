"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PostCard } from "@/components/feed/PostCard";
import { FeedSkeleton } from "@/components/feed/FeedSkeleton";
import { StoryBar } from "@/components/feed/StoryBar";
import { CommentsDrawer } from "@/components/feed/CommentsDrawer";
import { ShareSheet } from "@/components/feed/ShareSheet";

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

  if (loading) {
    return <FeedSkeleton />;
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--ig-bg)]">
      <StoryBar />
      <div>
        {posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 bg-[var(--ig-bg-primary)]">
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
          <ul>
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
        )}
        {nextCursor && posts.length > 0 && (
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
    </div>
  );
}
