"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { VideoThumb } from "@/components/media/VideoThumb";

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|ogg|mov|mkv|avi)$/i.test(url);
}

type PostThumb = { _id: string; mediaUrls: string[] };

export function LikedGrid() {
  const [posts, setPosts] = useState<PostThumb[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/liked")
      .then((r) => r.json())
      .then((data) => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-0.5 bg-[var(--elite-bg)] min-h-[200px]">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square bg-[var(--elite-border-light)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-[var(--elite-bg)]">
        <div className="w-16 h-16 rounded-full border-2 border-[var(--elite-border)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[var(--elite-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <p className="elite-heading font-semibold text-[var(--elite-text)] text-lg">No liked posts</p>
        <p className="elite-body text-sm text-[var(--elite-text-secondary)] mt-1 text-center">Posts you like will appear here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 bg-[var(--elite-bg)]">
      {posts.map((post) => (
        <Link
          key={post._id}
          href={`/app/feed/${post._id}`}
          className="aspect-square bg-[var(--elite-surface)] block"
        >
          {post.mediaUrls[0] ? (
            post.mediaUrls[0].match(/\.(gif|webp|png|jpe?g|avif)$/i) ? (
              <img
                src={post.mediaUrls[0]}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              isVideoUrl(post.mediaUrls[0]) ? (
                <VideoThumb src={post.mediaUrls[0]} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[var(--elite-border-light)] text-[var(--elite-text-muted)]">
                  <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )
            )
          ) : (
            <div className="w-full h-full bg-[var(--elite-border-light)]" />
          )}
        </Link>
      ))}
    </div>
  );
}
