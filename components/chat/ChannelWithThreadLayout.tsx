"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Thread, useChannelStateContext, useChatContext, useComponentContext, Window } from "stream-chat-react";
import type { Channel as StreamChannel } from "stream-chat";
import { CustomChannelHeader } from "./CustomChannelHeader";
import { ChannelMessageLayout } from "./ChannelMessageLayout";
import { ChannelMessageSearch } from "./ChannelMessageSearch";
import { ChannelOptionsMenu } from "./ChannelOptionsMenu";
import { ConnectionBanner } from "./ConnectionBanner";
import { GroupMembersOpenProvider, useGroupMembersOpen } from "./GroupMembersOpenContext";
import { GroupMembersSheet } from "./GroupMembersSheet";

/**
 * Renders channel main panel and thread panel. When a thread is open:
 * - Mobile: main panel hidden, thread full width with back button.
 * - Desktop: main and thread side by side.
 */
function ChannelWithThreadLayoutInner() {
  const messageActions = ["reply", "react", "edit", "delete", "markUnread", "pin", "quote", "flag", "mute"] as const;
  const { thread } = useChannelStateContext();
  const { HeaderComponent } = useComponentContext();
  const groupMembersOpen = useGroupMembersOpen();
  const [searchOpen, setSearchOpen] = useState(false);
  const [forwardRequest, setForwardRequest] = useState<{
    messageId?: string;
    text: string;
    senderId?: string;
    sourceChannelId: string;
  } | null>(null);
  const ChannelHeaderToRender = HeaderComponent ?? CustomChannelHeader;

  useEffect(() => {
    function onForwardRequest(e: Event) {
      const detail = (e as CustomEvent<{ messageId?: string; text?: string; senderId?: string; sourceChannelId?: string }>).detail;
      if (!detail) return;
      setForwardRequest({
        messageId: detail.messageId,
        text: detail.text ?? "",
        senderId: detail.senderId,
        sourceChannelId: detail.sourceChannelId ?? "",
      });
    }
    window.addEventListener("chat-forward-request", onForwardRequest);
    return () => window.removeEventListener("chat-forward-request", onForwardRequest);
  }, []);

  return (
    <div className="flex flex-1 min-h-0 min-w-0">
      {/* Main channel: hide on mobile when thread is open */}
      <div
        className={
          thread
            ? "hidden md:flex flex-1 min-h-0 min-w-0 flex-col"
            : "flex flex-1 min-h-0 min-w-0 flex-col"
        }
      >
        <Window>
          <ConnectionBanner />
          <div className="flex items-center gap-1 sm:gap-2 border-b border-[var(--ig-border)] px-2 py-2 min-h-[48px] shrink-0 bg-[var(--ig-bg-primary)]">
            <Link
              href="/app/chats"
              className="md:hidden p-2 -ml-1 rounded-lg text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)] min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
              aria-label="Back to chats"
            >
              <BackIcon />
            </Link>
            <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
              <ChannelHeaderToRender />
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="p-2 rounded-lg text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]"
                  aria-label="Search in conversation"
                >
                  <SearchIcon />
                </button>
                <ChannelOptionsMenu />
              </div>
            </div>
          </div>
          {searchOpen && (
            <ChannelMessageSearch
              open={searchOpen}
              onClose={() => setSearchOpen(false)}
            />
          )}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ChannelMessageLayout />
          </div>
        </Window>
      </div>

      {/* Thread panel: visible when thread is set */}
      {thread && (
        <div className="flex flex-1 md:max-w-md min-w-0 flex-col border-l border-[var(--ig-border)] bg-[var(--ig-bg-primary)]">
          <Thread
            fullWidth
            messageActions={[...messageActions]}
          />
        </div>
      )}
      {groupMembersOpen && (
        <GroupMembersSheet
          open={groupMembersOpen.open}
          onClose={() => groupMembersOpen.setOpen(false)}
        />
      )}
      {forwardRequest && (
        <ForwardPickerModal
          request={forwardRequest}
          onClose={() => setForwardRequest(null)}
        />
      )}
    </div>
  );
}

export function ChannelWithThreadLayout() {
  return (
    <GroupMembersOpenProvider>
      <ChannelWithThreadLayoutInner />
    </GroupMembersOpenProvider>
  );
}

