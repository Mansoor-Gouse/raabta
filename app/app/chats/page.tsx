"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useChatContext } from "stream-chat-react";
import { useAppUser } from "@/components/layout/AppShell";
import { ChannelList, type ChannelListRef } from "@/components/chat/ChannelList";
import {
  PushPromptBanner,
  isPushSupported,
  getPushPermission,
  wasPushPromptDismissed,
} from "@/components/PushRegistration";

export default function ChatsPage() {
  const listRef = useRef<ChannelListRef>(null);
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);
  const user = useAppUser();
  const { client } = useChatContext();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"messages" | "requests">("messages");
  const [showArchived, setShowArchived] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPushBanner, setShowPushBanner] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPushSupported() && getPushPermission() === "default" && !wasPushPromptDismissed()) {
      setShowPushBanner(true);
    }
  }, []);

  const streamUser = client?.user;
  const displayName =
    (streamUser as { name?: string })?.name ||
    (streamUser as { id?: string })?.id ||
    user.name ||
    user.id ||
    "You";

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  useEffect(() => {
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = pathname ?? null;
    const wasOnChannel = prev?.startsWith("/app/channel/");
    const isNowOnChats = pathname === "/app/chats";
    if (wasOnChannel && isNowOnChats && activeTab === "messages") {
      listRef.current?.refresh();
    }
  }, [pathname, activeTab]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--ig-bg-primary)]">
      {/* Header: user name on left; three-dots menu (Archived/Back to chats), New group, New message on right */}
      <header
        className="shrink-0 flex items-center justify-between h-14 min-h-[56px] px-4 border-b border-[var(--ig-border-light)]"
        style={{ paddingTop: "var(--safe-area-inset-top)" }}
      >
        <div className="flex-1 min-w-0 flex items-center justify-start pl-1">
          <span className="text-[var(--ig-text)] font-semibold text-lg tracking-tight truncate">
            {displayName}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {activeTab === "messages" && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="p-2 rounded-full text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]"
                aria-label="Chat options"
                aria-expanded={menuOpen}
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 py-1 rounded-lg shadow-lg bg-[var(--ig-bg-primary)] border border-[var(--ig-border)] min-w-[160px] z-20">
                  {showArchived ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowArchived(false);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
                    >
                      Back to chats
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowArchived(true);
                        setMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
                    >
                      Archived
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <Link
            href="/app/new/group"
            className="p-2 rounded-full text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
            aria-label="New group"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </Link>
          <Link
            href="/app/new"
            className="p-2 -mr-2 rounded-full text-[var(--ig-text)] hover:bg-[var(--ig-border-light)]"
            aria-label="New message"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
          </Link>
        </div>
      </header>

      {/* Push notifications prompt (dismissible) */}
      {showPushBanner && (
        <PushPromptBanner onDismiss={() => setShowPushBanner(false)} />
      )}

      {/* Search bar - prominent, rounded, like "Search or ask Meta AI" */}
      <div className="shrink-0 px-4 py-3 border-b border-[var(--ig-border-light)]">
        <div className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl bg-[var(--ig-border-light)] text-[var(--ig-text-secondary)]">
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="search"
            placeholder="Search or ask..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-[var(--ig-text)] text-sm placeholder-[var(--ig-text-secondary)] border-0 focus:outline-none focus:ring-0"
            aria-label="Search chats"
          />
        </div>
      </div>

      {/* Messages | Requests tabs */}
      <div className="shrink-0 flex border-b border-[var(--ig-border-light)]">
        <button
          type="button"
          onClick={() => setActiveTab("messages")}
          className={`flex-1 py-3 px-4 text-sm font-semibold flex items-center justify-center gap-1.5 ${
            activeTab === "messages"
              ? "text-[var(--ig-text)] border-b-2 border-[var(--ig-text)]"
              : "text-[var(--ig-link)] border-b-2 border-transparent"
          }`}
        >
          Messages
          <svg className="w-4 h-4 text-[var(--ig-text-secondary)]" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("requests")}
          className={`flex-1 py-3 px-4 text-sm font-medium ${
            activeTab === "requests"
              ? "text-[var(--ig-text)] border-b-2 border-[var(--ig-text)]"
              : "text-[var(--ig-link)] border-b-2 border-transparent"
          }`}
        >
          Requests
        </button>
      </div>

      {/* Channel list - show messages tab content; requests could show empty or future list */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {activeTab === "messages" ? (
          <ChannelList
            ref={listRef}
            hideSearchBar
            searchValue={search}
            onSearchChange={setSearch}
            showArchived={showArchived}
            onShowArchivedChange={setShowArchived}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--ig-border-light)] flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-[var(--ig-text-secondary)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                />
              </svg>
            </div>
            <p className="text-base font-semibold text-[var(--ig-text)] mb-1">No message requests</p>
            <p className="text-sm text-[var(--ig-text-secondary)]">
              When someone who isn&apos;t in your network messages you, it&apos;ll show up here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
