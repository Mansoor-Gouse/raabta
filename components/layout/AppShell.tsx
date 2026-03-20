"use client";

import { useState, useCallback, createContext, useContext, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChannelList } from "@/components/chat/ChannelList";
import {
  IconHome,
  IconEvents,
  IconMessage,
  IconProfile,
  IconMembers,
} from "@/components/layout/InstagramIcons";
import { UnreadMessagesBadge } from "@/components/chat/UnreadMessagesBadge";
import { VideoMuteProvider } from "@/components/layout/VideoMuteContext";

export type AppUser = { id: string; name?: string; image?: string | null };
const AppUserContext = createContext<AppUser | null>(null);
export function useAppUser() {
  return useContext(AppUserContext) ?? { id: "", name: "", image: null };
}

const mainNav = [
  { href: "/app/feed", label: "Home", icon: "home" },
  { href: "/app/events", label: "Explore", icon: "explore" },
  { href: "/app/chats", label: "Chats", icon: "chat" },
  { href: "/app/members", label: "Members", icon: "members" },
  { href: "/app/profile", label: "Profile", icon: "profile" },
];

const moreNav = [
  { href: "/app/notifications", label: "Notifications" },
  { href: "/app/groups", label: "Groups" },
  { href: "/app/status", label: "Status" },
  { href: "/app/settings", label: "Settings" },
  { href: "/app/admin", label: "Moderation" },
];

function isChatsActive(pathname: string) {
  return pathname === "/app/chats" || pathname.startsWith("/app/channel/") || pathname === "/app/new" || pathname === "/app/search";
}

