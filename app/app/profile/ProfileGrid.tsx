"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type PostThumb = { _id: string; mediaUrls: string[] };

export function ProfileGrid() {
  const [posts, setPosts] = useState<PostThumb[]>([]);

  useEffect(() => {
    fetch("/api/me/posts")
      .then((r) => r.json())
      .then((data) => setPosts(data.posts || []))
      .catch(() => {});
  }, []);

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
              <div className="w-full h-full flex items-center justify-center bg-black text-white">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            )
          ) : (
            <div className="w-full h-full bg-[var(--elite-border-light)]" />
          )}
        </Link>
      ))}
    </div>
  );
}
