"use client";

import { useChannelActionContext, useChannelStateContext } from "stream-chat-react";

/**
 * Shows a compact bar above the message list when the channel has pinned messages.
 * Clicking jumps to that message in the list.
 */
export function PinnedMessagesBar() {
  const { pinnedMessages } = useChannelStateContext();
  const { jumpToMessage } = useChannelActionContext();

  if (!pinnedMessages?.length) return null;

  // Show the most recently pinned (first in list per Stream convention)
  const latest = pinnedMessages[0];
  const text =
    (latest as { text?: string })?.text?.slice(0, 60) ||
    "Pinned message";
  const snippet = text.length >= 60 ? `${text}…` : text;
  const messageId = (latest as { id?: string })?.id;
  if (!messageId) return null;

  return (
    <button
      type="button"
      onClick={() => jumpToMessage(messageId)}
      className="w-full text-left shrink-0 px-3 py-2 flex items-center gap-2 bg-[var(--ig-border-light)] border-b border-[var(--ig-border)] text-sm text-[var(--ig-text)] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-text)]"
      aria-label="Jump to pinned message"
    >
      <PinIcon />
      <span className="flex-1 min-w-0 truncate">{snippet}</span>
      <span className="text-xs text-[var(--ig-text-secondary)] shrink-0">
        View
      </span>
    </button>
  );
}

function PinIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0 text-[var(--ig-text-secondary)]"
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
    </svg>
  );
}
