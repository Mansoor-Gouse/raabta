"use client";

import { useMemo, type ReactNode } from "react";
import { ChannelStateProvider, useChannelStateContext } from "stream-chat-react";

/**
 * Filters out undefined/null messages and messages without created_at so that
 * Stream SDK internals (processMessages, insertIntro, getGroupStyles, etc.) never
 * see invalid entries and throw "Cannot read properties of undefined (reading 'created_at')".
 */
function filterMessages<T extends { created_at?: unknown }>(list: T[] | undefined): T[] {
  if (!Array.isArray(list)) return [];
  return list.filter(
    (m): m is T =>
      m != null && typeof m === "object" && (m as T).created_at != null
  );
}

export function FilteredChannelStateWrapper({ children }: { children: ReactNode }) {
  const value = useChannelStateContext();
  const filtered = useMemo(
    () => ({
      ...value,
      messages: filterMessages(value.messages),
      threadMessages: value.thread
        ? filterMessages(value.threadMessages)
        : value.threadMessages,
      pinnedMessages: filterMessages(value.pinnedMessages),
    }),
    [value]
  );
  return <ChannelStateProvider value={filtered}>{children}</ChannelStateProvider>;
}