function getTargetChannelDisplayName(channel: StreamChannel, currentUserId: string): string {
  const name = (channel.data as { name?: string })?.name;
  if (name) return name;
  const members = channel.state?.members ?? {};
  const other = Object.values(members).find((m) => (m.user_id ?? (m.user as { id?: string })?.id) !== currentUserId);
  const user = other?.user as { name?: string; id?: string } | undefined;
  return user?.name || user?.id || "Chat";
}

function ForwardPickerModal({
  request,
  onClose,
}: {
  request: { messageId?: string; text: string; senderId?: string; sourceChannelId: string };
  onClose: () => void;
}) {
  const { client } = useChatContext();
  const [channels, setChannels] = useState<StreamChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!client?.userID) return;
    setLoading(true);
    Promise.all([
      client.queryChannels({ type: "messaging", members: { $in: [client.userID] } }, [{ last_message_at: -1 }], { limit: 30 }),
      client.queryChannels({ type: "team", members: { $in: [client.userID] } }, [{ last_message_at: -1 }], { limit: 30 }),
    ])
      .then(([dm, team]) => {
        const byId = new Map<string, StreamChannel>();
        [...dm, ...team].forEach((ch) => byId.set(ch.id, ch));
        const all = Array.from(byId.values());
        const filtered = all.filter((ch) => ch.id !== request.sourceChannelId);
        setChannels(filtered);
      })
      .catch(() => setChannels([]))
      .finally(() => setLoading(false));
  }, [client, request.sourceChannelId]);

  const filteredList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !client?.userID) return channels;
    return channels.filter((ch) => getTargetChannelDisplayName(ch, client.userID!).toLowerCase().includes(q));
  }, [channels, query, client?.userID]);

  function toggleSelected(channelId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      return next;
    });
  }

  async function handleForwardSelected() {
    if (!client?.userID || selectedIds.size === 0) return;
    setSending(true);
    try {
      const text = request.text?.trim();
      const targets = filteredList.filter((ch) => ch.id && selectedIds.has(ch.id));
      for (const target of targets) {
        await target.sendMessage({
          text: text ? `Forwarded: ${text}` : "Forwarded message",
          customData: {
            forwardedFromMessageId: request.messageId,
            forwardedFromChannelId: request.sourceChannelId,
            forwardedFromSenderId: request.senderId,
          },
        } as Parameters<typeof target.sendMessage>[0]);
      }
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end md:items-center md:justify-center" onClick={onClose}>
      <div
        className="w-full md:max-w-md max-h-[75vh] rounded-t-2xl md:rounded-xl bg-[var(--ig-bg-primary)] border border-[var(--ig-border)] shadow-xl p-3 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-[var(--ig-border)] mx-auto mb-2" aria-hidden />
        <h3 className="text-base font-semibold text-[var(--ig-text)] mb-2">Forward message</h3>
        <input
          type="search"
          placeholder="Search chats..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-[var(--ig-border-light)] text-[var(--ig-text)] text-sm border-0 focus:outline-none focus:ring-1 focus:ring-[var(--ig-border)] mb-2"
        />
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-sm text-[var(--ig-text-secondary)] p-3">Loading chats...</p>
          ) : filteredList.length === 0 ? (
            <p className="text-sm text-[var(--ig-text-secondary)] p-3">No chats found.</p>
          ) : (
            <ul className="space-y-1">
              {filteredList.map((ch) => (
                <li key={ch.id}>
                  <button
                    type="button"
                    onClick={() => ch.id && toggleSelected(ch.id)}
                    disabled={sending}
                    className="w-full flex items-center justify-between text-left px-3 py-2 rounded-lg hover:bg-[var(--ig-border-light)] disabled:opacity-50"
                  >
                    <span className="text-sm text-[var(--ig-text)]">
                      {getTargetChannelDisplayName(ch, client?.userID ?? "")}
                    </span>
                    {ch.id && selectedIds.has(ch.id) && (
                      <span className="text-xs text-[var(--ig-link)] font-semibold">Selected</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          onClick={handleForwardSelected}
          disabled={selectedIds.size === 0 || sending}
          className="mt-2 w-full px-3 py-2 rounded-lg bg-[var(--ig-text)] text-[var(--ig-bg-primary)] disabled:opacity-50"
        >
          {sending ? "Forwarding..." : `Forward to ${selectedIds.size}`}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full px-3 py-2 rounded-lg border border-[var(--ig-border)] text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="w-5 h-5"
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
  );
}
