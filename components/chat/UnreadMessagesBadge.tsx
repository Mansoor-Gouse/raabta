"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { useChatContext } from "stream-chat-react";
import type { Channel as StreamChannel } from "stream-chat";

const DEBOUNCE_MS = 300;

function getUnreadCount(channel: StreamChannel): number {
  const membership = channel.state?.membership as { unread_count?: number } | undefined;
  return membership?.unread_count ?? 0;
}

/**
 * Fetches total unread message count across all channels. Re-fetches on:
 * - Mount, window focus, leaving a channel route, and Stream events (mark_read / message.new).
 * Used for the navbar message icon badge.
 */
export function useTotalUnreadCount(): number {
  const { client } = useChatContext();
  const pathname = usePathname();
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPathnameRef = useRef<string | null>(null);

  const fetchTotal = useCallback(() => {
    if (!client?.userID) {
      setTotal(0);
      return;
    }
    const base = { members: { $in: [client.userID] } };
    Promise.all([
      client.queryChannels({ type: "messaging", ...base } as any, [], { limit: 50 }),
      client.queryChannels({ type: "team", ...base } as any, [], { limit: 50 }),
    ])
      .then(([messaging, team]) => {
        const all = [...messaging, ...team];
        const sum = all.reduce((acc, ch) => acc + getUnreadCount(ch), 0);
        setTotal(sum);
      })
      .catch(() => {
        // Keep previous total on error so UI does not show a broken state
      });
  }, [client]);

  const debouncedFetchTotal = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      fetchTotal();
    }, DEBOUNCE_MS);
  }, [fetchTotal]);

  useEffect(() => {
    fetchTotal();
  }, [fetchTotal]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFocus = () => debouncedFetchTotal();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [debouncedFetchTotal]);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname ?? null;
    const wasOnChannel = prev?.startsWith("/app/channel/");
    const isNowOffChannel = pathname != null && !pathname.startsWith("/app/channel/");
    if (wasOnChannel && isNowOffChannel) debouncedFetchTotal();
  }, [pathname, debouncedFetchTotal]);

  useEffect(() => {
    if (!client) return;
    const onMarkRead = () => debouncedFetchTotal();
    const onMarkUnread = () => debouncedFetchTotal();
    const onMessageNew = () => debouncedFetchTotal();
    client.on("notification.mark_read", onMarkRead);
    client.on("notification.mark_unread", onMarkUnread);
    client.on("message.new", onMessageNew);
    return () => {
      client.off("notification.mark_read", onMarkRead);
      client.off("notification.mark_unread", onMarkUnread);
      client.off("message.new", onMessageNew);
    };
  }, [client, debouncedFetchTotal]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
