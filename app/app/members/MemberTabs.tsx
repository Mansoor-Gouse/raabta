"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function MemberTabs({ userId }: { userId: string }) {
  const pathname = usePathname();
  const base = `/app/members/${userId}`;
  const isPosts = pathname === base || pathname === `${base}/`;
  const isEvents = pathname === `${base}/events`;

  return (
    <div className="border-b border-[var(--elite-border)] bg-[var(--elite-bg)] overflow-x-auto no-scrollbar">
      <div className="flex min-w-0 shrink-0">
        <Link
          href={base}
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
          href={`${base}/events`}
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
      </div>
    </div>
  );
}
