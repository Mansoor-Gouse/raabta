"use client";

import { useState } from "react";
import Link from "next/link";
import { Thread, useChannelStateContext, useComponentContext, Window } from "stream-chat-react";
import { CustomChannelHeader } from "./CustomChannelHeader";
import { ChannelMessageLayout } from "./ChannelMessageLayout";
import { ChannelMessageSearch } from "./ChannelMessageSearch";
import { ChannelOptionsMenu } from "./ChannelOptionsMenu";
import { ConnectionBanner } from "./ConnectionBanner";
import { GroupMembersOpenProvider, useGroupMembersOpen } from "./GroupMembersOpenContext";
import { GroupMembersSheet } from "./GroupMembersSheet";

/**
 * Renders channel main panel and thread panel. When a thread is open:
 * - Mobile: main panel hidden, thread full width with back button.
 * - Desktop: main and thread side by side.
 */
function ChannelWithThreadLayoutInner() {
  const { thread } = useChannelStateContext();
  const { HeaderComponent } = useComponentContext();
  const groupMembersOpen = useGroupMembersOpen();
  const [searchOpen, setSearchOpen] = useState(false);
  const ChannelHeaderToRender = HeaderComponent ?? CustomChannelHeader;

  return (
    <div className="flex flex-1 min-h-0 min-w-0">
      {/* Main channel: hide on mobile when thread is open */}
      <div
        className={
          thread
            ? "hidden md:flex flex-1 min-h-0 min-w-0 flex-col"
            : "flex flex-1 min-h-0 min-w-0 flex-col"
        }
      >
        <Window>
          <ConnectionBanner />
          <div className="flex items-center gap-1 sm:gap-2 border-b border-[var(--ig-border)] px-2 py-2 min-h-[48px] shrink-0 bg-[var(--ig-bg-primary)]">
            <Link
              href="/app/chats"
              className="md:hidden p-2 -ml-1 rounded-lg text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)] min-w-[40px] min-h-[40px] flex items-center justify-center shrink-0"
              aria-label="Back to chats"
            >
              <BackIcon />
            </Link>
            <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
              <ChannelHeaderToRender />
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  className="p-2 rounded-lg text-[var(--ig-text-secondary)] hover:bg-[var(--ig-border-light)]"
                  aria-label="Search in conversation"
                >
                  <SearchIcon />
                </button>
                <ChannelOptionsMenu />
              </div>
            </div>
          </div>
          {searchOpen && (
            <ChannelMessageSearch
              open={searchOpen}
              onClose={() => setSearchOpen(false)}
            />
          )}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <ChannelMessageLayout />
          </div>
        </Window>
      </div>

      {/* Thread panel: visible when thread is set */}
      {thread && (
        <div className="flex flex-1 md:max-w-md min-w-0 flex-col border-l border-[var(--ig-border)] bg-[var(--ig-bg-primary)]">
          <Thread
            fullWidth
            messageActions={["delete", "edit", "flag", "mute", "pin", "quote", "react", "reply"]}
          />
        </div>
      )}
      {groupMembersOpen && (
        <GroupMembersSheet
          open={groupMembersOpen.open}
          onClose={() => groupMembersOpen.setOpen(false)}
        />
      )}
    </div>
  );
}

export function ChannelWithThreadLayout() {
  return (
    <GroupMembersOpenProvider>
      <ChannelWithThreadLayoutInner />
    </GroupMembersOpenProvider>
  );
}

function BackIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="w-5 h-5"
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
  );
}
