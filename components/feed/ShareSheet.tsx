"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useChatContext } from "stream-chat-react";
import type { Channel as StreamChannel } from "stream-chat";

export type ShareSheetPost = {
  _id: string;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  mediaUrls: string[];
  caption?: string;
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

type RecipientChannel = { type: "channel"; channel: StreamChannel; id: string; name: string; image?: string };
type RecipientUser = { type: "user"; userId: string; name: string; image?: string };
type Recipient = RecipientChannel | RecipientUser;

function recipientKey(r: Recipient): string {
  return r.type === "channel" ? `channel:${r.id}` : `user:${r.userId}`;
}

export function ShareSheet({
  open,
  onClose,
  post,
}: {
  open: boolean;
  onClose: () => void;
  post: ShareSheetPost | null;
}) {
  const router = useRouter();
  const { client, setActiveChannel } = useChatContext();
  const [search, setSearch] = useState("");
  const [channels, setChannels] = useState<StreamChannel[]>([]);
  const [searchUsers, setSearchUsers] = useState<RecipientUser[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentUserId = client?.userID ?? null;

  useEffect(() => {
    if (!open || !client?.userID) return;
    const filters = {
      type: "messaging" as const,
      members: { $in: [client.userID] },
      archived: false,
    };
    client
      .queryChannels(filters, [{ last_message_at: -1 }], { limit: 30 })
      .then(setChannels)
      .catch(console.error);
  }, [open, client?.userID]);

  useEffect(() => {
    if (!search.trim() || search.length < 2) {
      setSearchUsers([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      fetch(`/api/search?type=users&q=${encodeURIComponent(search.trim())}&limit=20`)
        .then((r) => r.json())
        .then((data: { users?: { _id: string; fullName?: string; name?: string; profileImage?: string }[] }) => {
          const users = (data.users ?? []).filter(
            (u: { _id: string }) => u._id !== currentUserId
          ) as { _id: string; fullName?: string; name?: string; profileImage?: string }[];
          setSearchUsers(
            users.map((u) => ({
              type: "user" as const,
              userId: u._id,
              name: u.fullName ?? u.name ?? u._id,
              image: u.profileImage,
            }))
          );
        })
        .catch(() => setSearchUsers([]));
      searchDebounceRef.current = null;
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [search, currentUserId]);

  const channelRecipients: RecipientChannel[] = channels
    .map((ch): RecipientChannel | null => {
      const other = getOtherMember(ch, currentUserId!);
      if (!other || other.id === currentUserId) return null;
      return {
        type: "channel" as const,
        channel: ch,
        id: ch.id ?? "",
        name: other.name ?? other.id ?? "Chat",
        image: other.image,
      };
    })
    .filter((r): r is RecipientChannel => r !== null);

  const showSearchResults = search.trim().length >= 2;
  const recipients: Recipient[] = showSearchResults
    ? searchUsers
    : channelRecipients;

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
      const channel = client.channel("messaging", {
        members: [client.userID, data.streamUserId],
      });
      await channel.watch();
      return channel;
    },
    [client]
  );

  const sendPostToChannel = useCallback(
    async (channel: StreamChannel) => {
      if (!post) return;
      const thumbUrl = post.mediaUrls?.[0] ?? "";
      const captionSnippet = post.caption?.slice(0, 200) ?? "";
      await channel.sendMessage({
        text: "",
        attachments: [
          {
            type: "post_share",
            postId: post._id,
            thumb_url: thumbUrl,
            author_name: post.authorName,
            author_icon: post.authorImage ?? undefined,
            text: captionSnippet,
          } as Record<string, unknown>,
        ],
      });
    },
    [post]
  );

  const selectedRecipients = recipients.filter((r) => selectedKeys.has(recipientKey(r)));
  const selectedCount = selectedRecipients.length;

  const handleSendToSelected = useCallback(async () => {
    if (!post || !client?.userID || selectedCount === 0) return;
    setSending(true);
    let lastChannel: StreamChannel | null = null;
    try {
      for (const r of selectedRecipients) {
        const channel = await getChannelForRecipient(r);
        await sendPostToChannel(channel);
        lastChannel = channel;
      }
      setSelectedKeys(new Set());
      onClose();
      if (lastChannel) {
        setActiveChannel?.(lastChannel);
        router.push(`/app/channel/${lastChannel.id}`);
      }
    } catch (err) {
      console.error("Share send error", err);
    } finally {
      setSending(false);
    }
  }, [post, client, selectedCount, selectedRecipients, getChannelForRecipient, sendPostToChannel, setActiveChannel, onClose, router]);

  const handleCopyLink = useCallback(() => {
    if (!post) return;
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/app/feed/${post._id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }, [post]);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setSearchUsers([]);
      setSelectedKeys(new Set());
    }
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-40"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl"
        role="dialog"
        aria-modal
        aria-labelledby="share-sheet-title"
      >
        <div className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 flex items-center gap-2 rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2.5">
            <svg
              className="w-5 h-5 text-gray-400 shrink-0"
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
              id="share-search"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-0 bg-transparent border-0 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-0"
              aria-label="Search recipients"
            />
          </div>
          <button
            type="button"
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Create group"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              <path d="M18 10h2v2h-2v-2zm0-4h2v2h-2V6zm0 8h2v2h-2v-2z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          {recipients.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              {showSearchResults
                ? "No users found. Try a different search."
                : "Search for someone to share with or start a chat from Chats to see contacts here."}
            </p>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
            {recipients.map((r) => {
              const key = recipientKey(r);
              const id = r.type === "channel" ? r.id : r.userId;
              const name = r.name;
              const image = r.type === "channel" ? r.image : r.image;
              const isSelected = selectedKeys.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleSelected(r)}
                  className={`flex flex-col items-center gap-2 p-2 rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500"
                      : "hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 flex items-center justify-center">
                      {image ? (
                        <img
                          src={image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">
                          {(name || "?")[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs"
                        aria-hidden
                      >
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate w-full text-center">
                    {name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedCount > 0 && (
          <div className="shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              type="button"
              onClick={handleSendToSelected}
              disabled={sending}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {sending ? "Sending…" : `Send to ${selectedCount} ${selectedCount === 1 ? "chat" : "chats"}`}
            </button>
          </div>
        )}

        <div className="shrink-0 flex flex-col gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Or share via</p>
          <div className="flex items-center justify-start gap-4 overflow-x-auto">
            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 flex flex-col items-center gap-1"
              aria-label="Copy link"
            >
              <div className="w-12 h-12 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Copy link</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 flex flex-col items-center gap-1"
              aria-label="Copy link for WhatsApp"
            >
              <div className="w-12 h-12 rounded-full bg-[#25D366] flex items-center justify-center text-white">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.865 9.865 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">WhatsApp</span>
            </button>
            <button
              type="button"
              className="shrink-0 flex flex-col items-center gap-1"
              aria-label="Add to story"
            >
              <div className="w-12 h-12 rounded-full border border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Story</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 flex flex-col items-center gap-1"
              aria-label="Copy link for SMS"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
                </svg>
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">SMS</span>
            </button>
          </div>
          {copySuccess && (
            <p className="text-sm text-green-600 dark:text-green-400" role="status">Link copied to clipboard</p>
          )}
        </div>
      </div>
    </>
  );
}
