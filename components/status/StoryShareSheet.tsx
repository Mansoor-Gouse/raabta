"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Channel as StreamChannel } from "stream-chat";
import { useChatContext } from "stream-chat-react";

export type StoryShareSheetStory = {
  statusId: string;
  mediaUrl: string;
  type: "image" | "video";
  caption?: string;
  authorName: string;
  authorImage?: string | null;
};

type OtherUser = { name?: string; id?: string; image?: string };

function getOtherMember(channel: StreamChannel, currentUserId: string): OtherUser | undefined {
  const members = channel.state?.members ?? {};
  const entry = Object.values(members).find(
    (m) => (m.user_id ?? (m.user as { id?: string })?.id) !== currentUserId
  );
  const user = entry?.user as OtherUser | undefined;
  if (!user) return undefined;
  return { name: user.name, id: user.id, image: user.image };
}

function getChannelDisplayName(channel: StreamChannel, currentUserId: string): string {
  const data = channel.data as { name?: string };
  if (data?.name) return data.name;
  const other = getOtherMember(channel, currentUserId);
  return other?.name || other?.id || "Chat";
}

function getChannelDisplayImage(channel: StreamChannel, currentUserId: string): string | undefined {
  const data = channel.data as { image?: string };
  if (data?.image) return data.image;
  const other = getOtherMember(channel, currentUserId);
  return other?.image;
}

type RecipientChannel = { type: "channel"; channel: StreamChannel; id: string; name: string; image?: string };
type RecipientUser = { type: "user"; userId: string; name: string; image?: string };
type Recipient = RecipientChannel | RecipientUser;

function recipientKey(r: Recipient): string {
  return r.type === "channel" ? `channel:${r.id}` : `user:${r.userId}`;
}

