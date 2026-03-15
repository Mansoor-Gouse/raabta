"use client";

import React from "react";
import { useChannelStateContext } from "stream-chat-react";
import { useOfflineQueue } from "./OfflineQueueContext";

/**
 * Renders pending (queued) messages for the current channel at the bottom of the message list.
 */
export function OfflinePendingMessages() {
  const { channel } = useChannelStateContext();
  const { pending } = useOfflineQueue();

  const cid = channel?.cid;
  const forChannel = !cid ? [] : pending.filter((p) => p.cid === cid);

  if (forChannel.length === 0) return null;

  return (
    <div className="px-3 py-1 flex flex-col gap-1">
      {forChannel.map((item) => {
        const text = (item.message?.text as string) || "";
        return (
          <div
            key={item.id}
            className={`flex justify-end`}
          >
            <div
              className="max-w-[85%] rounded-2xl px-3 py-2 bg-[var(--ig-border-light)] text-[var(--ig-text)] text-sm"
              role="status"
              aria-label="Message pending"
            >
              {text || "…"}
              <span className="block text-[10px] text-[var(--ig-text-tertiary)] mt-0.5">Sending when online…</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
