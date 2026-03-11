"use client";

import { createContext, useContext, type ReactNode } from "react";

export type EventChannelInfo = { title: string; coverImage?: string } | null;

const EventChannelInfoContext = createContext<EventChannelInfo>(null);

export function EventChannelInfoProvider({
  value,
  children,
}: {
  value: EventChannelInfo;
  children: ReactNode;
}) {
  return (
    <EventChannelInfoContext.Provider value={value}>
      {children}
    </EventChannelInfoContext.Provider>
  );
}

export function useEventChannelInfo(): EventChannelInfo {
  return useContext(EventChannelInfoContext);
}
