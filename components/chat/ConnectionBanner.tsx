"use client";

import React, { useEffect, useState } from "react";
import { useChatContext } from "stream-chat-react";

/**
 * Shows a banner when the Stream client is disconnected or reconnecting.
 * Listens to client "connection.changed" (payload: { online: boolean }).
 */
export function ConnectionBanner() {
  const { client } = useChatContext();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (!client) return;
    const handler = (event: { online?: boolean }) => {
      setOnline(event.online !== false);
    };
    client.on("connection.changed", handler);
    return () => {
      client.off("connection.changed", handler);
    };
  }, [client]);

  if (online) return null;

  return (
    <div
      className="shrink-0 px-3 py-2 text-center text-sm bg-[var(--ig-error)] text-white"
      role="status"
      aria-live="polite"
    >
      Connection lost. Reconnecting…
    </div>
  );
}
