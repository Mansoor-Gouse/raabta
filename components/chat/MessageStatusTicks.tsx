"use client";

import React from "react";
import { useChannelStateContext, useChatContext, useMessageContext } from "stream-chat-react";

/**
 * Per-message delivery/read status: ticks for 1:1, or failed state + retry for failed messages.
 */
export function MessageStatusTicks() {
  const { message, isMyMessage, readBy, handleRetry } = useMessageContext();
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();

  if (!isMyMessage?.() || message.type === "error") return null;

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
    const msgDate = message.created_at ? new Date(message.created_at as string | Date) : null;
    if (lastReadDate && msgDate && msgDate <= lastReadDate) isRead = true;
  }

  return (
    <span
      className="str-chat__message-simple-status str-chat__message-status ml-1 inline-flex items-center shrink-0"
      aria-label={isRead ? "Read" : "Sent"}
    >
      {isRead ? (
        <TwoTicksRead className="w-4 h-4 text-[var(--ig-text)]" />
      ) : (
        <OneTickSent className="w-4 h-4 text-[var(--ig-text-tertiary)]" />
      )}
    </span>
  );
}

function OneTickSent({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 6l4 4 9-9" />
    </svg>
  );
}

function TwoTicksRead({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M1 6l4 4 4-4" />
      <path d="M7 6l4 4 8-8" />
    </svg>
  );
}
