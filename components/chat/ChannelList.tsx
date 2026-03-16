"use client";

import { useEffect, useState, useMemo, useCallback, useRef, useImperativeHandle, forwardRef } from "react";
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
};

export const ChannelList = forwardRef<ChannelListRef, ChannelListProps>(function ChannelList(
  { hideSearchBar, searchValue, onSearchChange, showArchived: controlledShowArchived, onShowArchivedChange },
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
  const [swipedChannelId, setSwipedChannelId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{ channelId: string; offset: number } | null>(null);
  const [pullY, setPullY] = useState(0);
  const pullStartY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchChannels = useCallback(() => {
    if (!client?.userID) return;
    setLoading(true);
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
        const merged = Array.from(byId.values()).sort((a, b) => {
          const ta = getLastMessageTime(a)?.getTime() ?? 0;
          const tb = getLastMessageTime(b)?.getTime() ?? 0;
          return tb - ta;
        });
        setChannels(merged);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [client, showArchived]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  // Parent (chats page) calls refresh() when user navigates back from a channel so unread counts stay in sync.
  useImperativeHandle(ref, () => ({ refresh: fetchChannels }), [fetchChannels]);

  const list = useMemo(() => {
    if (!channelSearch.trim() || !client?.userID) return channels;
    const q = channelSearch.trim().toLowerCase();
    return channels.filter((ch) => getChannelDisplayName(ch, client.userID!).toLowerCase().includes(q));
  }, [channels, channelSearch, client?.userID]);

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
  const showEmptyState = isEmpty && !showArchived;

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
                className="w-12 h-12 shrink-0 rounded-full bg-[var(--ig-border-light)] animate-pulse"
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
          <div className="w-16 h-16 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-[var(--ig-text-secondary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-[var(--ig-text)] mb-1">No messages yet</p>
          <p className="text-sm text-[var(--ig-text-secondary)] mb-5">Send a message to get started.</p>
          <Link
            href="/app/new"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--ig-text)] text-[var(--ig-bg-primary)] text-sm font-semibold hover:opacity-90"
          >
            Send message
          </Link>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {list.length === 0 && (
            <li className="p-4 text-sm text-[var(--ig-text-secondary)] text-center">
              {showArchived
                ? "No archived chats. Swipe left on a chat to archive it."
                : "No chats match your search."}
            </li>
          )}
          {list.map((channel) => {
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
            const unreadCount = (channel.state?.membership as { unread_count?: number } | undefined)?.unread_count ?? 0;
            const hasUnread = unreadCount > 0;

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
                    <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-[var(--ig-border-light)] flex items-center justify-center">
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
                        <span className="font-semibold text-[var(--ig-text)] truncate">
                          {channelName}
                        </span>
                        {time && (
                          <span className="text-xs text-[var(--ig-text-secondary)] shrink-0" title={time.toLocaleString()}>
                            {formatRelativeTime(time)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-sm text-[var(--ig-text-secondary)] truncate">
                          {previewLine}
                        </span>
                        {hasUnread && (
                          <span
                            className="shrink-0 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[var(--ig-text)] text-white text-[10px] font-semibold px-1.5"
                            aria-label={`${unreadCount} unread`}
                          >
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                </div>
              </>
            );

            const cid = channel.id ?? "";
            return (
              <ChatListSwipeRow
                key={cid}
                channelId={cid}
                showArchived={showArchived}
                muted={muted}
                hasUnread={hasUnread}
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
                onActionDone={fetchChannels}
              >
                {rowContent}
              </ChatListSwipeRow>
            );
          })}
        </ul>
      )}
    </div>
  );
});
