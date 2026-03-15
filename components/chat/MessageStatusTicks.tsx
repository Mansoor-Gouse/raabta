"use client";

import React from "react";
import { useChannelStateContext, useChatContext, useMessageContext } from "stream-chat-react";

/**
 * Per-message delivery/read status: square indicators (different colors for sent vs read) for 1:1,
 * or failed state + retry for failed messages.
 */
export function MessageStatusTicks() {
  const { message, isMyMessage, readBy, handleRetry } = useMessageContext();
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();

  if (!message || !isMyMessage?.() || message.type === "error") return null;

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

  const members = channel?.state?.members ?? {};
  const memberIds = Object.keys(members);
  const isOneToOne = memberIds.length === 2;
  const currentUserId = client?.userID;
  const otherMemberId = currentUserId ? memberIds.find((id) => id !== currentUserId) : undefined;

  if (!isOneToOne || !otherMemberId) return null;

  let isRead = false;
  const readByOthers = (readBy ?? []).filter((r: { id?: string }) => r?.id && r.id !== currentUserId);
  if (readByOthers.length > 0) {
    isRead = true;
  } else {
    const readState = (channel?.state as { read?: Record<string, { last_read?: string }> })?.read ?? {};
    const otherRead = readState[otherMemberId];
    const lastReadDate = otherRead?.last_read ? new Date(otherRead.last_read) : null;
    const msgDate = message?.created_at != null ? new Date(message.created_at as string | Date) : null;
    if (lastReadDate && msgDate && msgDate <= lastReadDate) isRead = true;
  }

  return (
    <span
      className="str-chat__message-simple-status str-chat__message-status ml-1.5 inline-flex items-center justify-center shrink-0 self-end"
      style={{ minHeight: 16 }}
      aria-label={isRead ? "Read" : "Sent"}
    >
      <span
        className={`inline-block rounded-sm shrink-0 ${isRead ? "bg-[var(--ig-status-read)]" : "bg-[var(--ig-status-sent)]"}`}
        style={{ width: 10, height: 10 }}
        title={isRead ? "Read" : "Sent"}
      />
    </span>
  );
}
