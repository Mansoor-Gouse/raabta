"use client";

import React from "react";

type EmptyStateIndicatorProps = {
  listType?: "channel" | "message" | "thread";
};

/**
 * Shown when the message list is empty. Uses --ig-* variables for theme consistency.
 */
export function EmptyChannelState({ listType }: EmptyStateIndicatorProps) {
  if (listType === "thread") {
    return (
      <div className="flex flex-1 items-center justify-center py-8 px-4">
        <p className="text-sm text-[var(--ig-text-secondary)]">No replies yet</p>
      </div>
    );
  }
  if (listType === "message") {
    return (
      <div className="flex flex-1 items-center justify-center py-12 px-4">
        <p className="text-sm text-[var(--ig-text-secondary)]">Send a message to get started</p>
      </div>
    );
  }
  return (
    <div className="flex flex-1 items-center justify-center py-8 px-4">
      <p className="text-sm text-[var(--ig-text-secondary)]">No channels yet</p>
    </div>
  );
}
