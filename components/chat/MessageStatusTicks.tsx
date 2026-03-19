"use client";

import React from "react";
import { useChannelStateContext, useChatContext, useMessageContext } from "stream-chat-react";

/**
 * Per-message status:
 * - failed + retry for send failures
 * - sent/seen state on the latest outgoing message in 1:1 channels
 */
export function MessageStatusTicks() {
  const { message, isMyMessage, handleRetry } = useMessageContext();
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();

  if (!message || !isMyMessage?.()) return null;

  const isFailed = message.status === "failed" && (message as { errorStatusCode?: number }).errorStatusCode !== 403;
  if (isFailed) {
    return (
      <span className="str-chat__message-simple-status str-chat__message-status ml-1 inline-flex items-center gap-1.5 shrink-0">
        <span className="text-xs text-[var(--ig-error)]">Not delivered</span>
        <button
          type="button"
          onClick={() => handleRetry?.(message)}
          className="text-xs font-medium text-[var(--ig-text)] underline hover:no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-text)] rounded"
        >
          Retry
        </button>
      </span>
    );
  }

  const currentUserId = client?.userID ?? "";
  if (!currentUserId || !channel) return null;

  const members = channel.state?.members ?? {};
  const memberEntries = Object.values(members) as { user_id?: string; user?: { id?: string } }[];
  const otherUserIds = Array.from(
    new Set(
      memberEntries
        .map((m) => m.user?.id ?? m.user_id)
        .filter((id): id is string => !!id && id !== currentUserId)
    )
  );
  const isOneToOne = otherUserIds.length === 1;
  if (!isOneToOne) return null;

  const messages = Array.isArray(channel.state?.messages) ? channel.state.messages : [];
  let latestOwnMessageId: string | undefined;
  let latestOwnMessageTime = -1;
  for (const m of messages) {
    const senderId = (m.user as { id?: string } | undefined)?.id ?? m.user_id;
    if (senderId !== currentUserId) continue;
    const created = m.created_at ? new Date(m.created_at).getTime() : -1;
    const updated = (m as { updated_at?: string | Date }).updated_at ? new Date((m as { updated_at?: string | Date }).updated_at as string | Date).getTime() : -1;
    const ts = created >= 0 ? created : updated;
    if (ts >= latestOwnMessageTime) {
      latestOwnMessageTime = ts;
      latestOwnMessageId = m.id;
    }
  }

  if (!latestOwnMessageId || message.id !== latestOwnMessageId) return null;

  const otherUserId = otherUserIds[0];
  const otherLastRead = (channel.state as { read?: Record<string, { last_read?: string }> }).read?.[otherUserId]?.last_read;
  const messageCreatedAt = message.created_at ? new Date(message.created_at).getTime() : null;
  const isSeen =
    !!otherLastRead &&
    messageCreatedAt != null &&
    !Number.isNaN(messageCreatedAt) &&
    messageCreatedAt <= new Date(otherLastRead).getTime();

  return (
    <span className="str-chat__message-simple-status str-chat__message-status ml-1 inline-flex items-center gap-1.5 shrink-0">
      <span
        className={`inline-block rounded-sm shrink-0 ${isSeen ? "bg-[var(--ig-status-read)]" : "bg-[var(--ig-status-sent)]"}`}
        style={{ width: 8, height: 8 }}
        title={isSeen ? "Seen" : "Sent"}
      />
      <span className="text-xs text-[var(--ig-text-secondary)]">{isSeen ? "Seen" : "Sent"}</span>
    </span>
  );
}
