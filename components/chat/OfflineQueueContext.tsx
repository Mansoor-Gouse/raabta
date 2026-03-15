"use client";

import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useChatContext } from "stream-chat-react";
import { useConnectionState } from "./ConnectionStateContext";
import {
  getPendingSends,
  setPendingSends,
  enqueue as persistEnqueue,
  parseCid,
  type QueuedItem,
} from "@/lib/offlineSendQueue";

type OfflineQueueContextValue = {
  pending: QueuedItem[];
  enqueue: (item: Omit<QueuedItem, "id"> & { id?: string }) => void;
};

const OfflineQueueContext = createContext<OfflineQueueContextValue | null>(null);

export function useOfflineQueue(): OfflineQueueContextValue {
  const ctx = useContext(OfflineQueueContext);
  return (
    ctx ?? {
      pending: [],
      enqueue: () => {},
    }
  );
}

export function OfflineQueueProvider({ children }: { children: ReactNode }) {
  const { client } = useChatContext();
  const { isOnline } = useConnectionState();
  const [pending, setPending] = useState<QueuedItem[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPending(getPendingSends());
  }, []);

  const enqueue = useCallback((item: Omit<QueuedItem, "id"> & { id?: string }) => {
    const id = item.id ?? `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const full: QueuedItem = { ...item, id };
    persistEnqueue(full);
    setPending((prev) => {
      const next = [...prev, full];
      if (next.length > 50) next.splice(0, next.length - 50);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!client?.userID || !isOnline || pending.length === 0) return;

    let cancelled = false;
    const run = async () => {
      const list = getPendingSends();
      let remaining = [...list];
      for (const item of list) {
        if (cancelled) break;
        const parsed = parseCid(item.cid);
        if (!parsed) {
          remaining = remaining.filter((r) => r.id !== item.id);
          setPendingSends(remaining);
          setPending(remaining);
          continue;
        }
        try {
          const channel = client.channel(parsed.type, parsed.id);
          await channel.sendMessage(
            item.message as Parameters<typeof channel.sendMessage>[0],
            item.customMessageData as Parameters<typeof channel.sendMessage>[1],
            item.options as Parameters<typeof channel.sendMessage>[2]
          );
          remaining = remaining.filter((r) => r.id !== item.id);
          setPendingSends(remaining);
          setPending(remaining);
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode ?? (err as { response?: { status?: number } })?.response?.status;
          if (status === 403) {
            remaining = remaining.filter((r) => r.id !== item.id);
            setPendingSends(remaining);
            setPending(remaining);
          }
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [client, isOnline, pending.length]);

  return (
    <OfflineQueueContext.Provider value={{ pending, enqueue }}>
      {children}
    </OfflineQueueContext.Provider>
  );
}
