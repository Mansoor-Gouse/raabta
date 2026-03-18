"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import { MessageList, MessageInput, useChannelActionContext, useChannelStateContext, useChatContext } from "stream-chat-react";
import { PinnedMessagesBar } from "./PinnedMessagesBar";
import { useViewOnce } from "./ViewOnceContext";
import { getDraft } from "@/lib/draftStorage";
import { FailedMessageAutoRetry } from "./FailedMessageAutoRetry";
import { useConnectionState } from "./ConnectionStateContext";
import { useOfflineQueue } from "./OfflineQueueContext";
import { OfflinePendingMessages } from "./OfflinePendingMessages";

/**
 * Wraps MessageList + MessageInput so that on mobile:
 * - Message list scrolls in the middle; input is fixed at bottom.
 * - When user focuses the input, we scroll it into view so the keyboard doesn't cover it.
 * - In 1:1 channels, avatars are hidden via data-dm for a cleaner look.
 */
export function ChannelMessageLayout() {
  const inputWrapRef = useRef<HTMLDivElement>(null);
  const { channel } = useChannelStateContext();
  const { markRead } = useChannelActionContext();
  const { client } = useChatContext();
  const { isOnline } = useConnectionState();
  const { enqueue } = useOfflineQueue();

  useEffect(() => {
    if (channel) markRead?.();
  }, [channel, markRead]);
  const currentUserId = client?.userID ?? null;
  const members = channel?.state?.members ?? {};
  const memberEntries = Object.values(members) as { user_id?: string; user?: { id?: string } }[];
  // Derive distinct other user IDs from membership, ignoring entries without a real user id.
  const otherUserIds =
    currentUserId == null
      ? []
      : Array.from(
          new Set(
            memberEntries
              .map((m) => m.user_id ?? m.user?.id)
              .filter((id): id is string => !!id && id !== currentUserId)
          )
        );
  const isOneToOne = otherUserIds.length === 1;
  const otherMemberId = isOneToOne ? otherUserIds[0] : undefined;

  // Defensive: only pass messages that have created_at so SDK never throws on message.created_at
  const rawMessages = Array.isArray(channel?.state?.messages) ? channel.state.messages : [];
  type MsgEl = (typeof rawMessages)[number];
  const safeMessages = useMemo(
    () =>
      rawMessages.filter(
        (m: MsgEl): m is MsgEl & { created_at: unknown } =>
          m != null && typeof m === "object" && (m as { created_at?: unknown }).created_at != null
      ),
    [rawMessages]
  );

  const reviewProcessedMessage = useCallback(
    (params: {
      changes: Array<{ created_at?: unknown; customType?: string }>;
      index: number;
      messages: unknown[];
      processedMessages: unknown[];
    }) => {
      return params.changes.filter(
        (c) =>
          c != null &&
          typeof c === "object" &&
          (c.customType === "date" || (c as { created_at?: unknown }).created_at != null)
      );
    },
    []
  );
  const readState = (channel?.state as any)?.read || {};
  const otherRead = otherMemberId ? readState[otherMemberId] : undefined;
  const lastReadDate = otherRead?.last_read ? new Date(otherRead.last_read) : null;

  const lastMessageFromMe = useMemo(() => {
    if (!currentUserId || safeMessages.length === 0) return null;
    let best: (typeof safeMessages)[number] | null = null;
    let bestTime = -1;
    for (const m of safeMessages) {
      if (!m) continue;
      const senderId = (m.user as { id?: string } | undefined)?.id ?? (m as { user_id?: string }).user_id;
      if (senderId !== currentUserId) continue;
      const t = m.created_at != null ? new Date(m.created_at as string | Date).getTime() : -1;
      if (t >= bestTime) {
        bestTime = t;
        best = m;
      }
    }
    return best;
  }, [safeMessages, currentUserId]);

  const lastFromMeIsRead = Boolean(
    lastMessageFromMe &&
      lastReadDate &&
      lastMessageFromMe.created_at != null &&
      new Date(lastMessageFromMe.created_at as string | Date) <= lastReadDate
  );

  const { viewOnce, setViewOnce } = useViewOnce();
  const overrideSubmitHandler = useCallback(
    (message: Record<string, unknown>, _channelCid: string, customMessageData?: Record<string, unknown>, options?: Record<string, unknown>) => {
      if (!channel) return;
      const customData = {
        ...((customMessageData as Record<string, unknown> | undefined)?.customData as Record<string, unknown> | undefined),
        ...(viewOnce ? { view_once: true } : {}),
      };
      const payload = { ...customMessageData, customData };
      if (!isOnline) {
        enqueue({
          cid: channel.cid ?? "",
          message,
          customMessageData: payload,
          options,
        });
        setViewOnce(false);
        return;
      }
      void channel.sendMessage(
        message as Parameters<typeof channel.sendMessage>[0],
        payload as Parameters<typeof channel.sendMessage>[1],
        options as Parameters<typeof channel.sendMessage>[2]
      );
      setViewOnce(false);
    },
    [channel, viewOnce, setViewOnce, isOnline, enqueue]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const wrap = inputWrapRef.current;
    if (!wrap) return;
    const input = wrap.querySelector(
      "textarea, [contenteditable=true], input[type=text]"
    ) as HTMLElement | null;
    if (!input) return;

    const scrollInputIntoView = () => {
      requestAnimationFrame(() => {
        input.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    };

    input.addEventListener("focus", scrollInputIntoView);
    return () => input.removeEventListener("focus", scrollInputIntoView);
  }, []);

  return (
    <div
      className="channel-message-root flex flex-1 flex-col min-h-0"
      data-dm={isOneToOne ? "true" : undefined}
    >
      <FailedMessageAutoRetry />
      <div className="channel-message-list flex-1 min-h-0 flex flex-col">
        <PinnedMessagesBar />
        <div className="flex-1 min-h-0 overflow-auto pt-2">
          <MessageList
            head={<></>}
            headerPosition={0}
            messages={safeMessages}
            disableDateSeparator
            hideNewMessageSeparator
            reviewProcessedMessage={reviewProcessedMessage}
          />
          {isOneToOne && lastMessageFromMe && (
            <div className="px-3 pb-1 flex items-center justify-end gap-1.5" aria-label={lastFromMeIsRead ? "Read" : "Sent"}>
              <span
                className={`inline-block rounded-sm shrink-0 ${lastFromMeIsRead ? "bg-[var(--ig-status-read)]" : "bg-[var(--ig-status-sent)]"}`}
                style={{ width: 10, height: 10 }}
                title={lastFromMeIsRead ? "Read" : "Sent"}
              />
              {lastFromMeIsRead && <span className="text-xs text-[var(--ig-text-secondary)]">Seen</span>}
            </div>
          )}
          <OfflinePendingMessages />
        </div>
      </div>
      <div
        ref={inputWrapRef}
        className="channel-message-input-wrap border-t border-[var(--ig-border)] bg-[var(--ig-bg-primary)] shrink-0"
      >
        <MessageInput
          getDefaultValue={() => getDraft(channel?.cid ?? "")}
          overrideSubmitHandler={overrideSubmitHandler}
        />
      </div>
    </div>
  );
}
