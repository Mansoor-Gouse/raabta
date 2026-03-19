"use client";

import { Fragment, useEffect, useState, useMemo, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
import { useChatContext } from "stream-chat-react";
import type { Channel as StreamChannel } from "stream-chat";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { formatRelativeTime } from "@/lib/formatRelativeTime";
import { ChatListSwipeRow } from "./ChatListSwipeRow";

type OtherUser = { name?: string; id?: string; image?: string };

function getChannelDisplayName(channel: StreamChannel, currentUserId: string): string {
  const name = (channel.data as { name?: string })?.name;
  if (name) return name;
  const other = getOtherMember(channel, currentUserId);
  return other?.name || other?.id || "Chat";
}

function isEventChannel(channel: StreamChannel): boolean {
  return (channel.id ?? "").startsWith("event-");
}

function getChannelDisplayImage(channel: StreamChannel): string | undefined {
  return (channel.data as { image?: string })?.image;
}

function getOtherMember(channel: StreamChannel, currentUserId: string): OtherUser | undefined {
  const members = channel.state?.members ?? {};
  const entry = Object.values(members).find((m) => (m.user_id ?? (m.user as { id?: string })?.id) !== currentUserId);
  const user = entry?.user as OtherUser | undefined;
  if (!user) return undefined;
  return { name: user.name, id: user.id, image: user.image };
}

function getCurrentUserName(channel: StreamChannel, currentUserId: string): string | undefined {
  const members = channel.state?.members ?? {};
  const me = Object.values(members).find((m) => (m.user_id ?? (m.user as { id?: string })?.id) === currentUserId);
  const user = me?.user as { name?: string } | undefined;
  return user?.name;
}

function getLastMessageTime(channel: StreamChannel): Date | null {
  const msg = channel.state?.messages?.[0];
  if (msg?.created_at) return new Date(msg.created_at as unknown as string | number);
  const ts = (channel.data as { last_message_at?: string })?.last_message_at;
  if (ts) return new Date(ts);
  return null;
}

function getOtherMemberLastRead(channel: StreamChannel, currentUserId: string): Date | null {
  const members = channel.state?.members ?? {};
  const otherId = Object.keys(members).find((id) => id !== currentUserId);
  if (!otherId) return null;
  const read = (channel.state as unknown as { read?: Record<string, { last_read?: string }> })?.read?.[otherId];
  if (!read?.last_read) return null;
  return new Date(read.last_read);
}

/** For groups: number of other members who have read up to the given message (by created_at). */
function getGroupReadCount(
  channel: StreamChannel,
  lastMessage: { created_at?: string | Date } | undefined,
  currentUserId: string
): number {
  if (!lastMessage?.created_at) return 0;
  const members = channel.state?.members ?? {};
  const read = (channel.state as unknown as { read?: Record<string, { last_read?: string }> })?.read ?? {};
  const msgTime = new Date(lastMessage.created_at);
  let count = 0;
  for (const memberId of Object.keys(members)) {
    if (memberId === currentUserId) continue;
    const lastRead = read[memberId]?.last_read;
    if (lastRead && new Date(lastRead) >= msgTime) count += 1;
  }
  return count;
}

function isLastMessageFromMe(channel: StreamChannel, currentUserId: string): boolean {
  const msg = channel.state?.messages?.[0];
  return (msg?.user_id ?? (msg?.user as { id?: string })?.id) === currentUserId;
}

const baseFilters = { type: "messaging" as const };
const LIST_REFRESH_DEBOUNCE_MS = 250;
const PINNED_STORAGE_PREFIX = "chat:pinned:";
const MAX_PINNED_CHATS = 3;

function getPinnedStorageKey(userId: string): string {
  return `${PINNED_STORAGE_PREFIX}${userId}`;
}

function getSafeUnreadCount(channel: StreamChannel): number {
  const unread = (channel.state?.membership as { unread_count?: number } | undefined)?.unread_count ?? 0;
  if (!Number.isFinite(unread)) return 0;
  return Math.max(0, Math.floor(unread));
}

function compareChannelsByRecencyThenUnread(a: StreamChannel, b: StreamChannel): number {
  const ta = getLastMessageTime(a)?.getTime() ?? 0;
  const tb = getLastMessageTime(b)?.getTime() ?? 0;
  if (tb !== ta) return tb - ta;

  const ua = getSafeUnreadCount(a);
  const ub = getSafeUnreadCount(b);
  if (ub !== ua) return ub - ua;

  const aId = a.id ?? "";
  const bId = b.id ?? "";
  return aId.localeCompare(bId);
}

export type ChannelListRef = { refresh: () => void };

export type ChannelListProps = {
  /** When true, search and archived bar are hidden (parent renders search). */
  hideSearchBar?: boolean;
  /** Controlled search value when parent provides the search bar. */
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** When provided, parent controls archived view (e.g. from chats page). */
  showArchived?: boolean;
  onShowArchivedChange?: (show: boolean) => void;
  /** When true, show only channels that contain at least one blocked member. */
  showBlocked?: boolean;
  /** App user IDs that are blocked by the current user (used for filtering channels). */
  blockedUserIds?: string[];
};

export const ChannelList = forwardRef<ChannelListRef, ChannelListProps>(function ChannelList(
  {
    hideSearchBar,
    searchValue,
    onSearchChange,
    showArchived: controlledShowArchived,
    onShowArchivedChange,
    showBlocked = false,
    blockedUserIds,
  },
  ref
) {
  const { client, setActiveChannel } = useChatContext();
  const pathname = usePathname();
  const [channels, setChannels] = useState<StreamChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [internalSearch, setInternalSearch] = useState("");
  const channelSearch = searchValue !== undefined ? searchValue : internalSearch;
  const setChannelSearch = onSearchChange ?? setInternalSearch;
  const [internalShowArchived, setInternalShowArchived] = useState(false);
  const showArchived = controlledShowArchived !== undefined ? controlledShowArchived : internalShowArchived;
  const setShowArchived = onShowArchivedChange ?? setInternalShowArchived;
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [pinnedChannelIds, setPinnedChannelIds] = useState<string[]>([]);
  const [swipedChannelId, setSwipedChannelId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ channelId: string; offset: number } | null>(null);
  const [pullY, setPullY] = useState(0);
  const pullStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchChannels = useCallback((options?: { silent?: boolean }) => {
    if (!client?.userID) return;
    const silent = options?.silent === true;
    if (!silent) setLoading(true);
    const base = {
      members: { $in: [client.userID] },
      ...(showArchived ? { hidden: true } : {}),
    };
    Promise.all([
      client.queryChannels({ ...baseFilters, ...base }, [{ last_message_at: -1 }], { limit: 30 }),
      client.queryChannels({ type: "team", ...base }, [{ last_message_at: -1 }], { limit: 30 }),
    ])
      .then(([messaging, team]) => {
        const byId = new Map<string, StreamChannel>();
        [...messaging, ...team].forEach((c) => byId.set(c.id, c));
        const merged = Array.from(byId.values()).sort(compareChannelsByRecencyThenUnread);
        setChannels(merged);
        if (process.env.NODE_ENV !== "production") {
          console.info("[chat-list] channels refreshed", {
            silent,
            total: merged.length,
            showArchived,
          });
        }
      })
      .catch(console.error)
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, [client, showArchived]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Parent (chats page) calls refresh() when user navigates back from a channel so unread counts stay in sync.
  useImperativeHandle(ref, () => ({ refresh: fetchChannels }), [fetchChannels]);

  const scheduleRefresh = useCallback(
    (options?: { silent?: boolean }) => {
      if (process.env.NODE_ENV !== "production") {
        console.info("[chat-list] schedule refresh", {
          silent: options?.silent === true,
          debounceMs: LIST_REFRESH_DEBOUNCE_MS,
        });
      }
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        fetchChannels(options);
      }, LIST_REFRESH_DEBOUNCE_MS);
    },
    [fetchChannels]
  );

  useEffect(() => {
    if (!client) return;
    const onMessageNew = () => scheduleRefresh({ silent: true });
    const onMarkRead = () => scheduleRefresh({ silent: true });
    const onMarkUnread = () => scheduleRefresh({ silent: true });
    const onAddedToChannel = () => scheduleRefresh({ silent: true });
    const onRemovedFromChannel = () => scheduleRefresh({ silent: true });

    client.on("message.new", onMessageNew);
    client.on("notification.mark_read", onMarkRead);
    client.on("notification.mark_unread", onMarkUnread);
    client.on("notification.added_to_channel", onAddedToChannel);
    client.on("notification.removed_from_channel", onRemovedFromChannel);

    return () => {
      client.off("message.new", onMessageNew);
      client.off("notification.mark_read", onMarkRead);
      client.off("notification.mark_unread", onMarkUnread);
      client.off("notification.added_to_channel", onAddedToChannel);
      client.off("notification.removed_from_channel", onRemovedFromChannel);
    };
  }, [client, scheduleRefresh]);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!client?.userID) {
      setPinnedChannelIds([]);
      return;
    }
    try {
      const raw = window.localStorage.getItem(getPinnedStorageKey(client.userID));
      if (!raw) {
        setPinnedChannelIds([]);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      const list = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
      setPinnedChannelIds(Array.from(new Set(list)));
    } catch (err) {
      console.warn("[chat-list] failed to load pinned channels", err);
      setPinnedChannelIds([]);
    }
  }, [client?.userID]);

  useEffect(() => {
    if (!client?.userID) return;
    try {
      window.localStorage.setItem(getPinnedStorageKey(client.userID), JSON.stringify(pinnedChannelIds));
    } catch (err) {
      console.warn("[chat-list] failed to persist pinned channels", err);
    }
  }, [client?.userID, pinnedChannelIds]);

  const blockedSet = useMemo(() => new Set(blockedUserIds ?? []), [blockedUserIds]);
  const pinnedSet = useMemo(() => new Set(pinnedChannelIds), [pinnedChannelIds]);

  /** True only for 1:1 messaging DMs (exactly two members, and channel type is `messaging`). */
  function isOneToOneChannel(ch: StreamChannel, currentUserId: string): boolean {
    // Blocking is a DM-only feature.
    if (ch.type !== "messaging") return false;
    const members = ch.state?.members ?? {};
    const memberEntries = Object.values(members) as { user_id?: string; user?: { id?: string } }[];
    const distinctUserIds = Array.from(
      new Set(
        memberEntries
          .map((m) => m.user?.id ?? m.user_id)
          .filter((id): id is string => !!id)
      )
    );
    const otherUserIds = distinctUserIds.filter((id) => id !== currentUserId);
    return distinctUserIds.length === 2 && otherUserIds.length === 1;
  }

  /** Other user id in a 1:1 channel, or undefined. */
  function getOtherUserIdInChannel(ch: StreamChannel, currentUserId: string): string | undefined {
    const members = ch.state?.members ?? {};
    const memberEntries = Object.values(members) as { user_id?: string; user?: { id?: string } }[];
    const other = memberEntries.find((m) => {
      const id = m.user?.id ?? m.user_id;
      return id && id !== currentUserId;
    });
    return other ? (other.user?.id ?? other.user_id) : undefined;
  }

  const list = useMemo(() => {
    const currentUserId = client?.userID;
    if (!currentUserId) return channels;

    const blockFiltered = channels.filter((ch) => {
      const is1to1 = isOneToOneChannel(ch, currentUserId);
      if (!is1to1) {
        // Messages tab shows everything except blocked 1:1 DMs.
        // Blocked tab shows ONLY blocked 1:1 DMs.
        return !showBlocked;
      }
      const otherId = getOtherUserIdInChannel(ch, currentUserId);
      const otherIsBlocked = otherId ? blockedSet.has(otherId) : false;
      if (showBlocked) return otherIsBlocked;
      return !otherIsBlocked;
    });

    const unreadFiltered = showUnreadOnly
      ? blockFiltered.filter((ch) => getSafeUnreadCount(ch) > 0)
      : blockFiltered;

    const searched = !channelSearch.trim()
      ? unreadFiltered
      : unreadFiltered.filter((ch) => getChannelDisplayName(ch, currentUserId).toLowerCase().includes(channelSearch.trim().toLowerCase()));
    return [...searched].sort((a, b) => {
      const aPinned = pinnedSet.has(a.id ?? "");
      const bPinned = pinnedSet.has(b.id ?? "");
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return compareChannelsByRecencyThenUnread(a, b);
    });
  }, [channels, channelSearch, client?.userID, showBlocked, blockedSet, showUnreadOnly, pinnedSet]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (el && el.scrollTop === 0) pullStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) return;
    const y = e.touches[0].clientY;
    const delta = y - pullStartY.current;
    if (delta > 0) setPullY(Math.min(delta, 80));
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullY > 50) fetchChannels();
    setPullY(0);
    pullStartY.current = 0;
  }, [pullY, fetchChannels]);

  if (!client?.userID) return null;

  const isEmpty = list.length === 0 && !channelSearch.trim();
  const showEmptyState = isEmpty;
  const pinnedCount = list.filter((ch) => pinnedSet.has(ch.id ?? "")).length;

  return (
    <div
      ref={scrollRef}
      className="flex flex-col h-full overflow-y-auto bg-[var(--ig-bg-primary)] overscroll-contain"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {pullY > 0 && (
        <div className="shrink-0 flex items-center justify-center py-2 text-sm text-[var(--ig-text-secondary)]">
          {pullY > 50 ? "Release to refresh" : "Pull to refresh"}
        </div>
      )}
      {!hideSearchBar && (
        <div className="shrink-0 p-3 border-b border-[var(--ig-border-light)] space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-sm font-medium text-[var(--ig-text)]">
              {showArchived ? "Archived" : "Chats"}
            </span>
            <div className="flex items-center gap-3">
              {showArchived ? (
                <button
                  type="button"
                  onClick={() => setShowArchived(false)}
                  className="text-xs font-medium text-[var(--ig-link)] hover:opacity-80"
                >
                  Back to chats
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setShowArchived(true)}
                    className="text-xs text-[var(--ig-text-secondary)] hover:opacity-80"
                  >
                    Archived
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUnreadOnly((prev) => !prev)}
                    className={`text-xs ${showUnreadOnly ? "text-[var(--ig-link)] font-semibold" : "text-[var(--ig-text-secondary)]"} hover:opacity-80`}
                  >
                    Unread
                  </button>
                  <Link
                    href="/app/search"
                    className="text-xs font-medium text-[var(--ig-link)] hover:opacity-80"
                  >
                    Search messages
                  </Link>
                </>
              )}
            </div>
          </div>
          <input
            type="search"
            placeholder="Search chats..."
            value={channelSearch}
            onChange={(e) => setChannelSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-[var(--ig-border-light)] text-[var(--ig-text)] text-sm placeholder-[var(--ig-text-secondary)] border-0 focus:outline-none focus:ring-1 focus:ring-[var(--ig-border)]"
            aria-label="Search chats"
          />
        </div>
      )}

      {loading ? (
        <ul className="flex-1 overflow-y-auto" aria-busy="true" aria-label="Loading conversations">
          {Array.from({ length: 8 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 px-4 py-3 min-h-[72px] border-b border-[var(--ig-border-light)]"
            >
              <div
                className="w-12 h-12 shrink-0 rounded-[5px] bg-[var(--ig-border-light)] animate-pulse"
                aria-hidden
              />
              <div className="flex-1 min-w-0 space-y-2">
                <div
                  className="h-4 w-3/4 max-w-[140px] rounded bg-[var(--ig-border-light)] animate-pulse"
                  aria-hidden
                />
                <div
                  className="h-3 w-full max-w-[200px] rounded bg-[var(--ig-border-light)] animate-pulse"
                  aria-hidden
                />
              </div>
              <div
                className="h-3 w-12 shrink-0 rounded bg-[var(--ig-border-light)] animate-pulse"
                aria-hidden
              />
            </li>
          ))}
        </ul>
      ) : showEmptyState ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-16 h-16 rounded-[5px] bg-[var(--ig-border-light)] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[var(--ig-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-[var(--ig-text)] mb-1">
            {showBlocked ? "No blocked chats" : "No messages yet"}
          </p>
          <p className="text-sm text-[var(--ig-text-secondary)] mb-5">
            {showBlocked ? "When you block someone, their chats appear here." : "Send a message to get started."}
          </p>
          {!showBlocked && (
            <Link
              href="/app/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--ig-text)] text-[var(--ig-bg-primary)] text-sm font-semibold hover:opacity-90"
            >
              Send message
            </Link>
          )}
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {list.length === 0 && (
            <li className="p-4 text-sm text-[var(--ig-text-secondary)] text-center">
              {showArchived
                ? "No archived chats. Swipe left on a chat to archive it."
                : showBlocked
                  ? "No blocked chats match your search."
                  : "No chats match your search."}
            </li>
          )}
          {list.map((channel, index) => {
            const isActive = pathname === `/app/channel/${channel.id}`;
            const lastMessage = channel.state?.messages?.[0];
            const isFromMe = lastMessage?.user_id === client.userID;
            const other = getOtherMember(channel, client.userID!);
            const memberCount = channel.state?.members ? Object.keys(channel.state.members).length : 0;
            const isOneToOne = memberCount === 2;
            const otherLastRead = isOneToOne ? getOtherMemberLastRead(channel, client.userID!) : null;
            const lastFromMeAndSeen =
              isOneToOne && isFromMe && otherLastRead && lastMessage?.created_at
                ? new Date(lastMessage.created_at as unknown as string | number) <= otherLastRead
                : false;
            const groupReadCount = !isOneToOne && isFromMe ? getGroupReadCount(channel, lastMessage, client.userID!) : 0;
            const preview = lastMessage?.text?.slice(0, 50) || "No messages";
            const previewLine = lastFromMeAndSeen
              ? `Seen ${formatRelativeTime(otherLastRead!)} ago`
              : !isOneToOne && isFromMe && groupReadCount > 0
                ? `Read by ${groupReadCount}`
                : isFromMe
                  ? `You: ${preview}`
                  : preview;
            const muted = (channel.state?.membership as { channel_muted?: boolean } | undefined)?.channel_muted ?? false;
            const time = getLastMessageTime(channel);
            const unreadCount = getSafeUnreadCount(channel);
            const hasUnread = unreadCount > 0;
            const isGroup = memberCount > 2 || channel.type === "team";
            const textLower = (lastMessage?.text || "").toLowerCase();
            const meName = getCurrentUserName(channel, client.userID!)?.toLowerCase();
            const mentionsCurrentUser =
              isGroup &&
              !isFromMe &&
              !!lastMessage?.text &&
              (textLower.includes(`@${client.userID!.toLowerCase()}`) || (meName ? textLower.includes(`@${meName}`) : false));
            const isRecent = !!time && Date.now() - time.getTime() <= 10 * 60 * 1000;

            const isEvent = isEventChannel(channel);
            const channelImage = isEvent ? getChannelDisplayImage(channel) : undefined;
            const channelName = getChannelDisplayName(channel, client.userID!);
            const avatarImage = isEvent ? channelImage : other?.image;
            const avatarLetter = isEvent
              ? (channelName ? channelName[0] : "E")
              : (other?.name || other?.id || "?")[0];

            const rowContent = (
              <>
                <div
                  className={`flex flex-1 min-w-0 items-center gap-3 px-4 py-3 min-h-[72px] ${
                    isActive ? "bg-[var(--ig-border-light)]" : "hover:bg-[var(--ig-border-light)]/50"
                  }`}
                >
                  <Link
                    href={`/app/channel/${channel.id}${channel.type === "team" ? "?type=team" : ""}`}
                    onClick={() => setActiveChannel?.(channel)}
                    className="flex flex-1 min-w-0 items-center gap-3 -m-3 p-3 rounded-lg"
                    aria-label={`Chat with ${channelName}`}
                  >
                    <div className="shrink-0 w-12 h-12 rounded-[5px] overflow-hidden bg-[var(--ig-border-light)] flex items-center justify-center">
                      {avatarImage ? (
                        <img src={avatarImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-semibold text-[var(--ig-text-secondary)]">
                          {(avatarLetter || "?").toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className={`truncate ${hasUnread ? "font-bold text-[var(--ig-text)]" : "font-semibold text-[var(--ig-text)]"}`}>
                          {channelName}
                        </span>
                        {time && (
                          <span
                            className={`text-xs shrink-0 ${hasUnread ? "text-[var(--ig-text)] font-semibold" : "text-[var(--ig-text-secondary)]"}`}
                            title={time.toLocaleString()}
                          >
                            {formatRelativeTime(time)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className={`text-sm truncate ${hasUnread ? "text-[var(--ig-text)] font-medium" : "text-[var(--ig-text-secondary)]"}`}>
                          {mentionsCurrentUser && (
                            <span className="text-[var(--ig-link)] mr-1 font-semibold" aria-label="Mentioned you">
                              @
                            </span>
                          )}
                          {previewLine}
                        </span>
                        <div className="shrink-0 flex items-center gap-1">
                          {muted && (
                            <span
                              className="inline-flex items-center justify-center text-[var(--ig-text-secondary)]"
                              aria-label="Muted chat"
                              title="Muted chat"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9v6m0 0l-3 3m3-3h3a4 4 0 004-4V7a4 4 0 00-4-4H9v6zM3 3l18 18" />
                              </svg>
                            </span>
                          )}
                          {mentionsCurrentUser && (
                            <span className="text-[10px] font-semibold text-[var(--ig-link)] px-1.5 py-0.5 rounded-full bg-[var(--ig-border-light)]">
                              @you
                            </span>
                          )}
                          {!hasUnread && isRecent && (
                            <span className="text-[10px] font-semibold text-[var(--ig-link)] px-1.5 py-0.5 rounded-full bg-[var(--ig-border-light)]">
                              NEW
                            </span>
                          )}
                          {hasUnread && <span className="w-1.5 h-1.5 rounded-full bg-[var(--ig-link)]" aria-hidden />}
                          {hasUnread && (
                            <span
                              className={`shrink-0 flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-semibold px-1.5 ${muted ? "bg-[var(--ig-text-secondary)]" : "bg-[var(--ig-link)]"}`}
                              aria-label={`${unreadCount} unread`}
                            >
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              </>
            );

            const cid = channel.id ?? "";
            const isPinned = pinnedSet.has(cid);
            return (
              <Fragment key={cid}>
                {index === 0 && pinnedCount > 0 && (
                  <li className="px-4 py-1.5 text-[10px] uppercase tracking-wide font-semibold text-[var(--ig-text-secondary)] bg-[var(--ig-bg-primary)] border-b border-[var(--ig-border-light)]">
                    Pinned
                  </li>
                )}
                {index === pinnedCount && pinnedCount > 0 && (
                  <li className="px-4 py-1.5 text-[10px] uppercase tracking-wide font-semibold text-[var(--ig-text-secondary)] bg-[var(--ig-bg-primary)] border-b border-[var(--ig-border-light)]">
                    All chats
                  </li>
                )}
                <ChatListSwipeRow
                  key={cid}
                  channelId={cid}
                  showArchived={showArchived}
                  muted={muted}
                  hasUnread={hasUnread}
                  pinned={isPinned}
                  swipedChannelId={swipedChannelId}
                  dragOffset={dragState && dragState.channelId === cid ? dragState.offset : 0}
                  onSwipeStart={() => {
                    setSwipedChannelId(null);
                  }}
                  onDrag={(id, offset) => {
                    setDragState(offset > 0 && id != null ? { channelId: id, offset } : null);
                  }}
                  onSwipedOpen={(id) => {
                    setSwipedChannelId(id);
                    setDragState(null);
                  }}
                  onArchive={async () => {
                    try {
                      await channel.hide();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  onUnarchive={async () => {
                    try {
                      await channel.show();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  onMute={async () => {
                    try {
                      await channel.mute();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  onUnmute={async () => {
                    try {
                      await channel.unmute();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  onMarkRead={async () => {
                    try {
                      await channel.markRead();
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  onMarkUnread={async () => {
                    try {
                      const last = channel.state?.messages?.[0] as { id?: string } | undefined;
                      if (last?.id && typeof (channel as unknown as { markUnread?: (opts: { message_id: string }) => Promise<unknown> }).markUnread === "function") {
                        await (channel as unknown as { markUnread: (opts: { message_id: string }) => Promise<unknown> }).markUnread({
                          message_id: last.id,
                        });
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  onPin={async () => {
                    if (!cid) return;
                    setPinnedChannelIds((prev) => {
                      if (prev.includes(cid)) return prev;
                      if (prev.length >= MAX_PINNED_CHATS) return prev;
                      return [...prev, cid];
                    });
                  }}
                  onUnpin={async () => {
                    if (!cid) return;
                    setPinnedChannelIds((prev) => prev.filter((id) => id !== cid));
                  }}
                  onActionDone={fetchChannels}
                >
                  {rowContent}
                </ChatListSwipeRow>
              </Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
});