function getActiveNav(pathname: string) {
  if (pathname === "/app/feed" || pathname.startsWith("/app/feed/")) return "/app/feed";
          if (pathname === "/app/events" || pathname.startsWith("/app/events/")) return "/app/events";
  if (isChatsActive(pathname)) return "/app/chats";
  if (pathname === "/app/profile" || pathname.startsWith("/app/profile/")) return "/app/profile";
  if (pathname === "/app/members" || pathname.startsWith("/app/members/")) return "/app/members";
  if (pathname === "/app/groups") return "/app/groups";
  if (pathname === "/app/status") return "/app/status";
  if (pathname === "/app/settings") return "/app/settings";
  if (pathname === "/app/notifications") return "/app/notifications";
  if (pathname === "/app/admin") return "/app/admin";
  return null;
}

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { id: string; name?: string; image?: string | null };
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const activeNav = getActiveNav(pathname);
  const isChannelScreen = pathname.startsWith("/app/channel/");
  const isEventsScreen = pathname === "/app/events" || pathname.startsWith("/app/events/");
  const isStatusFlow = pathname === "/app/status" || pathname.startsWith("/app/status/");
  const isNewPostFlow = pathname === "/app/feed/new" || pathname.startsWith("/app/feed/new/");
  const isChatsPage = pathname === "/app/chats";
  const [feedChromeHidden, setFeedChromeHidden] = useState(false);

  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me/block")
      .then((r) => r.json())
      .then((data: { blockedIds?: string[] }) => {
        if (cancelled) return;
        setBlockedIds(data.blockedIds ?? []);
      })
      .catch(() => {})
      .finally(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      const hidden = !!ce.detail?.hidden;
      setFeedChromeHidden(hidden);
    };
    window.addEventListener("rope:feedChromeHidden", handler as EventListener);
    return () => window.removeEventListener("rope:feedChromeHidden", handler as EventListener);
  }, []);

  useEffect(() => {
    if (!pathname.startsWith("/app/feed")) setFeedChromeHidden(false);
  }, [pathname]);

  useEffect(() => {
    function onBlockedUpdated(e: Event) {
      const detail = (e as CustomEvent<{ blockedUserId?: string; unblockedUserId?: string }>).detail;
      const blockedUserId = detail?.blockedUserId;
      const unblockedUserId = detail?.unblockedUserId;

      if (blockedUserId) {
        setBlockedIds((prev) => (prev.includes(blockedUserId) ? prev : [...prev, blockedUserId]));
        return;
      }

      if (unblockedUserId) {
        setBlockedIds((prev) => prev.filter((id) => id !== unblockedUserId));
      }
    }

    window.addEventListener("blocked-users-updated", onBlockedUpdated);
    return () => window.removeEventListener("blocked-users-updated", onBlockedUpdated);
  }, []);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  return (
    <div className="flex h-dvh max-h-dvh bg-[var(--ig-bg)] overflow-hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={closeSidebar}
        className={`fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 w-[85vw] max-w-[320px] md:w-64 flex flex-col bg-[var(--ig-bg-primary)] border-r border-[var(--ig-border)] transform transition-transform duration-200 ease-out md:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
        style={{ paddingTop: "var(--safe-area-inset-top)", paddingBottom: "var(--safe-area-inset-bottom)" }}
      >
        <div className="p-3 sm:p-4 border-b border-[var(--ig-border-light)] shrink-0">
          <h2 className="font-semibold text-base text-[var(--ig-text)]">Network</h2>
          <p className="text-sm text-[var(--ig-text-secondary)] truncate mt-0.5">{user.name || user.id}</p>
        </div>
        <nav className="p-2 space-y-0.5 border-b border-[var(--ig-border-light)] shrink-0">
          {mainNav.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={closeSidebar}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px] flex items-center gap-3 ${
                activeNav === href
                  ? "bg-[var(--ig-border-light)] text-[var(--ig-text)]"
                  : "text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
              }`}
            >
              {label}
              {href === "/app/chats" && (
                <span className="ml-auto">
                  <UnreadMessagesBadge variant="inline" />
                </span>
              )}
            </Link>
          ))}
          <div className="pt-1 mt-1 border-t border-[var(--ig-border-light)]">
            {moreNav.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={closeSidebar}
                className={`block px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px] flex items-center ${
                  activeNav === href ? "bg-[var(--ig-border-light)] text-[var(--ig-text)]" : "text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChannelList blockedUserIds={blockedIds} />
        </div>
        <div className="p-2 shrink-0 border-t border-[var(--ig-border-light)]">
          <button
            type="button"
            onClick={async () => {
              await fetch("/api/auth/session", { method: "DELETE" });
              window.location.href = "/login";
            }}
            className="w-full px-3 py-2.5 rounded-lg text-sm text-left text-[var(--ig-error)] hover:opacity-80 min-h-[44px] flex items-center"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 relative h-dvh">
        <main className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
          <VideoMuteProvider>
            <AppUserContext.Provider value={user}>{children}</AppUserContext.Provider>
          </VideoMuteProvider>
        </main>

        {/* Bottom navigation: hidden on channel/status/new-post flow; also hide while scrolling down in feed */}
        {!isChannelScreen && !isStatusFlow && !isNewPostFlow && !(pathname.startsWith("/app/feed") && feedChromeHidden) && (
        <nav
          className="md:hidden shrink-0 flex items-center justify-around h-[50px] border-t border-[var(--ig-border-light)] bg-[var(--ig-bg-primary)]"
          style={{ paddingBottom: "var(--safe-area-inset-bottom)" }}
          aria-label="Main navigation"
        >
          <Link
            href="/app/feed"
            className="flex flex-col items-center justify-center flex-1 py-2 text-[var(--ig-text)] min-w-0"
            aria-current={activeNav === "/app/feed" ? "page" : undefined}
          >
            <IconHome className="w-6 h-6" filled={activeNav === "/app/feed"} />
          </Link>
          <Link
            href="/app/events"
            className="flex flex-col items-center justify-center flex-1 py-2 text-[var(--ig-text)] min-w-0"
            aria-current={activeNav === "/app/events" ? "page" : undefined}
          >
            <IconEvents className="w-6 h-6" filled={activeNav === "/app/events"} />
          </Link>
          <Link
            href="/app/chats"
            className="flex flex-col items-center justify-center flex-1 py-2 text-[var(--ig-text)] min-w-0 relative"
            aria-current={isChatsActive(pathname) ? "page" : undefined}
          >
            <span className="relative inline-block">
              <IconMessage className="w-6 h-6" filled={isChatsActive(pathname)} />
              <UnreadMessagesBadge />
            </span>
          </Link>
          <Link
            href="/app/members"
            className="flex flex-col items-center justify-center flex-1 py-2 text-[var(--ig-text)] min-w-0"
            aria-current={activeNav === "/app/members" ? "page" : undefined}
          >
            <IconMembers className="w-6 h-6" filled={activeNav === "/app/members"} />
          </Link>
          <Link
            href="/app/profile"
            className="flex flex-col items-center justify-center flex-1 py-2 min-w-0"
            aria-current={activeNav === "/app/profile" ? "page" : undefined}
          >
            {user.image ? (
              <div className={`w-6 h-6 rounded-full overflow-hidden border-2 ${activeNav === "/app/profile" ? "border-[var(--ig-text)]" : "border-transparent"}`}>
                <img src={user.image} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <IconProfile className="w-6 h-6" filled={activeNav === "/app/profile"} />
            )}
          </Link>
        </nav>
        )}
      </div>
    </div>
  );
}
