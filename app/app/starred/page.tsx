"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type StarredItem = {
  _id: string;
  userId: string;
  channelId: string;
  messageId: string;
  channelType?: "messaging" | "team";
  senderName?: string;
  textPreview?: string;
  createdAt?: string;
};

export default function StarredMessagesPage() {
  const [items, setItems] = useState<StarredItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/starred-messages")
      .then((r) => r.json())
      .then((data: { starred?: StarredItem[] }) => {
        if (cancelled) return;
        setItems(data.starred ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--ig-bg-primary)]">
      <header className="shrink-0 flex items-center gap-2 h-14 min-h-[56px] px-4 border-b border-[var(--ig-border-light)]">
        <Link
          href="/app/chats"
          className="p-2 -ml-2 rounded-lg text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]"
          aria-label="Back to chats"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-semibold text-[var(--ig-text)]">Starred messages</h1>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-4 text-sm text-[var(--ig-text-secondary)]">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-sm text-[var(--ig-text-secondary)]">No starred messages yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--ig-border-light)]">
            {items.map((item) => (
              <li key={item._id}>
                <Link
                  href={`/app/channel/${item.channelId}${item.channelType === "team" ? "?type=team" : ""}`}
                  className="block px-4 py-3 hover:bg-[var(--ig-border-light)]/60"
                >
                  <p className="text-sm text-[var(--ig-text)] font-medium">
                    {item.senderName ? `${item.senderName}: ` : ""}
                    {item.textPreview?.trim() ? item.textPreview : "Message preview unavailable"}
                  </p>
                  <p className="text-xs text-[var(--ig-text-secondary)] mt-0.5">
                    Channel: {item.channelId}
                    {item.createdAt ? ` · Starred ${new Date(item.createdAt).toLocaleString()}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

