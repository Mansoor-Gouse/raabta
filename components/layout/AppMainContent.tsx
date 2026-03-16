"use client";

import { usePathname } from "next/navigation";
import { FeedEventsScrollView } from "./FeedEventsScrollView";

/** When on the main feed or events list, render horizontally scrollable Feed | Events. Otherwise render the current page. */
export function AppMainContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const useScrollView =
    pathname === "/app/feed" || pathname === "/app/events";

  if (useScrollView) {
    return <FeedEventsScrollView />;
  }
  return <>{children}</>;
}
