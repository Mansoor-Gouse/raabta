"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type NotificationItem = {
  _id: string;
  type: string;
  eventId: string | null;
  eventTitle: string | null;
  postId: string | null;
  actorId: string | null;
  readAt: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  event_invite: "You were invited to",
  event_request_approved: "Your request to join was approved for",
  event_request_rejected: "Your request could not be accommodated for",
  event_waitlisted: "You were added to the waitlist for",
  event_removed: "You were removed from",
  circle_added: "You were added to someone's circle",
  mutual_inner_circle: "You and someone are now in each other's Inner Circle",
  circle_event_invite: "Someone from your circle invited you to",
  circle_opportunity: "New post shared with your circle",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  function load(cursor?: string) {
    const url = cursor
      ? `/api/notifications?limit=20&cursor=${encodeURIComponent(cursor)}`
      : "/api/notifications?limit=20";
    fetch(url, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data.notifications) ? data.notifications : [];
        if (cursor) {
          setItems((prev) => [...prev, ...list]);
        } else {
          setItems(list);
        }
        setUnreadCount(data.unreadCount ?? 0);
        setNextCursor(data.nextCursor ?? null);
        setHasMore(data.hasMore ?? false);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      credentials: "include",
    });
    setItems((prev) =>
      prev.map((n) => (n._id === id ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "markAllRead" }),
    });
    setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    setUnreadCount(0);
  }

  return (
    <div className="min-h-full bg-[var(--ig-bg)] flex flex-col" style={{ paddingTop: "var(--safe-area-inset-top)" }}>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--ig-border)] bg-[var(--ig-bg-primary)]">
        <Link
          href="/app/events"
          className="p-2 -ml-2 rounded-lg text-[var(--ig-text)] hover:bg-[var(--ig-border-light)] min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold text-[var(--ig-text)]">Notifications</h1>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-sm font-medium text-[var(--ig-accent)] hover:underline"
          >
            Mark all read
          </button>
        )}
        {unreadCount === 0 && <div className="w-16" />}
      </header>
      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <div className="p-4 text-[var(--ig-text-secondary)]">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-[var(--ig-text-secondary)]">
            No notifications yet.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--ig-border)]">
            {items.map((n) => {
              const href =
                n.type === "circle_added" || n.type === "mutual_inner_circle"
                  ? n.actorId
                    ? `/app/members/${n.actorId}`
                    : "/app/profile/circles"
                  : n.type === "circle_event_invite" && n.eventId
                    ? `/app/events/${n.eventId}`
                    : n.type === "circle_opportunity" && n.postId
                      ? `/app/feed/${n.postId}`
                      : n.eventId
                        ? `/app/events/${n.eventId}`
                        : "#";
              const label =
                n.type === "circle_added" || n.type === "mutual_inner_circle"
                  ? TYPE_LABELS[n.type] ?? n.type
                  : n.eventId
                    ? `${TYPE_LABELS[n.type] ?? n.type} ${n.eventTitle ?? "Event"}`
                    : (TYPE_LABELS[n.type] ?? n.type);
              return (
                <li key={n._id}>
                  <Link
                    href={href}
                    onClick={() => !n.readAt && markRead(n._id)}
                    className={`block px-4 py-3 hover:bg-[var(--ig-border-light)] ${!n.readAt ? "bg-[var(--ig-border-light)]/50" : ""}`}
                  >
                    <p className="text-sm text-[var(--ig-text)]">
                      {label}
                    </p>
                    <p className="text-xs text-[var(--ig-text-secondary)] mt-0.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {hasMore && nextCursor && (
          <div className="p-4 text-center">
            <button
              type="button"
              onClick={() => load(nextCursor)}
              className="text-sm font-medium text-[var(--ig-accent)] hover:underline"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
