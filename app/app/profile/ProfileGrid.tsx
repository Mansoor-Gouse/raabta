"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VideoThumb } from "@/components/media/VideoThumb";

type PostThumb = { _id: string; mediaUrls: string[]; caption?: string };

const CAPTION_PREVIEW_LENGTH = 80;

function isImageUrl(url: string): boolean {
  return /\.(gif|webp|png|jpe?g|avif)$/i.test(url);
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(url);
}

export function ProfileGrid() {
  const [posts, setPosts] = useState<PostThumb[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/me/posts")
      .then((r) => r.json())
      .then((data) => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-0.5 bg-[var(--elite-bg)]">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="aspect-square bg-[var(--elite-border-light)] animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-[var(--elite-bg)]">
        <div className="w-16 h-16 rounded-full border-2 border-[var(--elite-text)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[var(--elite-text)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="0.5" strokeWidth={2} />
            <rect x="14" y="3" width="7" height="7" rx="0.5" strokeWidth={2} />
            <rect x="3" y="14" width="7" height="7" rx="0.5" strokeWidth={2} />
            <rect x="14" y="14" width="7" height="7" rx="0.5" strokeWidth={2} />
          </svg>
        </div>
        <p className="elite-heading font-semibold text-[var(--elite-text)] text-lg">No Posts Yet</p>
        <p className="elite-body text-sm text-[var(--elite-text-secondary)] mt-1">Share your first post from the feed.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 bg-[var(--elite-bg)]">
      {posts.map((post) => {
        const hasMedia = post.mediaUrls?.length > 0;
        const firstMedia = post.mediaUrls?.[0];
        const isImage = firstMedia && isImageUrl(firstMedia);
        const isTextOnly = !hasMedia;

        return (
          <Link
            key={post._id}
            href={`/app/feed/${post._id}`}
            className="aspect-square bg-[var(--elite-surface)] block overflow-hidden"
          >
            {hasMedia && isImage ? (
              <img
                src={firstMedia}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : hasMedia && firstMedia && isVideoUrl(firstMedia) ? (
              <VideoThumb src={firstMedia} className="w-full h-full object-cover" />
            ) : hasMedia && firstMedia ? (
              <div className="w-full h-full flex items-center justify-center bg-[var(--elite-border-light)] text-[var(--elite-text-muted)]">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-3 bg-[var(--elite-surface)] border border-[var(--elite-border)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--elite-border-light)] text-[var(--elite-text-muted)] mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                <p className="elite-body text-xs text-[var(--elite-text-secondary)] text-center line-clamp-3 break-words w-full">
                  {post.caption?.trim()
                    ? post.caption.length > CAPTION_PREVIEW_LENGTH
                      ? `${post.caption.slice(0, CAPTION_PREVIEW_LENGTH).trim()}…`
                      : post.caption
                    : "Text post"}
                </p>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
