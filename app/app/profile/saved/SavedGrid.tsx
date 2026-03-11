"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PostThumb = { _id: string; mediaUrls: string[] };

export function SavedGrid() {
  const [posts, setPosts] = useState<PostThumb[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/saved")
      .then((r) => r.json())
      .then((data) => setPosts(data.posts || []))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-0.5 bg-[var(--ig-bg)] min-h-[200px]">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square bg-[var(--ig-border-light)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 bg-[var(--ig-bg-primary)]">
        <div className="w-16 h-16 rounded-full border-2 border-[var(--ig-text-secondary)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[var(--ig-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </div>
        <p className="font-semibold text-[var(--ig-text)] text-lg">No saved posts</p>
        <p className="text-sm text-[var(--ig-text-secondary)] mt-1 text-center">Save posts from the feed to see them here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-0.5 bg-[var(--ig-bg)]">
      {posts.map((post) => (
        <Link
          key={post._id}
          href={`/app/feed/${post._id}`}
          className="aspect-square bg-[var(--ig-bg-primary)] block"
        >
          {post.mediaUrls[0] ? (
            post.mediaUrls[0].match(/\.(gif|webp|png|jpe?g|avif)$/i) ? (
              <img
                src={post.mediaUrls[0]}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black text-white">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )
          ) : (
            <div className="w-full h-full bg-[var(--ig-border-light)]" />
          )}
        </Link>
      ))}
    </div>
  );
}
