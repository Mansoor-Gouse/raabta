"use client";

/**
 * Skeleton for Directory member cards: avatar + lines + action bar.
 */
export function MemberCardSkeleton({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="elite-events flex items-center gap-2 rounded-[var(--elite-radius-lg)] border border-[var(--elite-border)] bg-[var(--elite-card)] p-2.5 animate-pulse"
      style={delay > 0 ? { animationDelay: `${delay}ms` } : undefined}
    >
      <div className="h-10 w-10 shrink-0 rounded-full bg-[var(--elite-border)]" />
      <div className="min-w-0 flex-1 space-y-1">
        <div className="h-3.5 w-3/4 rounded bg-[var(--elite-border)]" />
        <div className="h-3 w-1/2 rounded bg-[var(--elite-border)]/80" />
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <div className="h-7 w-7 rounded-full bg-[var(--elite-border)]" />
        <div className="h-7 w-7 rounded-full bg-[var(--elite-border)]" />
        <div className="h-7 w-7 rounded-full bg-[var(--elite-border)]" />
      </div>
    </div>
  );
}
