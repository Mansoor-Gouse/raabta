"use client";

import { usePathname } from "next/navigation";
import { FeedEventsScrollView } from "./FeedEventsScrollView";

/** When on a main tab (feed, events, chats, members, profile), render horizontally scrollable strip across them. Otherwise render the current page. */
export function AppMainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const useScrollView =
    pathname === "/app/feed" ||
    pathname === "/app/events" ||
    pathname === "/app/chats" ||
    pathname === "/app/members" ||
    pathname === "/app/profile";

  if (useScrollView) {
    return <FeedEventsScrollView />;
  }
  return <>{children}</>;
}
