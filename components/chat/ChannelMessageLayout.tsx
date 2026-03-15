"use client";

import { useRef, useEffect, useCallback } from "react";
import { MessageList, MessageInput, useChannelActionContext, useChannelStateContext, useChatContext } from "stream-chat-react";
import { PinnedMessagesBar } from "./PinnedMessagesBar";
import { useViewOnce } from "./ViewOnceContext";

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

  useEffect(() => {
    if (channel) markRead?.();
  }, [channel, markRead]);
  const memberCount = channel?.state?.members ? Object.keys(channel.state.members).length : 0;
  const isOneToOne = memberCount === 2;

  const currentUserId = client?.userID;
  const otherMemberId =
    isOneToOne && currentUserId
      ? Object.keys(channel?.state?.members || {}).find((id) => id !== currentUserId)
      : undefined;

  // Use messages from context (FilteredChannelStateWrapper ensures they're safe for SDK)
  const messages = channel?.state?.messages ?? [];
  type MsgEl = (typeof messages)[number];
  const safeMessages = messages.filter(
    (m: MsgEl): m is MsgEl & { created_at: unknown } =>
      m != null && typeof m === "object" && (m as { created_at?: unknown }).created_at != null
  );
  const readState = (channel?.state as any)?.read || {};
  const otherRead = otherMemberId ? readState[otherMemberId] : undefined;
  const lastReadDate = otherRead?.last_read ? new Date(otherRead.last_read) : null;

  let hasSeenLastOutgoing = false;
  if (lastReadDate && currentUserId && safeMessages.length) {
    const lastOutgoingRead = [...safeMessages]
      .reverse()
      .find((m) => {
        if (!m) return false;
        const createdAt = m.created_at != null ? new Date(m.created_at as string | Date) : null;
        return m.user?.id === currentUserId && createdAt && createdAt <= lastReadDate;
      });

    if (lastOutgoingRead && safeMessages.length > 0) {
      const lastMsg = safeMessages[safeMessages.length - 1];
      hasSeenLastOutgoing = lastMsg && lastOutgoingRead.id === lastMsg.id;
    }
  }

  const { viewOnce, setViewOnce } = useViewOnce();
  const overrideSubmitHandler = useCallback(
    (message: Record<string, unknown>, _channelCid: string, customMessageData?: Record<string, unknown>, options?: Record<string, unknown>) => {
      if (!channel) return;
      const customData = {
        ...((customMessageData as Record<string, unknown> | undefined)?.customData as Record<string, unknown> | undefined),
        ...(viewOnce ? { view_once: true } : {}),
      };
      void channel.sendMessage(
        message as Parameters<typeof channel.sendMessage>[0],
        { ...customMessageData, customData } as Parameters<typeof channel.sendMessage>[1],
        options as Parameters<typeof channel.sendMessage>[2]
      );
      setViewOnce(false);
    },
    [channel, viewOnce, setViewOnce]
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
      <div className="channel-message-list flex-1 min-h-0 flex flex-col">
        <PinnedMessagesBar />
        <div className="flex-1 min-h-0 overflow-auto">
          <MessageList
            head={<></>}
            headerPosition={-1}
            messages={safeMessages}
            disableDateSeparator
            hideNewMessageSeparator
          />
          {isOneToOne && hasSeenLastOutgoing && (
            <div className="px-3 pb-1 text-right text-xs text-[var(--ig-text-secondary)]">Seen</div>
          )}
        </div>
      </div>
      <div
        ref={inputWrapRef}
        className="channel-message-input-wrap border-t border-[var(--ig-border)] bg-[var(--ig-bg-primary)] shrink-0"
      >
        <MessageInput overrideSubmitHandler={overrideSubmitHandler} />
      </div>
    </div>
  );
}
