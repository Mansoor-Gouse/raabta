"use client";

import { useEffect, useRef } from "react";
import { useChannelStateContext, useChannelActionContext } from "stream-chat-react";

const DELAYS_MS = [1000, 2000, 4000, 8000];

type PendingEntry = { attemptIndex: number; timeoutId: ReturnType<typeof setTimeout> };

/**
 * Schedules automatic retries with exponential backoff for failed messages.
 * Does not auto-retry 403. Renders nothing.
 */
export function FailedMessageAutoRetry() {
  const { channel } = useChannelStateContext();
  const { retrySendMessage } = useChannelActionContext();
  const mapRef = useRef<Map<string, PendingEntry>>(new Map());
  const channelRef = useRef(channel);
  const retrySendMessageRef = useRef(retrySendMessage);
  channelRef.current = channel;
  retrySendMessageRef.current = retrySendMessage;

  useEffect(() => {
    const messages = channel?.state?.messages;
    if (!channel || !Array.isArray(messages)) return;

    const failed = messages.filter(
      (m) =>
        m &&
        typeof m === "object" &&
        (m as { status?: string }).status === "failed" &&
        (m as { errorStatusCode?: number }).errorStatusCode !== 403
    );
    const failedIds = new Set(failed.map((m) => (m as { id?: string }).id).filter(Boolean) as string[]);

    const map = mapRef.current;

    for (const [id, entry] of Array.from(map.entries())) {
      if (!failedIds.has(id)) {
        clearTimeout(entry.timeoutId);
        map.delete(id);
      }
    }

    const schedule = (messageId: string, attemptIndex: number) => {
      const delay = DELAYS_MS[attemptIndex] ?? DELAYS_MS[DELAYS_MS.length - 1];
      const timeoutId = setTimeout(() => {
        const ch = channelRef.current;
        const retry = retrySendMessageRef.current;
        const msg = ch?.state?.messages?.find((m: { id?: string }) => (m as { id?: string }).id === messageId);
        if (!msg || !retry) {
          mapRef.current.delete(messageId);
          return;
        }
        retry(msg as Parameters<typeof retry>[0]);
        const entry = mapRef.current.get(messageId);
        if (!entry) return;
        const nextAttempt = entry.attemptIndex + 1;
        mapRef.current.delete(messageId);
        if (nextAttempt < DELAYS_MS.length) {
          schedule(messageId, nextAttempt);
        }
      }, delay);
      map.set(messageId, { attemptIndex, timeoutId });
    };

    for (const id of failedIds) {
      if (!map.has(id)) {
        schedule(id, 0);
      }
    }
  }, [channel, channel?.state?.messages]);

  useEffect(() => {
    return () => {
      const map = mapRef.current;
      for (const entry of map.values()) {
        clearTimeout(entry.timeoutId);
      }
      map.clear();
    };
  }, []);

  return null;
}
