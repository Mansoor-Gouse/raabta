"use client";

import React from "react";
import { useMessageContext } from "stream-chat-react";

/**
 * Per-message: only shows failed state + retry. Read/sent square is shown once at end of list (Teams-style) in ChannelMessageLayout.
 */
export function MessageStatusTicks() {
  const { message, isMyMessage, handleRetry } = useMessageContext();

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

  return null;
}
