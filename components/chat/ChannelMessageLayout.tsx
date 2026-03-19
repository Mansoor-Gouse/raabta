"use client";

import { useRef, useEffect, useCallback, useMemo } from "react";
import {
  MessageList,
  MessageInput,
  TypingIndicator,
  useChannelActionContext,
  useChannelStateContext,
  useChatContext,
} from "stream-chat-react";
import { PinnedMessagesBar } from "./PinnedMessagesBar";
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
  const messageActions = ["reply", "react", "edit", "delete", "markUnread", "pin", "quote", "flag", "mute"] as const;
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
              .map((m) => m.user?.id ?? m.user_id)
              .filter((id): id is string => !!id && id !== currentUserId)
          )
        );
  const isOneToOne = otherUserIds.length === 1;
  const otherMemberId = isOneToOne ? otherUserIds[0] : undefined;

  // Defensive: keep two message lists:
  // - safeMessages: filtered to prevent SDK crashes when created_at is missing
  // - indicatorMessages: used only for UI calculations (sent/seen) and can tolerate missing timestamps
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
  const indicatorMessages = useMemo(
    () => rawMessages.filter((m: MsgEl): m is NonNullable<MsgEl> => m != null),
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

  const overrideSubmitHandler = useCallback(
    (message: Record<string, unknown>, _channelCid: string, customMessageData?: Record<string, unknown>, options?: Record<string, unknown>) => {
      if (!channel) return;
      const customData = {
        ...((customMessageData as Record<string, unknown> | undefined)?.customData as Record<string, unknown> | undefined),
      };
      const payload = { ...customMessageData, customData };
      if (!isOnline) {
        enqueue({
          cid: channel.cid ?? "",
          message,
          customMessageData: payload,
          options,
        });
        return;
      }
      void channel.sendMessage(
        message as Parameters<typeof channel.sendMessage>[0],
        payload as Parameters<typeof channel.sendMessage>[1],
        options as Parameters<typeof channel.sendMessage>[2]
      );
    },
    [channel, isOnline, enqueue]
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

  const customMessageActions = useMemo(
    () => ({
      Forward: (message: { id?: string; text?: string; user?: { id?: string } }) => {
        if (typeof window === "undefined") return;
        window.dispatchEvent(
          new CustomEvent("chat-forward-request", {
            detail: {
              messageId: message?.id,
              text: message?.text ?? "",
              senderId: message?.user?.id,
              sourceChannelId: channel?.id ?? "",
            },
          })
        );
      },
      "Star message": async (message: { id?: string; text?: string; user?: { id?: string; name?: string } }) => {
        if (!message?.id || !channel?.id) return;
        const res = await fetch("/api/me/starred-messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messageId: message.id,
            channelId: channel.id,
            channelType: channel.type === "team" ? "team" : "messaging",
            senderId: message.user?.id,
            senderName: message.user?.name,
            textPreview: message.text ?? "",
          }),
        });
        if (!res.ok) {
          console.warn("[starred] failed to star message", {
            messageId: message.id,
            channelId: channel.id,
            status: res.status,
          });
        } else {
          console.info("[starred] message starred", {
            messageId: message.id,
            channelId: channel.id,
          });
        }
      },
      "Unstar message": async (message: { id?: string }) => {
        if (!message?.id || !channel?.id) return;
        const res = await fetch(`/api/me/starred-messages/${encodeURIComponent(message.id)}?channelId=${encodeURIComponent(channel.id)}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          console.warn("[starred] failed to unstar message", {
            messageId: message.id,
            channelId: channel.id,
            status: res.status,
          });
        } else {
          console.info("[starred] message unstarred", {
            messageId: message.id,
            channelId: channel.id,
          });
        }
      },
    }),
    [channel?.id]
  );

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
            messageActions={[...messageActions]}
            customMessageActions={customMessageActions}
            messages={safeMessages}
            disableDateSeparator
            hideNewMessageSeparator
            reviewProcessedMessage={reviewProcessedMessage}
          />
          <OfflinePendingMessages />
        </div>
      </div>
      <div className="px-3 pb-1 shrink-0 text-xs text-[var(--ig-text-secondary)]">
        <TypingIndicator />
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
