"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useChatContext } from "stream-chat-react";
import { ChannelList, type ChannelListRef } from "@/components/chat/ChannelList";
import { useAppUser } from "@/components/layout/AppShell";

export default function ChatsPage() {
  const listRef = useRef<ChannelListRef>(null);
  const user = useAppUser();
  const { client } = useChatContext();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"messages" | "requests">("messages");

  const streamUser = client?.user;
  const displayName =
    (streamUser as { name?: string })?.name ||
    (streamUser as { id?: string })?.id ||
    user.name ||
    user.id ||
    "You";
  const nameReady = !!(streamUser || user.name || user.id);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[var(--ig-bg-primary)]">
      {/* Header: username + chevron (center), compose (right) - like reference */}
      <header
        className="shrink-0 flex items-center justify-between h-14 min-h-[56px] px-4 border-b border-[var(--ig-border-light)]"
        style={{ paddingTop: "var(--safe-area-inset-top)" }}
      >
        <div className="flex-1 min-w-0 flex items-center justify-start pl-1">
          <button
            type="button"
            className="flex items-center gap-1 text-[var(--ig-text)] font-semibold text-lg tracking-tight min-h-[40px] items-center justify-center"
            aria-label="Profile menu"
          >
            {nameReady ? (
              <span className="truncate max-w-[180px]">{displayName}</span>
            ) : (
              <span
                className="h-5 w-24 max-w-[180px] rounded bg-[var(--ig-border-light)] animate-pulse"
                aria-hidden
              />
            )}
            <svg
              className="w-5 h-5 shrink-0 text-[var(--ig-text-secondary)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-1 shrink-0">
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
