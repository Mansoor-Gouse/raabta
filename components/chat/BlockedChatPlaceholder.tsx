"use client";

import Link from "next/link";

export function BlockedChatPlaceholder() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--ig-bg-primary)] text-center">
      <p className="text-[var(--ig-text)] font-medium mb-1">You blocked this person</p>
      <p className="text-sm text-[var(--ig-text-secondary)] mb-4 max-w-[280px]">
        You can’t send or receive messages in this chat. Unblock them in Settings to continue the conversation.
      </p>
      <Link
        href="/app/settings"
        className="px-4 py-2.5 rounded-lg bg-[var(--ig-text)] text-[var(--ig-bg-primary)] text-sm font-medium hover:opacity-90"
      >
        Go to Settings → Blocked
      </Link>
    </div>
  );
}
