"use client";

import { useEffect, useState, useCallback } from "react";
import { useChatContext } from "stream-chat-react";
import type { Channel as StreamChannel } from "stream-chat";

function getUnreadCount(channel: StreamChannel): number {
  const membership = channel.state?.membership as { unread_count?: number } | undefined;
  return membership?.unread_count ?? 0;
}

/**
 * Fetches total unread message count across all channels and re-fetches on focus.
 * Used for the navbar message icon badge.
 */
export function useTotalUnreadCount(): number {
  const { client } = useChatContext();
  const [total, setTotal] = useState(0);

  const fetchTotal = useCallback(() => {
    if (!client?.userID) {
      setTotal(0);
      return;
    }
    const base = { members: { $in: [client.userID] } };
    Promise.all([
      client.queryChannels({ type: "messaging", ...base } as any, [], { limit: 50 }),
      client.queryChannels({ type: "team", ...base } as any, [], { limit: 50 }),
    ]).then(([messaging, team]) => {
      const all = [...messaging, ...team];
      const sum = all.reduce((acc, ch) => acc + getUnreadCount(ch), 0);
      setTotal(sum);
    }).catch(() => setTotal(0));
  }, [client]);

  useEffect(() => {
    fetchTotal();
  }, [fetchTotal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFocus = () => fetchTotal();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchTotal]);

  return total;
}

type UnreadMessagesBadgeProps = {
  className?: string;
  /** "icon" = absolute badge for nav icon (default); "inline" = inline pill for sidebar */
  variant?: "icon" | "inline";
};

const badgeContent = (total: number) =>
  total > 99 ? "99+" : String(total);

/**
 * Renders a badge (dot or count) when there are unread messages.
 * - variant="icon": wrap the message icon in a relative container and render this as a sibling.
 * - variant="inline": use in sidebar/list for an inline pill.
 */
export function UnreadMessagesBadge({ className, variant = "icon" }: UnreadMessagesBadgeProps) {
  const total = useTotalUnreadCount();
  if (total <= 0) return null;
  const isInline = variant === "inline";
  const wrapperClass = isInline ? "flex items-center justify-center" : className;
  const badgeClass = isInline
    ? "flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--ig-error)] px-1.5 text-[10px] font-semibold text-white"
    : "absolute -top-0.5 -right-0.5 flex h-4 min-w-[18px] items-center justify-center rounded-full bg-[var(--ig-error)] px-1.5 text-[10px] font-semibold text-white";
  return (
    <span
      className={wrapperClass}
      aria-label={`${total} unread message${total !== 1 ? "s" : ""}`}
    >
      <span className={badgeClass}>{badgeContent(total)}</span>
    </span>
  );
}
