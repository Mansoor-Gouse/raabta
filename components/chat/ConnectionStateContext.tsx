"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useChatContext } from "stream-chat-react";

type ConnectionStateContextValue = { isOnline: boolean };

const ConnectionStateContext = createContext<ConnectionStateContextValue | null>(null);

export function useConnectionState(): ConnectionStateContextValue {
  const ctx = useContext(ConnectionStateContext);
  return ctx ?? { isOnline: true };
}

export function ConnectionStateProvider({ children }: { children: ReactNode }) {
  const { client } = useChatContext();
  const [isOnline, setOnline] = useState(true);

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

  const value = useMemo(() => ({ isOnline }), [isOnline]);
  return (
    <ConnectionStateContext.Provider value={value}>
      {children}
    </ConnectionStateContext.Provider>
  );
}
