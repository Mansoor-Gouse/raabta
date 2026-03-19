"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useChatContext } from "stream-chat-react";
import { useAppUser } from "@/components/layout/AppShell";
import { ChannelList, type ChannelListRef } from "@/components/chat/ChannelList";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import {
  PushPromptBanner,
  isPushSupported,
  getPushPermission,
  wasPushPromptDismissed,
  usePushSubscriptionAutoSync,
} from "@/components/PushRegistration";

export default function ChatsPage() {
  usePushSubscriptionAutoSync();
  const listRef = useRef<ChannelListRef>(null);
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);
  const user = useAppUser();
  const { client } = useChatContext();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"messages" | "archived" | "starred" | "blocked">("messages");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [starredLoading, setStarredLoading] = useState(false);
  const [starredItems, setStarredItems] = useState<
    Array<{
      _id: string;
      messageId?: string;
      channelId: string;
      channelType?: "messaging" | "team";
      senderName?: string;
      textPreview?: string;
      createdAt?: string;
    }>
  >([]);
  const [unstarringById, setUnstarringById] = useState<Record<string, boolean>>({});

  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/block")
      .then((r) => r.json())
      .then((data: { blockedIds?: string[] }) => {
        if (cancelled) return;
        setBlockedIds(data.blockedIds ?? []);
      })
      .catch(() => {})
      .finally(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onBlockedUpdated(e: Event) {
      const detail = (e as CustomEvent<{ blockedUserId?: string; unblockedUserId?: string }>).detail;
      const blockedUserId = detail?.blockedUserId;
      const unblockedUserId = detail?.unblockedUserId;

      if (blockedUserId) {
        setBlockedIds((prev) => (prev.includes(blockedUserId) ? prev : [...prev, blockedUserId]));
        return;
      }

      if (unblockedUserId) {
        setBlockedIds((prev) => prev.filter((id) => id !== unblockedUserId));
      }
    }

    window.addEventListener("blocked-users-updated", onBlockedUpdated);
    return () => window.removeEventListener("blocked-users-updated", onBlockedUpdated);
  }, []);

  useEffect(() => {
    if (isPushSupported() && getPushPermission() === "default" && !wasPushPromptDismissed()) {
      setShowPushBanner(true);
    }
  }, []);

  const streamUser = client?.user;
  const displayName =
    (streamUser as { name?: string })?.name ||
    (streamUser as { id?: string })?.id ||
    user.name ||
    user.id ||
    "You";

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname ?? null;
    const wasOnChannel = prev?.startsWith("/app/channel/");
    const isNowOnChats = pathname === "/app/chats";
    if (wasOnChannel && isNowOnChats && (activeTab === "messages" || activeTab === "archived" || activeTab === "blocked")) {
      listRef.current?.refresh();
    }
  }, [pathname, activeTab]);

  useEffect(() => {
    if (activeTab !== "starred") return;
    let cancelled = false;
    setStarredLoading(true);
    fetch("/api/me/starred-messages")
      .then((r) => r.json())
      .then((data: {
        starred?: Array<{
          _id: string;
          messageId?: string;
          channelId: string;
          channelType?: "messaging" | "team";
          senderName?: string;
          textPreview?: string;
          createdAt?: string;
        }>
      }) => {
        if (cancelled) return;
        setStarredItems(data.starred ?? []);
      })
      .catch(() => {
        if (!cancelled) setStarredItems([]);
      })
      .finally(() => {
        if (!cancelled) setStarredLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  const starredFiltered = starredItems.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = `${item.senderName ?? ""} ${item.textPreview ?? ""} ${item.channelId}`.toLowerCase();
    return hay.includes(q);
  });

  async function handleUnstar(item: {
    _id: string;
    messageId?: string;
    channelId: string;
  }) {
    const messageId = item.messageId ?? item._id;
    if (!messageId || !item.channelId) return;
    setUnstarringById((prev) => ({ ...prev, [item._id]: true }));
    try {
      const res = await fetch(
        `/api/me/starred-messages/${encodeURIComponent(messageId)}?channelId=${encodeURIComponent(item.channelId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) return;
      setStarredItems((prev) => prev.filter((x) => x._id !== item._id));
    } finally {
      setUnstarringById((prev) => ({ ...prev, [item._id]: false }));
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--ig-bg-primary)]">
      {/* Header: search bar on left; three-dots menu (Archived/Back to chats), New group, New message on right */}
      <header
        className="shrink-0 flex items-center justify-between min-h-[64px] px-4 border-b border-[var(--ig-border-light)]"
        style={{ paddingTop: "var(--safe-area-inset-top)" }}
      >
        <div className="flex-1 min-w-0 flex items-center justify-start pl-1 pr-2">
          <div className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl bg-[var(--ig-border-light)] text-[var(--ig-text-secondary)]">
            <svg
              className="w-5 h-5 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="search"
              placeholder="Search or ask..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-transparent text-[var(--ig-text)] text-sm placeholder-[var(--ig-text-secondary)] border-0 focus:outline-none focus:ring-0"
              aria-label="Search chats"
            />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {(activeTab === "messages" || activeTab === "archived") && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="p-2 rounded-full text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]"
                aria-label="Chat options"
                aria-expanded={menuOpen}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg bg-[var(--ig-bg-primary)] border border-[var(--ig-border)] min-w-[160px] z-20">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("starred");
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
                  >
                    Starred messages
                  </button>
                </div>
              )}
            </div>
          )}
          <Link
            href="/app/new/group"
            className="p-2 rounded-full text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
            aria-label="New group"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </Link>
          <Link
            href="/app/new"
            className="p-2 -mr-2 rounded-full text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
            aria-label="New message"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </Link>
        </div>
      </header>

      {/* Push notifications prompt (dismissible) */}
      {showPushBanner && (
        <PushPromptBanner onDismiss={() => setShowPushBanner(false)} />
      )}

      {/* Messages | Archived | Starred | Blocked tabs */}
      <div className="shrink-0 flex border-b border-[var(--ig-border-light)]">
        <button
          type="button"
          onClick={() => setActiveTab("messages")}
          className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-1.5 ${
            activeTab === "messages"
              ? "text-[var(--ig-text)] border-b-2 border-[var(--ig-text)]"
              : "text-[var(--ig-link)] border-b-2 border-transparent"
          }`}
        >
          Messages
          <svg className="w-4 h-4 text-[var(--ig-text-secondary)]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("archived")}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === "archived"
              ? "text-[var(--ig-text)] border-b-2 border-[var(--ig-text)]"
              : "text-[var(--ig-link)] border-b-2 border-transparent"
          }`}
        >
          Archived
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("starred")}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === "starred"
              ? "text-[var(--ig-text)] border-b-2 border-[var(--ig-text)]"
              : "text-[var(--ig-link)] border-b-2 border-transparent"
          }`}
        >
          Starred
        </button>
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            setActiveTab("blocked");
          }}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === "blocked"
              ? "text-[var(--ig-text)] border-b-2 border-[var(--ig-text)]"
              : "text-[var(--ig-link)] border-b-2 border-transparent"
          }`}
        >
          Blocked
        </button>
      </div>

      {/* Channel list / Starred list */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === "messages" || activeTab === "archived" || activeTab === "blocked" ? (
          <ChannelList
            ref={listRef}
            hideSearchBar
            searchValue={search}
            onSearchChange={setSearch}
            showArchived={activeTab === "archived"}
            showBlocked={activeTab === "blocked"}
            blockedUserIds={blockedIds}
          />
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto bg-[var(--ig-bg-primary)]">
            <div className="px-4 py-3 border-b border-[var(--ig-border-light)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-[var(--ig-link)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.157c.969 0 1.371 1.24.588 1.81l-3.363 2.443a1 1 0 00-.364 1.118l1.287 3.955c.3.921-.755 1.688-1.54 1.118l-3.363-2.443a1 1 0 00-1.176 0l-3.363 2.443c-.784.57-1.838-.197-1.539-1.118l1.287-3.955a1 1 0 00-.364-1.118L2.98 9.382c-.783-.57-.38-1.81.588-1.81h4.157a1 1 0 00.95-.69l1.286-3.955z" />
                </svg>
                <h3 className="text-sm font-semibold text-[var(--ig-text)]">Starred messages</h3>
              </div>
              <span className="text-xs text-[var(--ig-text-secondary)]">{starredItems.length}</span>
            </div>
            {starredLoading ? (
              <p className="p-4 text-sm text-[var(--ig-text-secondary)]">Loading starred messages...</p>
            ) : starredFiltered.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <div className="w-14 h-14 rounded-[10px] bg-[var(--ig-border-light)] flex items-center justify-center mb-3">
                  <svg className="w-7 h-7 text-[var(--ig-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.955a1 1 0 00.95.69h4.157c.969 0 1.371 1.24.588 1.81l-3.363 2.443a1 1 0 00-.364 1.118l1.287 3.955c.3.921-.755 1.688-1.54 1.118l-3.363-2.443a1 1 0 00-1.176 0l-3.363 2.443c-.784.57-1.838-.197-1.539-1.118l1.287-3.955a1 1 0 00-.364-1.118L2.98 9.382c-.783-.57-.38-1.81.588-1.81h4.157a1 1 0 00.95-.69l1.286-3.955z" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-[var(--ig-text)] mb-1">No starred messages</p>
                <p className="text-sm text-[var(--ig-text-secondary)]">Star a message from chat to keep it here.</p>
              </div>
            ) : (
              <ul className="p-3 space-y-2">
                {starredFiltered.map((item) => (
                  <li key={item._id}>
                    <Link
                      href={`/app/channel/${item.channelId}${item.channelType === "team" ? "?type=team" : ""}`}
                      className="block rounded-xl border border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)] hover:bg-[var(--ig-border-light)]/40 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--ig-text)] truncate">
                            {item.senderName ? `${item.senderName}` : "Message"}
                          </p>
                          <p className="text-sm text-[var(--ig-text-secondary)] line-clamp-2 mt-0.5">
                            {item.textPreview?.trim() || "Message preview unavailable"}
                          </p>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--ig-link)] bg-[var(--ig-border-light)] px-2 py-1 rounded-full">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                          </svg>
                          Starred
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-[var(--ig-text-secondary)] gap-2">
                        <span className="truncate">Channel: {item.channelId}</span>
                        <span className="shrink-0">{item.createdAt ? formatRelativeTime(new Date(item.createdAt)) : ""}</span>
                      </div>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            void handleUnstar(item);
                          }}
                          disabled={!!unstarringById[item._id]}
                          className="text-xs px-2.5 py-1 rounded-lg border border-[var(--ig-border)] text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)] disabled:opacity-50"
                        >
                          {unstarringById[item._id] ? "Removing..." : "Unstar"}
                        </button>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