export function StoryShareSheet({
  open,
  onClose,
  story,
}: {
  open: boolean;
  onClose: () => void;
  story: StoryShareSheetStory | null;
}) {
  const router = useRouter();
  const { client, setActiveChannel } = useChatContext();

  const [search, setSearch] = useState("");
  const [channels, setChannels] = useState<StreamChannel[]>([]);
  const [searchUsers, setSearchUsers] = useState<RecipientUser[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [searchDebounceRef, setSearchDebounceRef] = useState<ReturnType<typeof setTimeout> | null>(null);

  const currentUserId = client?.userID ?? null;

  useEffect(() => {
    if (!open || !client?.userID) return;
    const base = { members: { $in: [client.userID] } };
    Promise.all([
      client.queryChannels({ type: "messaging", ...base }, [{ last_message_at: -1 }], { limit: 50 }),
      client.queryChannels({ type: "team", ...base }, [{ last_message_at: -1 }], { limit: 50 }),
    ])
      .then(([messaging, team]) => {
        const byId = new Map<string, StreamChannel>();
        [...messaging, ...team].forEach((c) => byId.set(c.id, c));
        const merged = Array.from(byId.values()).sort((a, b) => {
          const getTime = (c: StreamChannel) => {
            const created = c.state?.messages?.[0]?.created_at;
            if (created == null) return 0;
            return created instanceof Date ? created.getTime() : new Date(created).getTime();
          };
          return getTime(b) - getTime(a);
        });
        setChannels(merged);
      })
      .catch(console.error);
  }, [open, client?.userID]);

  useEffect(() => {
    if (!open) return;
    if (!search.trim() || search.length < 2) {
      setSearchUsers([]);
      return;
    }
    if (searchDebounceRef) clearTimeout(searchDebounceRef);
    const t = setTimeout(() => {
      fetch(`/api/search?type=users&q=${encodeURIComponent(search.trim())}&limit=20`)
        .then((r) => r.json())
        .then((data: { users?: { _id: string; fullName?: string; name?: string; profileImage?: string }[] }) => {
          const users = (data.users ?? []).filter((u: { _id: string }) => u._id !== currentUserId) as {
            _id: string;
            fullName?: string;
            name?: string;
            profileImage?: string;
          }[];
          setSearchUsers(
            users.map((u) => ({
              type: "user",
              userId: u._id,
              name: u.fullName ?? u.name ?? u._id,
              image: u.profileImage,
            }))
          );
        })
        .catch(() => setSearchUsers([]));
    }, 300);
    setSearchDebounceRef(t);
    return () => clearTimeout(t);
  }, [open, search, currentUserId, searchDebounceRef]);

  const channelRecipients: RecipientChannel[] = channels.map((ch) => ({
    type: "channel",
    channel: ch,
    id: ch.id ?? "",
    name: getChannelDisplayName(ch, currentUserId!),
    image: getChannelDisplayImage(ch, currentUserId!),
  }));

  const showSearchResults = search.trim().length >= 2;
  const recipients: Recipient[] = showSearchResults ? searchUsers : channelRecipients;

  const toggleSelected = useCallback((r: Recipient) => {
    const key = recipientKey(r);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const getChannelForRecipient = useCallback(
    async (r: Recipient): Promise<StreamChannel> => {
      if (!client?.userID) throw new Error("Not connected");
      if (r.type === "channel") return r.channel;
      const res = await fetch("/api/channels/ensure-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIdOrPhone: r.userId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start chat");
      const channel = client.channel("messaging", { members: [client.userID, data.streamUserId] });
      await channel.watch();
      return channel;
    },
    [client]
  );

  const selectedRecipients = recipients.filter((r) => selectedKeys.has(recipientKey(r)));
  const selectedCount = selectedRecipients.length;

  const sendStoryToChannel = useCallback(
    async (channel: StreamChannel) => {
      if (!story) return;
      const captionSnippet = story.caption?.slice(0, 200) ?? "";
      await channel.sendMessage({
        text: "",
        attachments: [
          {
            type: "story_share",
            statusId: story.statusId,
            thumb_url: story.mediaUrl,
            author_name: story.authorName,
            author_icon: story.authorImage ?? undefined,
            text: captionSnippet,
          } as Record<string, unknown>,
        ],
      });
    },
    [story]
  );

  const handleSend = useCallback(async () => {
    if (!story || !client?.userID || selectedCount === 0) return;
    setSending(true);
    let lastChannel: StreamChannel | null = null;
    try {
      for (const r of selectedRecipients) {
        const channel = await getChannelForRecipient(r);
        await sendStoryToChannel(channel);
        lastChannel = channel;
      }
      setSelectedKeys(new Set());
      onClose();
      if (lastChannel) {
        setActiveChannel?.(lastChannel);
        router.push(`/app/channel/${lastChannel.id}`);
      }
    } catch (e) {
      console.error("Story share failed", e);
    } finally {
      setSending(false);
    }
  }, [story, client?.userID, selectedCount, selectedRecipients, getChannelForRecipient, sendStoryToChannel, onClose, router, setActiveChannel]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setChannels([]);
      setSearchUsers([]);
      setSelectedKeys(new Set());
      setSending(false);
    }
  }, [open]);

  if (!open || !story) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" aria-hidden onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl" role="dialog" aria-modal aria-labelledby="story-share-sheet-title">
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2.5">
            <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-transparent border-0 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-0"
              aria-label="Search recipients"
            />
          </div>
          <button type="button" onClick={onClose} className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          {recipients.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              {showSearchResults ? "No users found. Try a different search." : "No chats available."}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {recipients.map((r) => {
                const key = recipientKey(r);
                const isSelected = selectedKeys.has(key);
                const name = r.name;
                const image = r.image;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleSelected(r)}
                    className={`flex flex-col items-center gap-2 p-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      isSelected ? "bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="relative">
                      <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 flex items-center justify-center">
                        {image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                            {(name || "?")[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs" aria-hidden>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-700 dark:text-gray-300 truncate w-full text-center">{name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedCount > 0 && (
          <div className="shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              type="button"
              onClick={handleSend}
              disabled={sending}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {sending ? "Sharing…" : `Share to ${selectedCount} ${selectedCount === 1 ? "chat" : "chats"}`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

