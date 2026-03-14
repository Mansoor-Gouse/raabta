"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProfileTabs() {
  const pathname = usePathname();
  const isPosts = pathname === "/app/profile" || pathname === "/app/profile/";
  const isEvents = pathname === "/app/profile/events";
  const isSaved = pathname === "/app/profile/saved";
  const isLiked = pathname === "/app/profile/liked";
  const isCircles = pathname === "/app/profile/circles";

  return (
    <div className="border-b border-[var(--elite-border)] bg-[var(--elite-bg)] overflow-x-auto no-scrollbar">
      <div className="flex min-w-0 shrink-0">
        <Link
          href="/app/profile"
          className={`shrink-0 flex items-center justify-center gap-1 py-3 px-4 border-b-2 min-w-[72px] elite-events ${isPosts ? "border-[var(--elite-accent)] text-[var(--elite-text)]" : "border-transparent text-[var(--elite-text-muted)]"}`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7" rx="0.5" strokeWidth={2} />
            <rect x="14" y="3" width="7" height="7" rx="0.5" strokeWidth={2} />
            <rect x="3" y="14" width="7" height="7" rx="0.5" strokeWidth={2} />
            <rect x="14" y="14" width="7" height="7" rx="0.5" strokeWidth={2} />
          </svg>
          <span className="elite-body text-xs font-medium uppercase tracking-wide whitespace-nowrap">Posts</span>
        </Link>
        <Link
          href="/app/profile/events"
          className={`shrink-0 flex items-center justify-center gap-1 py-3 px-4 border-b-2 min-w-[72px] elite-events ${isEvents ? "border-[var(--elite-accent)] text-[var(--elite-text)]" : "border-transparent text-[var(--elite-text-muted)]"}`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="18" rx="2" strokeWidth={2} />
            <line x1="16" y1="2" x2="16" y2="6" strokeWidth={2} />
            <line x1="8" y1="2" x2="8" y2="6" strokeWidth={2} />
            <line x1="3" y1="10" x2="21" y2="10" strokeWidth={2} />
          </svg>
          <span className="elite-body text-xs font-medium uppercase tracking-wide whitespace-nowrap">Events</span>
        </Link>
        <Link
          href="/app/profile/saved"
          className={`shrink-0 flex items-center justify-center gap-1 py-3 px-4 border-b-2 min-w-[72px] elite-events ${isSaved ? "border-[var(--elite-accent)] text-[var(--elite-text)]" : "border-transparent text-[var(--elite-text-muted)]"}`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          <span className="elite-body text-xs font-medium uppercase tracking-wide whitespace-nowrap">Saved</span>
        </Link>
        <Link
          href="/app/profile/liked"
          className={`shrink-0 flex items-center justify-center gap-1 py-3 px-4 border-b-2 min-w-[72px] elite-events ${isLiked ? "border-[var(--elite-accent)] text-[var(--elite-text)]" : "border-transparent text-[var(--elite-text-muted)]"}`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span className="elite-body text-xs font-medium uppercase tracking-wide whitespace-nowrap">Liked</span>
        </Link>
        <Link
          href="/app/profile/circles"
          className={`shrink-0 flex items-center justify-center gap-1 py-3 px-4 border-b-2 min-w-[72px] elite-events ${isCircles ? "border-[var(--elite-accent)] text-[var(--elite-text)]" : "border-transparent text-[var(--elite-text-muted)]"}`}
        >
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3" strokeWidth={2} />
            <circle cx="12" cy="5" r="2" strokeWidth={2} />
            <circle cx="5" cy="12" r="2" strokeWidth={2} />
            <circle cx="19" cy="12" r="2" strokeWidth={2} />
            <circle cx="12" cy="19" r="2" strokeWidth={2} />
          </svg>
          <span className="elite-body text-xs font-medium uppercase tracking-wide whitespace-nowrap">Circles</span>
        </Link>
      </div>
    </div>
  );
}
